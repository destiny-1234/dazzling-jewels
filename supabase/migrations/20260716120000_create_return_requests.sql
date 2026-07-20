
/*
# Return / Exchange Requests

Adds a table for customers to submit damaged/defective item claims from the
Shipping & Returns page (order number, description, and photo evidence),
plus a storage bucket to hold the uploaded photos, and an admin inbox to
review and action them.

1. return_requests - one row per claim submitted from the public form
2. Storage bucket "return-photos" - public-read bucket for the uploaded images
3. RLS - anyone can submit a claim (and upload photos); only admins can view,
   update status on, or delete claims
*/

-- ============ TABLE ============

CREATE TABLE IF NOT EXISTS return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  description text NOT NULL,
  photo_urls text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(status);
CREATE INDEX IF NOT EXISTS idx_return_requests_created ON return_requests(created_at DESC);

ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "return_requests_insert_public" ON return_requests;
CREATE POLICY "return_requests_insert_public" ON return_requests FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "return_requests_select_admin" ON return_requests;
CREATE POLICY "return_requests_select_admin" ON return_requests FOR SELECT
TO authenticated USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "return_requests_update_admin" ON return_requests;
CREATE POLICY "return_requests_update_admin" ON return_requests FOR UPDATE
TO authenticated USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "return_requests_delete_admin" ON return_requests;
CREATE POLICY "return_requests_delete_admin" ON return_requests FOR DELETE
TO authenticated USING (has_role(auth.uid(), 'admin'));

-- ============ STORAGE BUCKET ============

INSERT INTO storage.buckets (id, name, public)
VALUES ('return-photos', 'return-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "return_photos_public_read" ON storage.objects;
CREATE POLICY "return_photos_public_read" ON storage.objects FOR SELECT
TO anon, authenticated USING (bucket_id = 'return-photos');

DROP POLICY IF EXISTS "return_photos_public_upload" ON storage.objects;
CREATE POLICY "return_photos_public_upload" ON storage.objects FOR INSERT
TO anon, authenticated WITH CHECK (bucket_id = 'return-photos');

DROP POLICY IF EXISTS "return_photos_admin_delete" ON storage.objects;
CREATE POLICY "return_photos_admin_delete" ON storage.objects FOR DELETE
TO authenticated USING (bucket_id = 'return-photos' AND has_role(auth.uid(), 'admin'));
