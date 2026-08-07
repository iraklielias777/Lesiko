-- Advisory follow-ups from get_advisors(performance).
--
-- Two classes of fix:
--   * auth.uid() / auth.jwt() / is_admin() are wrapped in a scalar subquery so
--     the planner evaluates them once per statement instead of once per row.
--   * the `for all` admin policies were adding a second permissive SELECT
--     policy on top of the public read policy, so every catalogue read paid for
--     an is_admin() check it could never need. They are split into the write
--     actions only; admins read through the public policy like everyone else.

create index order_items_product_id_idx on public.order_items (product_id);

-- ----------------------------------------------- catalogue: admin writes only

drop policy "admins manage brands"       on public.brands;
drop policy "admins manage categories"   on public.categories;
drop policy "admins manage products"     on public.products;
drop policy "admins manage site content" on public.site_content;

create policy "admins insert brands" on public.brands
  for insert with check ((select public.is_admin()));
create policy "admins update brands" on public.brands
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete brands" on public.brands
  for delete using ((select public.is_admin()));

create policy "admins insert categories" on public.categories
  for insert with check ((select public.is_admin()));
create policy "admins update categories" on public.categories
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete categories" on public.categories
  for delete using ((select public.is_admin()));

create policy "admins insert products" on public.products
  for insert with check ((select public.is_admin()));
create policy "admins update products" on public.products
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete products" on public.products
  for delete using ((select public.is_admin()));

create policy "admins insert site content" on public.site_content
  for insert with check ((select public.is_admin()));
create policy "admins update site content" on public.site_content
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete site content" on public.site_content
  for delete using ((select public.is_admin()));

-- ----------------------------------------------------------------- profiles

drop policy "users read own profile"   on public.profiles;
drop policy "users update own profile" on public.profiles;
drop policy "users insert own profile" on public.profiles;

create policy "users read own profile" on public.profiles
  for select using (id = (select auth.uid()) or (select public.is_admin()));

create policy "users update own profile" on public.profiles
  for update
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

create policy "users insert own profile" on public.profiles
  for insert with check (id = (select auth.uid()));

-- ---------------------------------------------------------------- addresses

drop policy "users manage own addresses" on public.addresses;

create policy "users manage own addresses" on public.addresses
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ------------------------------------------------------------------- orders

drop policy "customers read own orders" on public.orders;
drop policy "admins update orders"      on public.orders;
drop policy "admins delete orders"      on public.orders;

create policy "customers read own orders" on public.orders
  for select using (
    (select public.is_admin())
    or lower(customer_email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  );

create policy "admins update orders" on public.orders
  for update using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admins delete orders" on public.orders
  for delete using ((select public.is_admin()));

-- order_items inserts are already open for guest checkout and admins read
-- through the customer policy, so only update and delete need admin gating.
drop policy "admins manage order items"      on public.order_items;
drop policy "customers read own order items" on public.order_items;

create policy "customers read own order items" on public.order_items
  for select using (
    (select public.is_admin())
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and lower(o.customer_email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
    )
  );

create policy "admins update order items" on public.order_items
  for update using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admins delete order items" on public.order_items
  for delete using ((select public.is_admin()));
