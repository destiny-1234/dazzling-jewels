/*
# Abandoned Cart Nudges + Back-in-Stock Notifications

1. cart_items gets updated_at (auto-bumped on any insert/update) so we can
   tell how long a cart has actually been sitting untouched, and
   abandoned_cart_emails tracks the last reminder sent per user so we never
   nag more than once per abandonment episode.
2. back_in_stock_requests lets a customer leave their email on a sold-out
   product; when an admin restocks it, everyone waiting gets emailed once.
*/

-- ============ ABANDONED CART ============

ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION touch_cart_item_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_cart_item ON cart_items;
CREATE TRIGGER trg_touch_cart_item
BEFORE INSERT OR UPDATE ON cart_items
FOR EACH ROW EXECUTE FUNCTION touch_cart_item_updated_at();

CREATE TABLE IF NOT EXISTS abandoned_cart_emails (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE abandoned_cart_emails ENABLE ROW LEVEL SECURITY;
-- No public policies at all — only the service role (used by the cron
-- route) ever touches this table.

-- ============ BACK IN STOCK ============

CREATE TABLE IF NOT EXISTS back_in_stock_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_back_in_stock_unique
  ON back_in_stock_requests (product_id, lower(email));

ALTER TABLE back_in_stock_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "back_in_stock_insert_public" ON back_in_stock_requests;
CREATE POLICY "back_in_stock_insert_public" ON back_in_stock_requests FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "back_in_stock_select_admin" ON back_in_stock_requests;
CREATE POLICY "back_in_stock_select_admin" ON back_in_stock_requests FOR SELECT
TO authenticated USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "back_in_stock_delete_admin" ON back_in_stock_requests;
CREATE POLICY "back_in_stock_delete_admin" ON back_in_stock_requests FOR DELETE
TO authenticated USING (has_role(auth.uid(), 'admin'));
