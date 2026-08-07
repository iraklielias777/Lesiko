-- `is_admin()` only exists for RLS, but living in `public` also published it as
-- POST /rest/v1/rpc/is_admin, which the database linter flags as a SECURITY
-- DEFINER function reachable by anon and authenticated. PostgREST only serves
-- the schemas it is configured with (`public`, `graphql_public`), so moving the
-- function into `private` takes it off the API while policies can still call it.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function private.is_admin() from public;
grant  execute on function private.is_admin() to anon, authenticated;

-- ------------------------------------------------- repoint the role guard

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not private.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

revoke execute on function public.protect_profile_role() from public, anon, authenticated;

-- ---------------------------------------------------- repoint the policies

-- profiles
drop policy "users read own profile"   on public.profiles;
drop policy "users update own profile" on public.profiles;

create policy "users read own profile"
  on public.profiles for select
  using (id = (select auth.uid()) or (select private.is_admin()));

create policy "users update own profile"
  on public.profiles for update
  using      (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));

-- brands
drop policy "admins insert brands" on public.brands;
drop policy "admins update brands" on public.brands;
drop policy "admins delete brands" on public.brands;

create policy "admins insert brands"
  on public.brands for insert with check ((select private.is_admin()));
create policy "admins update brands"
  on public.brands for update using ((select private.is_admin()))
                          with check ((select private.is_admin()));
create policy "admins delete brands"
  on public.brands for delete using ((select private.is_admin()));

-- categories
drop policy "admins insert categories" on public.categories;
drop policy "admins update categories" on public.categories;
drop policy "admins delete categories" on public.categories;

create policy "admins insert categories"
  on public.categories for insert with check ((select private.is_admin()));
create policy "admins update categories"
  on public.categories for update using ((select private.is_admin()))
                              with check ((select private.is_admin()));
create policy "admins delete categories"
  on public.categories for delete using ((select private.is_admin()));

-- products
drop policy "admins insert products" on public.products;
drop policy "admins update products" on public.products;
drop policy "admins delete products" on public.products;

create policy "admins insert products"
  on public.products for insert with check ((select private.is_admin()));
create policy "admins update products"
  on public.products for update using ((select private.is_admin()))
                            with check ((select private.is_admin()));
create policy "admins delete products"
  on public.products for delete using ((select private.is_admin()));

-- site_content
drop policy "admins insert site content" on public.site_content;
drop policy "admins update site content" on public.site_content;
drop policy "admins delete site content" on public.site_content;

create policy "admins insert site content"
  on public.site_content for insert with check ((select private.is_admin()));
create policy "admins update site content"
  on public.site_content for update using ((select private.is_admin()))
                                with check ((select private.is_admin()));
create policy "admins delete site content"
  on public.site_content for delete using ((select private.is_admin()));

-- orders
drop policy "customers read own orders" on public.orders;
drop policy "admins update orders"      on public.orders;
drop policy "admins delete orders"      on public.orders;

create policy "customers read own orders"
  on public.orders for select
  using (
    (select private.is_admin())
    or lower(customer_email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  );
create policy "admins update orders"
  on public.orders for update using ((select private.is_admin()))
                          with check ((select private.is_admin()));
create policy "admins delete orders"
  on public.orders for delete using ((select private.is_admin()));

-- order_items
drop policy "customers read own order items" on public.order_items;
drop policy "admins update order items"      on public.order_items;
drop policy "admins delete order items"      on public.order_items;

create policy "customers read own order items"
  on public.order_items for select
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and lower(o.customer_email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
    )
  );
create policy "admins update order items"
  on public.order_items for update using ((select private.is_admin()))
                               with check ((select private.is_admin()));
create policy "admins delete order items"
  on public.order_items for delete using ((select private.is_admin()));

drop function public.is_admin();
