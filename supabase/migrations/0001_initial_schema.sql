-- LesiKo Cosmetics — core schema
--
-- Category identity is the slug throughout the application layer: the admin
-- product form writes the slug into category.id and mapProduct reads it back
-- out of the joined row, so categories.slug is the primary key and
-- products.category_id references it.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- utilities

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------------- brands

create table public.brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  image       text,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger brands_set_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------- categories

create table public.categories (
  slug       text primary key,
  label      text not null,
  image      text,
  subs       jsonb not null default '[]'::jsonb,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------- products

create table public.products (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  name_ka            text,
  slug               text not null unique,
  description        text not null default '',
  description_ka     text,
  price              numeric(10,2) not null default 0,
  compare_at_price   numeric(10,2),
  inventory_quantity integer not null default 0,
  brand_id           uuid references public.brands(id) on delete set null,
  category_id        text references public.categories(slug) on delete set null,
  sub_category       text,
  images             jsonb not null default '[]'::jsonb,
  variants           jsonb not null default '[]'::jsonb,
  video_playback_id  text,
  is_new             boolean not null default false,
  is_trending        boolean not null default false,
  average_rating     numeric(3,2) not null default 0,
  review_count       integer not null default 0,
  tags               text[] not null default '{}',
  meta_title         text,
  meta_description   text,
  meta_keywords      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index products_category_id_idx on public.products (category_id);
create index products_brand_id_idx    on public.products (brand_id);
create index products_is_trending_idx on public.products (is_trending) where is_trending;
create index products_tags_idx        on public.products using gin (tags);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------- profiles

-- email is denormalised from auth.users because the browser client cannot read
-- the auth schema, and the admin customer list needs to display it.
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null default '',
  first_name text not null default '',
  last_name  text not null default '',
  skin_type  text check (skin_type in ('normal','oily','dry','combination','sensitive')),
  role       text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Registration passes firstName / lastName / skinType through auth metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_skin_type text := nullif(new.raw_user_meta_data->>'skinType', '');
begin
  insert into public.profiles (id, email, first_name, last_name, skin_type)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'firstName', ''),
    coalesce(new.raw_user_meta_data->>'lastName', ''),
    case
      when meta_skin_type in ('normal','oily','dry','combination','sensitive')
        then meta_skin_type
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set email = coalesce(new.email, '')
   where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------- addresses

create table public.addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name  text not null default '',
  email      text not null default '',
  address1   text not null default '',
  address2   text,
  city       text not null default '',
  state      text not null default '',
  zip        text not null default '',
  country    text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index addresses_user_id_idx on public.addresses (user_id);
create unique index addresses_one_default_per_user
  on public.addresses (user_id) where is_default;

create trigger addresses_set_updated_at
  before update on public.addresses
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------- orders

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique,
  customer_email   text not null,
  customer_name    text,
  shipping_address jsonb not null default '{}'::jsonb,
  payment_status   text not null default 'pending' check (payment_status in ('pending','paid','failed')),
  status           text not null default 'Processing' check (status in ('Processing','Shipped','Delivered','Cancelled')),
  subtotal         numeric(10,2) not null default 0,
  shipping         numeric(10,2) not null default 0,
  tax              numeric(10,2) not null default 0,
  total            numeric(10,2) not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index orders_customer_email_idx on public.orders (lower(customer_email));
create index orders_created_at_idx     on public.orders (created_at desc);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,
  product_name text not null,
  variant_name text,
  quantity     integer not null default 1 check (quantity > 0),
  price        numeric(10,2) not null default 0,
  created_at   timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items (order_id);

-- ------------------------------------------------------------- site content

create table public.site_content (
  key        text primary key,
  content    jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger site_content_set_updated_at
  before update on public.site_content
  for each row execute function public.set_updated_at();
