/*
# Coupons / Discount Codes

Adds admin-managed discount codes that customers can apply at checkout.

1. coupons - admin-managed codes (percentage or fixed-amount discounts)
2. orders gets coupon_code + discount_amount so the discount is recorded
   against the order it was used on
3. validate_coupon() - a SECURITY DEFINER function that safely checks a
   code's validity and computes the discount, without exposing the whole
   coupons table (which stays admin-only) to public SELECT
*/

CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  active boolean NOT NULL DEFAULT true,
  min_order_amount numeric NOT NULL DEFAULT 0,
  usage_limit integer,
  times_used integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_all_admin" ON coupons;
CREATE POLICY "coupons_all_admin" ON coupons FOR ALL
TO authenticated USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Orders: record which coupon (if any) was used, and how much it saved
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

-- Safely check a coupon code without exposing the coupons table itself to
-- public SELECT. Returns valid=false with a message for any failure case;
-- never errors out on a bad code so the client can show a friendly toast.
CREATE OR REPLACE FUNCTION validate_coupon(p_code text, p_subtotal numeric)
RETURNS TABLE (valid boolean, discount_amount numeric, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c coupons%ROWTYPE;
  computed_discount numeric;
BEGIN
  SELECT * INTO c FROM coupons WHERE lower(code) = lower(trim(p_code));

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::numeric, 'Invalid coupon code';
    RETURN;
  END IF;

  IF NOT c.active THEN
    RETURN QUERY SELECT false, 0::numeric, 'This coupon is no longer active';
    RETURN;
  END IF;

  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN QUERY SELECT false, 0::numeric, 'This coupon has expired';
    RETURN;
  END IF;

  IF c.usage_limit IS NOT NULL AND c.times_used >= c.usage_limit THEN
    RETURN QUERY SELECT false, 0::numeric, 'This coupon has reached its usage limit';
    RETURN;
  END IF;

  IF p_subtotal < c.min_order_amount THEN
    RETURN QUERY SELECT false, 0::numeric,
      format('This coupon requires a minimum order of %s', c.min_order_amount);
    RETURN;
  END IF;

  IF c.discount_type = 'percentage' THEN
    computed_discount := p_subtotal * (c.discount_value / 100);
  ELSE
    computed_discount := c.discount_value;
  END IF;

  -- Never discount more than the subtotal itself
  computed_discount := LEAST(computed_discount, p_subtotal);

  RETURN QUERY SELECT true, computed_discount, 'Coupon applied';
END;
$$;

GRANT EXECUTE ON FUNCTION validate_coupon(text, numeric) TO anon, authenticated;
