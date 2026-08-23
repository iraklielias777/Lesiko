-- Move catalogue filtering off the client.
--
-- Until now the storefront fetched every product with `select=*` plus both
-- joins — 468 KB gzipped for 240 rows — and did all filtering, faceting,
-- sorting and pagination in the browser. That runs on the homepage, on every
-- listing page, when the search overlay opens, and on every debounced
-- keystroke. It is already the largest thing the site downloads, and it grows
-- linearly with the catalogue.
--
-- This adds the two things Postgres needs to answer those queries directly:
-- a filterable sale flag, and indexes for the access patterns the new
-- ProductService uses.

-- --------------------------------------------------------------- sale flag
-- PostgREST cannot compare two columns in a filter, so `compare_at_price >
-- price` had to be evaluated client-side, which forced the whole catalogue
-- down the wire just to render /sale. A stored generated column makes it a
-- plain boolean predicate.
--
-- It also encodes the rule properly: a compare-at price at or below the
-- selling price is not a discount. Rows where the two were entered the wrong
-- way round stop being advertised as sale items and start being visible as the
-- data-entry mistakes they are.
alter table public.products
  add column if not exists is_on_sale boolean
  generated always as (
    compare_at_price is not null and compare_at_price > price
  ) stored;

comment on column public.products.is_on_sale is
  'Generated: true only when compare_at_price is genuinely above price. Drives /sale and the On sale filter.';

create index if not exists products_is_on_sale_idx
  on public.products (is_on_sale) where is_on_sale;

-- ----------------------------------------------------------------- ordering
-- "Relevance" and "Newest" both order by recency, and every listing query is
-- ordered, so this index backs the default path.
create index if not exists products_created_at_idx
  on public.products (created_at desc);

create index if not exists products_price_idx
  on public.products (price);

-- Stock filtering ("In stock only") on the common case.
create index if not exists products_in_stock_idx
  on public.products (inventory_quantity) where inventory_quantity > 0;

-- ------------------------------------------------------------- text search
-- Search is ILIKE '%term%' across four columns — English and Georgian name and
-- description. A leading wildcard cannot use a btree index, so trigram GIN is
-- what makes it more than a sequential scan as the catalogue grows.
create extension if not exists pg_trgm;

create index if not exists products_name_trgm_idx
  on public.products using gin (name gin_trgm_ops);

create index if not exists products_name_ka_trgm_idx
  on public.products using gin (name_ka gin_trgm_ops);

create index if not exists products_description_trgm_idx
  on public.products using gin (description gin_trgm_ops);

-- Sub-category is filtered on its own, not only alongside category.
create index if not exists products_sub_category_idx
  on public.products (sub_category);
