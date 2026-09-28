-- First-party store analytics. Daily counts only: no IP, no user id, no raw log.
-- A short session hash is kept for the current day so one visit is not counted
-- twice. Paid purchases are written by the payments function, never the browser.

create table if not exists public.analytics_daily (
  day            date not null,
  event          text not null,
  product_id     uuid,
  category_slug  text,
  search_term    text,
  sessions       integer not null default 0,
  events         integer not null default 0,
  constraint analytics_daily_event_chk check (
    event in ('view_item', 'view_category', 'add_to_cart', 'begin_checkout', 'search', 'purchase')
  )
);

create unique index if not exists analytics_daily_uidx
  on public.analytics_daily (
    day,
    event,
    coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(category_slug, ''),
    coalesce(search_term, '')
  );

create table if not exists public.analytics_seen (
  day           date not null,
  event         text not null,
  subject       text not null,
  session_hash  text not null,
  primary key (day, event, subject, session_hash)
);

alter table public.analytics_daily enable row level security;
alter table public.analytics_seen enable row level security;

revoke all on public.analytics_daily from anon, authenticated;
revoke all on public.analytics_seen from anon, authenticated;

-- ----------------------------------------------------------- record one hit

create or replace function public.record_store_event(
  p_event text,
  p_session text,
  p_product_id uuid default null,
  p_category text default null,
  p_search text default null,
  p_count integer default 1
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'Asia/Tbilisi')::date;
  v_event text := lower(trim(coalesce(p_event, '')));
  v_session text := left(trim(coalesce(p_session, '')), 80);
  v_category text := nullif(left(trim(coalesce(p_category, '')), 80), '');
  v_search text := nullif(left(regexp_replace(lower(trim(coalesce(p_search, ''))), '\s+', ' ', 'g'), 80), '');
  v_count integer := greatest(1, least(coalesce(p_count, 1), 99));
  v_subject text;
  v_hash text;
  v_inserted integer;
begin
  if v_event not in ('view_item', 'view_category', 'add_to_cart', 'begin_checkout', 'search', 'purchase') then
    return;
  end if;
  if v_session = '' then
    return;
  end if;
  if v_search is not null and v_search ~ '@' then
    return;
  end if;

  v_subject := case v_event
    when 'view_item' then coalesce(p_product_id::text, '')
    when 'add_to_cart' then coalesce(p_product_id::text, '')
    when 'purchase' then coalesce(p_product_id::text, '')
    when 'view_category' then coalesce(v_category, '')
    when 'search' then coalesce(v_search, '')
    else 'checkout'
  end;
  if v_subject = '' then
    return;
  end if;

  v_hash := encode(extensions.digest(convert_to(v_session, 'UTF8'), 'sha256'), 'hex');
  v_hash := left(v_hash, 16);

  delete from public.analytics_seen where day < v_day - 2;

  insert into public.analytics_seen (day, event, subject, session_hash)
  values (v_day, v_event, v_subject, v_hash)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return;
  end if;

  insert into public.analytics_daily (day, event, product_id, category_slug, search_term, sessions, events)
  values (
    v_day,
    v_event,
    case when v_event in ('view_item', 'add_to_cart', 'purchase') then p_product_id end,
    case when v_event = 'view_category' then v_category end,
    case when v_event = 'search' then v_search end,
    1,
    case when v_event = 'purchase' then v_count else 1 end
  )
  on conflict (
    day,
    event,
    coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(category_slug, ''),
    coalesce(search_term, '')
  )
  do update set
    sessions = public.analytics_daily.sessions + 1,
    events = public.analytics_daily.events + excluded.events;
end;
$$;

revoke all on function public.record_store_event(text, text, uuid, text, text, integer) from public;
grant execute on function public.record_store_event(text, text, uuid, text, text, integer) to service_role;

-- -------------------------------------------------------------- admin read

create or replace function public.analytics_summary(p_days integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_days integer := case when p_days in (7, 30, 90) then p_days else 30 end;
  v_end date := (now() at time zone 'Asia/Tbilisi')::date + 1;
  v_start date := v_end - v_days;
  v_prev date := v_start - v_days;
  v_funnel jsonb;
  v_previous jsonb;
  v_products jsonb;
  v_rare jsonb;
  v_categories jsonb;
  v_searches jsonb;
begin
  if not private.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  with bounds as (
    select v_start as start_day, v_end as end_day, 'current' as which
    union all
    select v_prev, v_start, 'previous'
  ),
  attention as (
    select b.which, d.event, sum(d.sessions)::int as sessions
    from bounds b
    join public.analytics_daily d on d.day >= b.start_day and d.day < b.end_day
    where d.event in ('view_item', 'add_to_cart', 'begin_checkout')
    group by b.which, d.event
  ),
  paid as (
    select b.which, count(*)::int as purchases
    from bounds b
    join public.orders o
      on (o.created_at at time zone 'Asia/Tbilisi')::date >= b.start_day
     and (o.created_at at time zone 'Asia/Tbilisi')::date < b.end_day
     and o.payment_status = 'paid'
    group by b.which
  )
  select
    jsonb_build_object(
      'views', coalesce((select sessions from attention where which = 'current' and event = 'view_item'), 0),
      'addToCart', coalesce((select sessions from attention where which = 'current' and event = 'add_to_cart'), 0),
      'checkout', coalesce((select sessions from attention where which = 'current' and event = 'begin_checkout'), 0),
      'purchases', coalesce((select purchases from paid where which = 'current'), 0)
    ),
    jsonb_build_object(
      'views', coalesce((select sessions from attention where which = 'previous' and event = 'view_item'), 0),
      'addToCart', coalesce((select sessions from attention where which = 'previous' and event = 'add_to_cart'), 0),
      'checkout', coalesce((select sessions from attention where which = 'previous' and event = 'begin_checkout'), 0),
      'purchases', coalesce((select purchases from paid where which = 'previous'), 0)
    )
  into v_funnel, v_previous;

  with views as (
    select product_id, sum(sessions)::int as views
    from public.analytics_daily
    where event = 'view_item' and product_id is not null
      and day >= v_start and day < v_end
    group by product_id
  ),
  carts as (
    select product_id, sum(sessions)::int as adds
    from public.analytics_daily
    where event = 'add_to_cart' and product_id is not null
      and day >= v_start and day < v_end
    group by product_id
  ),
  sold as (
    select i.product_id,
           sum(i.quantity)::int as units,
           sum(i.quantity * i.price)::numeric as revenue
    from public.order_items i
    join public.orders o on o.id = i.order_id
    where o.payment_status = 'paid'
      and i.product_id is not null
      and (o.created_at at time zone 'Asia/Tbilisi')::date >= v_start
      and (o.created_at at time zone 'Asia/Tbilisi')::date < v_end
    group by i.product_id
  ),
  ranked as (
    select p.id, p.name, p.slug,
           v.views,
           coalesce(c.adds, 0) as adds,
           coalesce(s.units, 0) as units,
           coalesce(s.revenue, 0) as revenue
    from views v
    join public.products p on p.id = v.product_id
    left join carts c on c.product_id = v.product_id
    left join sold s on s.product_id = v.product_id
  )
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into v_products
  from (
    select id, name, slug, views, adds as "addToCart", units, revenue
    from ranked
    order by views desc, name
    limit 20
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into v_rare
  from (
    select id, name, slug, views, adds as "addToCart", units, revenue
    from (
      select p.id, p.name, p.slug,
             v.views,
             coalesce(c.adds, 0) as adds,
             coalesce(s.units, 0) as units,
             coalesce(s.revenue, 0) as revenue
      from (
        select product_id, sum(sessions)::int as views
        from public.analytics_daily
        where event = 'view_item' and product_id is not null
          and day >= v_start and day < v_end
        group by product_id
      ) v
      join public.products p on p.id = v.product_id
      left join (
        select product_id, sum(sessions)::int as adds
        from public.analytics_daily
        where event = 'add_to_cart' and product_id is not null
          and day >= v_start and day < v_end
        group by product_id
      ) c on c.product_id = v.product_id
      left join (
        select i.product_id, sum(i.quantity)::int as units, sum(i.quantity * i.price)::numeric as revenue
        from public.order_items i
        join public.orders o on o.id = i.order_id
        where o.payment_status = 'paid' and i.product_id is not null
          and (o.created_at at time zone 'Asia/Tbilisi')::date >= v_start
          and (o.created_at at time zone 'Asia/Tbilisi')::date < v_end
        group by i.product_id
      ) s on s.product_id = v.product_id
      where v.views >= 3
    ) ranked
    order by (units::numeric / views), views desc
    limit 10
  ) t;

  with views as (
    select category_slug, sum(sessions)::int as views
    from public.analytics_daily
    where event = 'view_category' and category_slug is not null
      and day >= v_start and day < v_end
    group by category_slug
  ),
  sold as (
    select p.category_id as slug, sum(i.quantity * i.price)::numeric as revenue
    from public.order_items i
    join public.orders o on o.id = i.order_id
    join public.products p on p.id = i.product_id
    where o.payment_status = 'paid' and p.category_id is not null
      and (o.created_at at time zone 'Asia/Tbilisi')::date >= v_start
      and (o.created_at at time zone 'Asia/Tbilisi')::date < v_end
    group by p.category_id
  )
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into v_categories
  from (
    select v.category_slug as slug,
           coalesce(c.label, v.category_slug) as label,
           v.views,
           coalesce(s.revenue, 0) as revenue
    from views v
    left join public.categories c on c.slug = v.category_slug
    left join sold s on s.slug = v.category_slug
    order by v.views desc
    limit 20
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into v_searches
  from (
    select search_term as term, sum(sessions)::int as count
    from public.analytics_daily
    where event = 'search' and search_term is not null
      and day >= v_start and day < v_end
    group by search_term
    order by count desc, term
    limit 15
  ) t;

  return jsonb_build_object(
    'days', v_days,
    'funnel', v_funnel,
    'previous', v_previous,
    'products', v_products,
    'rarelyBought', v_rare,
    'categories', v_categories,
    'searches', v_searches
  );
end;
$$;

revoke all on function public.analytics_summary(integer) from public;
grant execute on function public.analytics_summary(integer) to authenticated;
