-- Run only after the storefront build that calls create_pending_order() is
-- live on Vercel. From then on the RPC is the only way to create an order,
-- which is what makes its throttle enforceable.

drop policy if exists "anyone can place a pending order" on public.orders;
drop policy if exists "anyone can add items to a pending order" on public.order_items;

