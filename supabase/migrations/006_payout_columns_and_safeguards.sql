-- 006_payout_columns_and_safeguards.sql
-- The webhook and payout cron reference columns that were never declared in a
-- migration. If they are missing in the live DB, order creation and payouts
-- fail silently. These statements are idempotent — safe to run regardless of
-- whether the columns were already added by hand in the dashboard.

-- ── orders: fee / payout bookkeeping ─────────────────────────────────────────
alter table orders add column if not exists platform_fee_amount int;
alter table orders add column if not exists seller_payout_amount int;
alter table orders add column if not exists payout_eligible_at timestamptz;
alter table orders add column if not exists payout_record_id uuid references payout_records(id);

-- ── payout_records: per-order payout detail the cron writes ───────────────────
alter table payout_records add column if not exists order_id uuid references orders(id);
alter table payout_records add column if not exists gross_amount int;
alter table payout_records add column if not exists platform_fee int;
alter table payout_records add column if not exists net_amount int;
alter table payout_records add column if not exists paid_at timestamptz;
alter table payout_records add column if not exists failure_message text;

-- ── Idempotency: block duplicate orders from Stripe webhook retries ───────────
-- A flaky/slow webhook gets retried by Stripe; without this a single purchase
-- could be recorded (and paid out) more than once.
create unique index if not exists orders_stripe_session_id_key
  on orders (stripe_session_id) where stripe_session_id is not null;
