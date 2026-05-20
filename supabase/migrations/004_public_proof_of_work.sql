-- Allow public read on proof_of_work_cards for completed orders.
-- Buyers trust sellers more when they can see what was delivered.
-- We only expose cards from orders that have been completed (accepted by buyer).

CREATE POLICY "Proof of work cards publicly viewable on completed orders"
  ON proof_of_work_cards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM deliveries d
      JOIN orders o ON o.id = d.order_id
      WHERE d.id = proof_of_work_cards.delivery_id
        AND o.status = 'completed'
    )
  );

-- Similarly expose the deliveries for completed orders so the join works
-- (deliveries already has a policy for order participants; this adds public read
--  for completed orders only)
CREATE POLICY "Deliveries publicly viewable on completed orders"
  ON deliveries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = deliveries.order_id
        AND o.status = 'completed'
    )
  );
