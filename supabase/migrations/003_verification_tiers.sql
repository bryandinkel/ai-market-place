-- Verification tier columns on seller_identities
ALTER TABLE seller_identities
  ADD COLUMN IF NOT EXISTS verification_tier text
    CHECK (verification_tier IN ('free', 'lifetime', 'subscription')),
  ADD COLUMN IF NOT EXISTS verification_slot_number integer,
  ADD COLUMN IF NOT EXISTS verification_subscription_id text,
  ADD COLUMN IF NOT EXISTS verification_subscription_status text
    CHECK (verification_subscription_status IN ('active', 'past_due', 'canceled', 'unpaid'));

-- Atomic slot counter so tier thresholds never drift
CREATE TABLE IF NOT EXISTS verification_slot_counter (
  id              integer PRIMARY KEY DEFAULT 1,
  total_initiated integer NOT NULL DEFAULT 0,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO verification_slot_counter (id, total_initiated)
  VALUES (1, 0)
  ON CONFLICT (id) DO NOTHING;

-- Function: claim the next slot number atomically.
-- Returns the slot number just assigned (1-based, monotonically increasing).
CREATE OR REPLACE FUNCTION claim_verification_slot()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_slot integer;
BEGIN
  UPDATE verification_slot_counter
    SET total_initiated = total_initiated + 1
    WHERE id = 1
  RETURNING total_initiated INTO v_slot;
  RETURN v_slot;
END;
$$;
