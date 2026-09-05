-- The sale page sorts by biggest discount first. PostgREST can only order by a
-- column, so the percentage is a stored generated column, kept in step with
-- is_on_sale (migration 0018): both derive from compare_at_price > price.
alter table public.products
  add column if not exists discount_percent integer
  generated always as (
    case
      when compare_at_price is not null and compare_at_price > price and compare_at_price > 0
        then round(((compare_at_price - price) / compare_at_price) * 100)::integer
      else 0
    end
  ) stored;

create index if not exists products_discount_percent_idx
  on public.products (discount_percent desc)
  where discount_percent > 0;
