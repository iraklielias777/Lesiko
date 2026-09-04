-- Gate 1: money-safe order creation and an operations log.
--
-- 1. Order creation becomes one transaction. The storefront used to insert the
--    orders row and then the order_items rows in two separate requests, so a
--    dropped connection or a double-mounted checkout left an order with no
--    lines. Two such rows reached production. create_pending_order() inserts
--    both or neither, throttles abuse, and returns the ids a guest needs to
--    poll for payment — which also retires the client-generated id/token.
--
-- 2. The direct insert policies are removed in migration 0021, once the
--    storefront that calls the RPC is deployed — dropping them first would
--    break guest checkout on the build that is live right now.
--
-- 3. ops_alerts is where the payments function records anything an operator
--    must see — a callback with a bad signature, a stock decrement that failed,
--    and, until transactional email exists, every paid order. The admin
--    dashboard surfaces the unacknowledged ones.

-- ------------------------------------------------------------- ops_alerts

create table if not exists public.ops_alerts (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  kind            text not null,
  severity        text not null default 'warning'
                  check (severity in ('info', 'warning', 'critical')),
  message         text not null,
  context         jsonb not null default '{}'::jsonb,
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id) on delete set null
);

comment on table public.ops_alerts is
  'Operator-facing events written by edge functions with the service role. No insert policy on purpose: the browser cannot create alerts.';

create index if not exists ops_alerts_open_idx
  on public.ops_alerts (created_at desc) where acknowledged_at is null;

alter table public.ops_alerts enable row level security;

create policy "admins read alerts"
  on public.ops_alerts for select
  using ((select private.is_admin()));

create policy "admins acknowledge alerts"
  on public.ops_alerts for update
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ------------------------------------------------------- throttle support

-- PostgREST exposes the caller's forwarded address; keeping it lets the
-- throttle work for guests who have no account to key on.
alter table public.orders add column if not exists client_ip text;

create index if not exists orders_client_ip_recent_idx
  on public.orders (client_ip, created_at desc);

-- ------------------------------------------------------------------- RPC

-- security definer so the throttle can count rows the caller is not allowed
-- to read. The function owner (the migration role) owns the tables and so
-- bypasses their RLS; every invariant the dropped policies enforced is
-- re-stated here explicitly: only pending, only Processing, totals clamped,
-- payment fields never taken from the caller.
create or replace function public.create_pending_order(p_order jsonb, p_items jsonb)
returns table (order_id uuid, public_token uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email        text := lower(trim(coalesce(p_order->>'customerEmail', '')));
  -- The GUC is absent outside PostgREST and can be an empty string, which
  -- would not cast to jsonb; nullif keeps a psql call from blowing up.
  v_forwarded    text := coalesce(nullif(current_setting('request.headers', true), '')::jsonb->>'x-forwarded-for', '');
  v_ip           text := nullif(trim(split_part(v_forwarded, ',', 1)), '');
  v_order_id     uuid := gen_random_uuid();
  v_token        uuid := gen_random_uuid();
  v_order_number text := coalesce(
                    nullif(trim(p_order->>'orderNumber'), ''),
                    'LK' || right((floor(extract(epoch from clock_timestamp()) * 1000))::bigint::text, 8)
                  );
  v_item         jsonb;
  v_qty          integer;
  v_count        integer;
begin
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'A valid email address is required' using errcode = '22023';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your bag is empty' using errcode = '22023';
  end if;

  -- Per email, per address, and overall. Generous for a human, useless to a script.
  select count(*) into v_count from public.orders
   where lower(customer_email) = v_email and created_at > now() - interval '10 minutes';
  if v_count >= 5 then
    raise exception 'Too many checkout attempts for this email. Please wait a few minutes and try again.' using errcode = 'P0001';
  end if;

  if v_ip is not null then
    select count(*) into v_count from public.orders
     where client_ip = v_ip and created_at > now() - interval '10 minutes';
    if v_count >= 12 then
      raise exception 'Too many checkout attempts. Please wait a few minutes and try again.' using errcode = 'P0001';
    end if;
  end if;

  select count(*) into v_count from public.orders where created_at > now() - interval '1 minute';
  if v_count >= 60 then
    raise exception 'Checkout is busy right now. Please try again in a moment.' using errcode = 'P0001';
  end if;

  insert into public.orders (
    id, order_number, customer_email, customer_name, shipping_address,
    payment_status, status, subtotal, shipping, tax, total,
    public_token, flitt_order_id, client_ip
  ) values (
    v_order_id,
    v_order_number,
    v_email,
    nullif(trim(coalesce(p_order->>'customerName', '')), ''),
    coalesce(p_order->'shippingAddress', '{}'::jsonb),
    'pending',
    'Processing',
    greatest(0, coalesce((p_order->>'subtotal')::numeric, 0)),
    greatest(0, coalesce((p_order->>'shipping')::numeric, 0)),
    greatest(0, coalesce((p_order->>'tax')::numeric, 0)),
    greatest(0, coalesce((p_order->>'total')::numeric, 0)),
    v_token,
    v_order_number,
    v_ip
  );

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item->>'quantity')::integer, 0);
    if v_qty <= 0 then
      raise exception 'Line quantity must be at least 1' using errcode = '22023';
    end if;

    -- product_id is a foreign key: an id that does not exist fails the whole
    -- transaction, which is exactly the point.
    insert into public.order_items (order_id, product_id, product_name, variant_name, quantity, price)
    values (
      v_order_id,
      nullif(v_item->>'productId', '')::uuid,
      coalesce(nullif(trim(coalesce(v_item->>'productName', '')), ''), 'Item'),
      nullif(trim(coalesce(v_item->>'variantName', '')), ''),
      v_qty,
      greatest(0, coalesce((v_item->>'price')::numeric, 0))
    );
  end loop;

  return query select v_order_id, v_token;
end;
$$;

revoke all on function public.create_pending_order(jsonb, jsonb) from public;
grant execute on function public.create_pending_order(jsonb, jsonb) to anon, authenticated;

-- ---------------------------------------------------- retire ghost orders

-- Pending orders with no lines cannot be paid or fulfilled; they only exist
-- because the old two-step insert could fail halfway.
delete from public.orders o
 where o.payment_status = 'pending'
   and not exists (select 1 from public.order_items i where i.order_id = o.id);
