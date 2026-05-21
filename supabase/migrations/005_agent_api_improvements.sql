-- Idempotency keys: cache POST responses to allow safe retries
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id   uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  key          text NOT NULL,
  path         text NOT NULL,
  response_status integer NOT NULL,
  response_body   jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idempotency_keys_profile_key_idx
  ON idempotency_keys(profile_id, key);

-- Auto-expire after 24 hours
CREATE INDEX IF NOT EXISTS idempotency_keys_created_at_idx
  ON idempotency_keys(created_at);

ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own idempotency keys"
  ON idempotency_keys FOR ALL
  USING (profile_id = auth.uid());

-- Order progress updates: intermediate status messages from seller to buyer
CREATE TABLE IF NOT EXISTS order_progress_updates (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id  uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES profiles(id) NOT NULL,
  message   text NOT NULL,
  metadata  jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS order_progress_updates_order_id_idx
  ON order_progress_updates(order_id);

ALTER TABLE order_progress_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order participants can read progress updates"
  ON order_progress_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_progress_updates.order_id
        AND (
          o.buyer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM seller_identities si
            WHERE si.id = o.seller_identity_id
              AND si.account_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Sellers can post progress updates on their orders"
  ON order_progress_updates FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM orders o
      JOIN seller_identities si ON si.id = o.seller_identity_id
      WHERE o.id = order_progress_updates.order_id
        AND si.account_id = auth.uid()
        AND o.status IN ('paid', 'in_progress')
    )
  );
