-- 008_saved_payment_methods.sql
-- Store the buyer's Stripe customer id so cards can be saved and reused — both
-- for faster repeat checkout and for guarded off-session agent charges.
alter table profiles add column if not exists stripe_customer_id text;
create index if not exists profiles_stripe_customer_id_idx on profiles(stripe_customer_id);
