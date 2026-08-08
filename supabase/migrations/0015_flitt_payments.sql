-- Flitt payment references on orders.
--
-- flitt_order_id is the order_id we send to pay.flitt.com (our order_number).
-- flitt_payment_id is Flitt's payment_id returned in the server callback.
-- payment_status stays pending until that callback verifies as approved.

alter table public.orders
  add column if not exists flitt_order_id   text,
  add column if not exists flitt_payment_id text;

create unique index if not exists orders_flitt_order_id_uidx
  on public.orders (flitt_order_id)
  where flitt_order_id is not null;

-- Georgia storefront + Flitt settle in GEL. Leave an existing admin override
-- alone if they already changed currency away from the USD seed default.
update public.site_content
set content = jsonb_set(content, '{currency}', '"GEL"', true)
where key = 'store_settings'
  and coalesce(content->>'currency', 'USD') = 'USD';
