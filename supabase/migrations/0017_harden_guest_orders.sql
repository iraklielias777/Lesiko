-- Harden guest checkout writes: pending-only inserts, item attach only to
-- pending parents, public_token for confirmation polling, profile role guard.

-- ---------------------------------------------------------------- public_token
alter table public.orders
  add column if not exists public_token uuid not null default gen_random_uuid();

create unique index if not exists orders_public_token_uidx
  on public.orders (public_token);

-- ---------------------------------------------------------------- orders insert
drop policy if exists "anyone can place an order" on public.orders;

create policy "anyone can place a pending order"
  on public.orders for insert
  with check (
    payment_status = 'pending'
    and status in ('Processing', 'Shipped', 'Delivered', 'Cancelled')
  );

-- ---------------------------------------------------------------- order_items insert
drop policy if exists "anyone can add items to an order" on public.order_items;

create policy "anyone can add items to a pending order"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.payment_status = 'pending'
    )
  );

-- ---------------------------------------------------------------- profiles insert
drop policy if exists "users insert own profile" on public.profiles;

create policy "users insert own profile" on public.profiles
  for insert
  with check (
    id = (select auth.uid())
    and coalesce(role, 'customer') = 'customer'
  );
