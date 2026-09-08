-- Delivery quotes and QuickShipper shipment ids on orders.
--
-- shipping_quote is the courier the shopper picked (or a fallback flag). Flitt
-- charges from this snapshot; the payments function re-checks the live fee
-- before minting a token. qs_* columns are filled only after a paid callback
-- successfully creates a QuickShipper job.

alter table public.orders
  add column if not exists shipping_quote    jsonb,
  add column if not exists qs_order_id       bigint,
  add column if not exists qs_order_no       text,
  add column if not exists qs_status         text,
  add column if not exists qs_tracking_url   text,
  add column if not exists qs_dispatched_at  timestamptz,
  add column if not exists qs_webhook_at     timestamptz;

create unique index if not exists orders_qs_order_id_uidx
  on public.orders (qs_order_id)
  where qs_order_id is not null;

comment on column public.orders.shipping_quote is
  'Courier quote used at checkout: source, provider, fee, coords. Not trusted for payment_status.';

-- Same create_pending_order as 0024, plus shipping_quote from p_order.
-- The caller still cannot set payment_status, status, or qs_*.

create or replace function public.create_pending_order(p_order jsonb, p_items jsonb)
returns table (order_id uuid, public_token uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email        text := lower(trim(coalesce(p_order->>'customerEmail', '')));
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
  v_quote        jsonb;
  v_fee          numeric;
begin
  perform public.retire_stale_pending_orders();

  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'A valid email address is required' using errcode = '22023';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your bag is empty' using errcode = '22023';
  end if;

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

  -- Keep only the fields the storefront is allowed to propose. Fee is clamped
  -- so a forged quote cannot mint a negative Flitt amount; repriceOrder still
  -- overwrites shipping from this snapshot or a live re-quote before charge.
  if p_order ? 'shippingQuote' and jsonb_typeof(p_order->'shippingQuote') = 'object' then
    v_fee := greatest(0, coalesce(nullif(p_order->'shippingQuote'->>'fee', '')::numeric, 0));
    v_quote := jsonb_strip_nulls(jsonb_build_object(
      'source',            left(coalesce(p_order->'shippingQuote'->>'source', 'fallback'), 32),
      'providerId',        case when (p_order->'shippingQuote'->>'providerId') ~ '^[0-9]+$'
                           then (p_order->'shippingQuote'->>'providerId')::bigint end,
      'providerName',      left(coalesce(p_order->'shippingQuote'->>'providerName', ''), 120),
      'logoUrl',           left(coalesce(p_order->'shippingQuote'->>'logoUrl', ''), 500),
      'fee',               v_fee,
      'etaMinutes',        case when (p_order->'shippingQuote'->>'etaMinutes') ~ '^[0-9]+$'
                           then (p_order->'shippingQuote'->>'etaMinutes')::integer end,
      'parcelDimensionId', case when (p_order->'shippingQuote'->>'parcelDimensionId') ~ '^[0-9]+$'
                           then (p_order->'shippingQuote'->>'parcelDimensionId')::bigint end,
      'fromLat',           nullif(p_order->'shippingQuote'->>'fromLat', '')::double precision,
      'fromLng',           nullif(p_order->'shippingQuote'->>'fromLng', '')::double precision,
      'toLat',             nullif(p_order->'shippingQuote'->>'toLat', '')::double precision,
      'toLng',             nullif(p_order->'shippingQuote'->>'toLng', '')::double precision,
      'quotedAt',          left(coalesce(p_order->'shippingQuote'->>'quotedAt', ''), 40)
    ));
  end if;

  insert into public.orders (
    id, order_number, customer_email, customer_name, shipping_address,
    payment_status, status, subtotal, shipping, tax, total,
    public_token, flitt_order_id, client_ip, shipping_quote
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
    v_ip,
    v_quote
  );

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item->>'quantity')::integer, 0);
    if v_qty <= 0 then
      raise exception 'Line quantity must be at least 1' using errcode = '22023';
    end if;

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
