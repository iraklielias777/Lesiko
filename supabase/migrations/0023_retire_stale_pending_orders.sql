-- A checkout that never reached a card leaves a pending order behind. Flitt's
-- order lifetime is ten hours, so after twelve nothing can still pay it: mark
-- it failed/cancelled so the admin's order list shows abandoned checkouts as
-- what they are instead of an ever-growing "Processing" queue. Runs inside
-- create_pending_order, so it needs no scheduler.
create or replace function public.retire_stale_pending_orders()
returns integer
language sql
security definer
set search_path = public
as $$
  with retired as (
    update public.orders
       set payment_status = 'failed', status = 'Cancelled'
     where payment_status = 'pending'
       and created_at < now() - interval '12 hours'
    returning 1
  )
  select count(*)::integer from retired;
$$;

revoke all on function public.retire_stale_pending_orders() from public;
