-- 007_marketplace_features.sql
-- Performance reputation, machine-readable capability schemas, per-key spend
-- limits, listing view tracking (for conversion analytics).

-- ── 1. Performance-based reputation ──────────────────────────────────────────
-- Always-live aggregate per seller, computed from real order/delivery data.
-- Definer view exposing ONLY aggregates (no row-level order data leaks), so it
-- is safe to read publicly on seller pages.
create or replace view public.seller_performance
with (security_invoker = false) as
with order_metrics as (
  select
    o.id,
    o.seller_identity_id,
    o.status,
    o.created_at,
    (select min(d.delivery_timestamp) from deliveries d where d.order_id = o.id) as first_delivery_at,
    (select min(pu.created_at) from order_progress_updates pu where pu.order_id = o.id) as first_update_at
  from orders o
)
select
  seller_identity_id,
  count(*) filter (
    where status in ('paid','in_progress','delivered','revision_requested','completed','disputed','refunded')
  ) as paid_orders,
  count(*) filter (where status = 'completed') as completed_orders,
  count(*) filter (where status in ('disputed','refunded')) as disputed_orders,
  round(
    100.0 * count(*) filter (where status = 'completed')
    / nullif(count(*) filter (
        where status in ('paid','in_progress','delivered','revision_requested','completed','disputed','refunded')
      ), 0)
  )::int as completion_rate_pct,
  round(
    avg(extract(epoch from (first_delivery_at - created_at)) / 3600.0)
      filter (where first_delivery_at is not null)
  , 1) as avg_delivery_hours,
  round(
    avg(extract(epoch from (first_update_at - created_at)) / 3600.0)
      filter (where first_update_at is not null)
  , 1) as avg_response_hours
from order_metrics
group by seller_identity_id;

grant select on public.seller_performance to anon, authenticated;

-- ── 2. Machine-readable capability schema on listings ────────────────────────
-- Structured spec a buyer agent can parse: inputs, outputs, rate limit, example.
alter table listings add column if not exists capability_schema jsonb;

-- ── 3. Per-API-key spend limits (delegated authority) ────────────────────────
alter table api_keys add column if not exists spend_limit_cents int;       -- rolling monthly cap, null = unlimited
alter table api_keys add column if not exists max_transaction_cents int;   -- per-purchase cap, null = unlimited

-- Track which key drove a programmatic order, so spend can be summed per key.
alter table orders add column if not exists api_key_id uuid references api_keys(id) on delete set null;
create index if not exists orders_api_key_id_idx on orders(api_key_id);

-- ── 4. Listing view tracking (for conversion analytics) ──────────────────────
alter table listings add column if not exists view_count int not null default 0;

-- Definer function so anon visitors can bump the counter without write access
-- to the listings table.
create or replace function public.increment_listing_view(p_listing_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update listings set view_count = view_count + 1 where id = p_listing_id;
$$;

grant execute on function public.increment_listing_view(uuid) to anon, authenticated;
