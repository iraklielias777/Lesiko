-- Same function as 0019 with one addition: every checkout first retires
-- pending orders older than Flitt's order lifetime (0023), so abandoned
-- checkouts never pile up as "Processing" without a scheduler.
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
begin
  perform public.retire_stale_pending_orders();

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
