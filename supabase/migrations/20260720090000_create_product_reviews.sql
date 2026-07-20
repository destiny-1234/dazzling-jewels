/*
# Verified-Purchase Product Reviews

Adds customer reviews that are tied to an actual paid order — not just
free-text testimonials. The verification isn't just a UI check: the INSERT
policy itself requires a matching paid order_item to exist, so a review
can't be faked even by someone calling the API directly.

1. product_reviews - one review per (product, customer), rating 1-5 + comment
2. RLS - anyone can read visible reviews; a customer can only insert a
   review for a product they have a paid order for, and only for
   themselves; admins can moderate (hide/delete) any review
*/

CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_reviews_select_visible" ON product_reviews;
CREATE POLICY "product_reviews_select_visible" ON product_reviews FOR SELECT
TO anon, authenticated USING (visible = true OR has_role(auth.uid(), 'admin'));

-- The key protection: a review can only be inserted for a product the
-- reviewer actually has a PAID order containing, and only as themselves.
DROP POLICY IF EXISTS "product_reviews_insert_verified_purchase" ON product_reviews;
CREATE POLICY "product_reviews_insert_verified_purchase" ON product_reviews FOR INSERT
TO authenticated WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.order_id = product_reviews.order_id
      AND oi.product_id = product_reviews.product_id
      AND o.user_id = auth.uid()
      AND o.payment_status = 'paid'
  )
);

DROP POLICY IF EXISTS "product_reviews_update_own_or_admin" ON product_reviews;
CREATE POLICY "product_reviews_update_own_or_admin" ON product_reviews FOR UPDATE
TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "product_reviews_delete_own_or_admin" ON product_reviews;
CREATE POLICY "product_reviews_delete_own_or_admin" ON product_reviews FOR DELETE
TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
