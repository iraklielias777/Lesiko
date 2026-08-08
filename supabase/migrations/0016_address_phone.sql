-- Optional phone on saved addresses (also stored in order shipping_address JSON).
alter table public.addresses
  add column if not exists phone text not null default '';
