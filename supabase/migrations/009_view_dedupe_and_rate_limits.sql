-- 009_view_dedupe_and_rate_limits.sql
-- 1) Listing view counts: dedupe per viewer per day so sellers can't inflate
--    their own stats by refreshing.
-- 2) Real API rate limiting: fixed-window counters enforced at the middleware.

-- ── 1. View dedupe ────────────────────────────────────────────────────────────
create table if not exists listing_view_events (
  listing_id uuid not null references listings(id) on delete cascade,
  viewer_hash text not null,          -- sha256 of IP (or user id), never the raw value
  view_day date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (listing_id, viewer_hash, view_day)
);

alter table listing_view_events enable row level security;
-- No policies: only touched via the definer function below.

-- Replaces the naive increment: bumps the counter only on the first view from
-- this viewer today. Old single-arg version is dropped.
drop function if exists public.increment_listing_view(uuid);

create or replace function public.increment_listing_view(p_listing_id uuid, p_viewer_hash text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into listing_view_events (listing_id, viewer_hash)
  values (p_listing_id, p_viewer_hash)
  on conflict do nothing;

  if found then
    update listings set view_count = view_count + 1 where id = p_listing_id;
  end if;
end;
$$;

grant execute on function public.increment_listing_view(uuid, text) to anon, authenticated;

-- ── 2. Rate limiting ──────────────────────────────────────────────────────────
create table if not exists rate_limit_counters (
  key_hash text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key_hash, window_start)
);

alter table rate_limit_counters enable row level security;
-- No policies: only touched via the definer function below (service role).

-- Atomically records a hit and reports whether the caller is still under the
-- limit for the current fixed window. Also opportunistically clears stale rows.
create or replace function public.rate_limit_hit(
  p_key_hash text,
  p_limit int default 60,
  p_window_seconds int default 60
)
returns table (allowed boolean, current_count int, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count int;
begin
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into rate_limit_counters as rlc (key_hash, window_start, count)
  values (p_key_hash, v_window_start, 1)
  on conflict (key_hash, window_start)
  do update set count = rlc.count + 1
  returning rlc.count into v_count;

  -- Opportunistic cleanup of expired windows (cheap, bounded)
  delete from rate_limit_counters
  where key_hash = p_key_hash and window_start < v_window_start;

  return query select
    v_count <= p_limit,
    v_count,
    v_window_start + make_interval(secs => p_window_seconds);
end;
$$;

grant execute on function public.rate_limit_hit(text, int, int) to service_role;
