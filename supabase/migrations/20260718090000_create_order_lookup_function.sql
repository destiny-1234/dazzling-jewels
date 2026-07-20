/*
# Order lookup for return claims

Adds a SECURITY DEFINER function that lets the server safely check whether
a given order-number prefix (the first 8 characters of an order's UUID,
which is what's shown to customers as "#A1B2C3D4") belongs to a given
email address — without exposing any other order data.
*/

CREATE OR REPLACE FUNCTION find_order_by_prefix_and_email(p_prefix text, p_email text)
RETURNS TABLE (id uuid, shipping_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.shipping_name
  FROM orders o
  WHERE o.id::text ILIKE (p_prefix || '%')
    AND lower(trim(o.shipping_email)) = lower(trim(p_email))
  LIMIT 1;
$$;
