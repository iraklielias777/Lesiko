-- Row level security.
--
-- The browser only ever holds the publishable key, so every table is locked
-- down here: catalogue data is world-readable, everything that mutates it is
-- gated on the caller having an admin profile.

-- security definer so the profiles lookup does not re-enter profiles' own policies
create or replace function public.is_admin()
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

alter table public.brands       enable row level security;
alter table public.categories   enable row level security;
alter table public.products     enable row level security;
alter table public.profiles     enable row level security;
alter table public.addresses    enable row level security;
alter table public.orders       enable row level security;
alter table public.order_items  enable row level security;
alter table public.site_content enable row level security;

-- ------------------------------------------------ public catalogue: read all

create policy "brands are publicly readable"
  on public.brands for select using (true);

create policy "categories are publicly readable"
  on public.categories for select using (true);

create policy "products are publicly readable"
  on public.products for select using (true);

create policy "site content is publicly readable"
  on public.site_content for select using (true);

-- ------------------------------------------------ public catalogue: admin write

create policy "admins manage brands"
  on public.brands for all
  using (public.is_admin()) with check (public.is_admin());

create policy "admins manage categories"
  on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

create policy "admins manage products"
  on public.products for all
  using (public.is_admin()) with check (public.is_admin());

create policy "admins manage site content"
  on public.site_content for all
  using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------- profiles

create policy "users read own profile"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "users update own profile"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy "users insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

-- A self-serve update must not be able to grant itself the admin role.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------------------------------------------------------------- addresses

create policy "users manage own addresses"
  on public.addresses for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ------------------------------------------------------------------- orders

-- Guest checkout runs on the anon key, so order creation is open; reading an
-- order back requires being the signed-in owner of that email, or an admin.
create policy "anyone can place an order"
  on public.orders for insert with check (true);

create policy "customers read own orders"
  on public.orders for select
  using (
    public.is_admin()
    or lower(customer_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "admins update orders"
  on public.orders for update
  using (public.is_admin()) with check (public.is_admin());

create policy "admins delete orders"
  on public.orders for delete using (public.is_admin());

create policy "anyone can add items to an order"
  on public.order_items for insert with check (true);

create policy "customers read own order items"
  on public.order_items for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and lower(o.customer_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

create policy "admins manage order items"
  on public.order_items for all
  using (public.is_admin()) with check (public.is_admin());
