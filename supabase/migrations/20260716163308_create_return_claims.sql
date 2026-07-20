
/*
# Return / Exchange Claims

Lets a customer submit a damage/defect claim (order number, description,
photos) straight from the Shipping & Returns page, and lets admins review
those claims from the dashboard.

1. return_claims - one row per claim
2. claim-photos - public storage bucket for the uploaded photos
*/

-- Table
CREATE TABLE IF NOT EXISTS return_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  description text NOT NULL,
  photos text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_return_claims_status ON return_claims(status);
CREATE INDEX IF NOT EXISTS idx_return_claims_user ON return_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_return_claims_created ON return_claims(created_at DESC);

-- =================== RLS ===================

ALTER TABLE return_claims ENABLE ROW LEVEL SECURITY;

-- Anyone (signed in or not) can file a claim from the public form
DROP POLICY IF EXISTS "return_claims_insert_public" ON return_claims;
CREATE POLICY "return_claims_insert_public" ON return_claims FOR INSERT
TO anon, authenticated WITH CHECK (true);

-- Only admins can read the list
DROP POLICY IF EXISTS "return_claims_select_admin" ON return_claims;
CREATE POLICY "return_claims_select_admin" ON return_claims FOR SELECT
TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Only admins can update status / notes
DROP POLICY IF EXISTS "return_claims_update_admin" ON return_claims;
CREATE POLICY "return_claims_update_admin" ON return_claims FOR UPDATE
TO authenticated USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can delete
DROP POLICY IF EXISTS "return_claims_delete_admin" ON return_claims;
CREATE POLICY "return_claims_delete_admin" ON return_claims FOR DELETE
TO authenticated USING (has_role(auth.uid(), 'admin'));

-- =================== STORAGE ===================

-- Public bucket so the uploaded claim photos have a plain public URL the
-- admin dashboard can render directly (same approach as product-images).
INSERT INTO storage.buckets (id, name, public)
VALUES ('claim-photos', 'claim-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "claim_photos_public_read" ON storage.objects;
CREATE POLICY "claim_photos_public_read" ON storage.objects FOR SELECT
TO anon, authenticated USING (bucket_id = 'claim-photos');

DROP POLICY IF EXISTS "claim_photos_public_upload" ON storage.objects;
CREATE POLICY "claim_photos_public_upload" ON storage.objects FOR INSERT
TO anon, authenticated WITH CHECK (bucket_id = 'claim-photos');
