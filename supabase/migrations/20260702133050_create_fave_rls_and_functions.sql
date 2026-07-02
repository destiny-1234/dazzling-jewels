
/*
# Fave Dazzling Jewels - RLS Policies, Functions, Triggers & Seed Data (Part 2)

Adds:
- has_role() helper function
- RLS on all tables
- Auto-profile trigger on signup
- Seed data: categories, products, testimonials, site_settings
- Admin user role assignment
*/

-- Helper function to check user roles
CREATE OR REPLACE FUNCTION has_role(uid uuid, r text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = uid AND role = r
  );
$$;

-- =================== RLS ===================

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
TO authenticated USING (auth.uid() = id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id OR has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE
TO authenticated USING (has_role(auth.uid(), 'admin'));

-- user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "roles_select_own_or_admin" ON user_roles;
CREATE POLICY "roles_select_own_or_admin" ON user_roles FOR SELECT
TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "roles_insert_admin" ON user_roles;
CREATE POLICY "roles_insert_admin" ON user_roles FOR INSERT
TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "roles_update_admin" ON user_roles;
CREATE POLICY "roles_update_admin" ON user_roles FOR UPDATE
TO authenticated USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "roles_delete_admin" ON user_roles;
CREATE POLICY "roles_delete_admin" ON user_roles FOR DELETE
TO authenticated USING (has_role(auth.uid(), 'admin'));

-- categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_select_all" ON categories;
CREATE POLICY "categories_select_all" ON categories FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "categories_insert_admin" ON categories;
CREATE POLICY "categories_insert_admin" ON categories FOR INSERT
TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "categories_update_admin" ON categories;
CREATE POLICY "categories_update_admin" ON categories FOR UPDATE
TO authenticated USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "categories_delete_admin" ON categories;
CREATE POLICY "categories_delete_admin" ON categories FOR DELETE
TO authenticated USING (has_role(auth.uid(), 'admin'));

-- products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_select_visible" ON products;
CREATE POLICY "products_select_visible" ON products FOR SELECT
TO anon, authenticated USING (visible = true OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "products_insert_admin" ON products;
CREATE POLICY "products_insert_admin" ON products FOR INSERT
TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "products_update_admin" ON products;
CREATE POLICY "products_update_admin" ON products FOR UPDATE
TO authenticated USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "products_delete_admin" ON products;
CREATE POLICY "products_delete_admin" ON products FOR DELETE
TO authenticated USING (has_role(auth.uid(), 'admin'));

-- cart_items
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cart_select_own" ON cart_items;
CREATE POLICY "cart_select_own" ON cart_items FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "cart_insert_own" ON cart_items;
CREATE POLICY "cart_insert_own" ON cart_items FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "cart_update_own" ON cart_items;
CREATE POLICY "cart_update_own" ON cart_items FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "cart_delete_own" ON cart_items;
CREATE POLICY "cart_delete_own" ON cart_items FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- wishlist
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wishlist_select_own" ON wishlist;
CREATE POLICY "wishlist_select_own" ON wishlist FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wishlist_insert_own" ON wishlist;
CREATE POLICY "wishlist_insert_own" ON wishlist FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wishlist_update_own" ON wishlist;
CREATE POLICY "wishlist_update_own" ON wishlist FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wishlist_delete_own" ON wishlist;
CREATE POLICY "wishlist_delete_own" ON wishlist FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_select_own_or_admin" ON orders;
CREATE POLICY "orders_select_own_or_admin" ON orders FOR SELECT
TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "orders_insert_own" ON orders;
CREATE POLICY "orders_insert_own" ON orders FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders_update_admin" ON orders;
CREATE POLICY "orders_update_admin" ON orders FOR UPDATE
TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "orders_delete_admin" ON orders;
CREATE POLICY "orders_delete_admin" ON orders FOR DELETE
TO authenticated USING (has_role(auth.uid(), 'admin'));

-- order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_items_select" ON order_items;
CREATE POLICY "order_items_select" ON order_items FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (orders.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

DROP POLICY IF EXISTS "order_items_insert" ON order_items;
CREATE POLICY "order_items_insert" ON order_items FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "order_items_delete_admin" ON order_items;
CREATE POLICY "order_items_delete_admin" ON order_items FOR DELETE
TO authenticated USING (has_role(auth.uid(), 'admin'));

-- testimonials
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "testimonials_select_visible" ON testimonials;
CREATE POLICY "testimonials_select_visible" ON testimonials FOR SELECT
TO anon, authenticated USING (visible = true OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "testimonials_insert_admin" ON testimonials;
CREATE POLICY "testimonials_insert_admin" ON testimonials FOR INSERT
TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "testimonials_update_admin" ON testimonials;
CREATE POLICY "testimonials_update_admin" ON testimonials FOR UPDATE
TO authenticated USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "testimonials_delete_admin" ON testimonials;
CREATE POLICY "testimonials_delete_admin" ON testimonials FOR DELETE
TO authenticated USING (has_role(auth.uid(), 'admin'));

-- newsletter_subscribers
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "newsletter_insert_public" ON newsletter_subscribers;
CREATE POLICY "newsletter_insert_public" ON newsletter_subscribers FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "newsletter_select_admin" ON newsletter_subscribers;
CREATE POLICY "newsletter_select_admin" ON newsletter_subscribers FOR SELECT
TO authenticated USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "newsletter_delete_admin" ON newsletter_subscribers;
CREATE POLICY "newsletter_delete_admin" ON newsletter_subscribers FOR DELETE
TO authenticated USING (has_role(auth.uid(), 'admin'));

-- contact_messages
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contact_insert_public" ON contact_messages;
CREATE POLICY "contact_insert_public" ON contact_messages FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "contact_select_admin" ON contact_messages;
CREATE POLICY "contact_select_admin" ON contact_messages FOR SELECT
TO authenticated USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "contact_update_admin" ON contact_messages;
CREATE POLICY "contact_update_admin" ON contact_messages FOR UPDATE
TO authenticated USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "contact_delete_admin" ON contact_messages;
CREATE POLICY "contact_delete_admin" ON contact_messages FOR DELETE
TO authenticated USING (has_role(auth.uid(), 'admin'));

-- site_settings
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_select_public" ON site_settings;
CREATE POLICY "settings_select_public" ON site_settings FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "settings_insert_admin" ON site_settings;
CREATE POLICY "settings_insert_admin" ON site_settings FOR INSERT
TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "settings_update_admin" ON site_settings;
CREATE POLICY "settings_update_admin" ON site_settings FOR UPDATE
TO authenticated USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "settings_delete_admin" ON site_settings;
CREATE POLICY "settings_delete_admin" ON site_settings FOR DELETE
TO authenticated USING (has_role(auth.uid(), 'admin'));

-- =================== TRIGGER ===================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, account_type, account_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'retail'),
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data->>'account_type', 'retail') = 'wholesale' THEN 'pending'
      ELSE 'approved'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =================== SEED DATA ===================

-- Categories
INSERT INTO categories (name, slug) VALUES
  ('Clutches', 'clutches'),
  ('Bridal', 'bridal'),
  ('Statement Bags', 'statement-bags'),
  ('Totes', 'totes')
ON CONFLICT (slug) DO NOTHING;

-- Products
INSERT INTO products (name, slug, description, material, category_id, retail_price, wholesale_price, stock, images, visible, featured)
SELECT
  p.name, p.slug, p.description, p.material,
  (SELECT id FROM categories WHERE slug = p.cat_slug),
  p.retail_price, p.wholesale_price, p.stock, p.images, true, p.featured
FROM (VALUES
  (
    'Aurora Clutch',
    'aurora-clutch',
    'A shimmering hand-beaded clutch featuring iridescent glass beads in a sunrise pattern. Perfect for evening events and celebrations.',
    'Glass beads, velvet lining, magnetic clasp',
    'clutches',
    85000, 55000, 12,
    ARRAY['https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=800'],
    true
  ),
  (
    'Celestial Bridal Bag',
    'celestial-bridal-bag',
    'Exquisitely crafted for the modern Nigerian bride. White and gold beadwork with intricate floral motifs hand-stitched by our Lagos artisans.',
    'Pearl beads, Swarovski crystals, satin lining',
    'bridal',
    145000, 95000, 5,
    ARRAY['https://images.pexels.com/photos/1021693/pexels-photo-1021693.jpeg?auto=compress&cs=tinysrgb&w=800'],
    true
  ),
  (
    'Crimson Statement Tote',
    'crimson-statement-tote',
    'Bold and beautiful. This oversized tote features deep crimson seed beads woven into a geometric pattern inspired by Yoruba textile art.',
    'Seed beads, genuine leather handles, cotton lining',
    'statement-bags',
    120000, 78000, 8,
    ARRAY['https://images.pexels.com/photos/1204462/pexels-photo-1204462.jpeg?auto=compress&cs=tinysrgb&w=800'],
    true
  ),
  (
    'Golden Hour Mini',
    'golden-hour-mini',
    'A compact everyday companion with warm gold and amber beading. Fits your essentials with effortless elegance.',
    'Glass seed beads, faux leather, gold-tone hardware',
    'clutches',
    65000, 42000, 15,
    ARRAY['https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=800'],
    true
  ),
  (
    'Ebony Empress Tote',
    'ebony-empress-tote',
    'Rich black and gold beading on a spacious tote silhouette. The definition of understated luxury for the modern African woman.',
    'Japanese seed beads, canvas base, suede lining',
    'totes',
    135000, 88000, 6,
    ARRAY['https://images.pexels.com/photos/1204462/pexels-photo-1204462.jpeg?auto=compress&cs=tinysrgb&w=800'],
    false
  ),
  (
    'Rose Petal Clutch',
    'rose-petal-clutch',
    'Delicate pink and blush beadwork in a floral cascade pattern. A romantic piece for weddings, aso-ebi, and dinner dates.',
    'Czech glass beads, silk interior, silver clasp',
    'clutches',
    78000, 51000, 9,
    ARRAY['https://images.pexels.com/photos/1021693/pexels-photo-1021693.jpeg?auto=compress&cs=tinysrgb&w=800'],
    false
  ),
  (
    'Sapphire Bride',
    'sapphire-bride',
    'Something blue, reimagined. Electric sapphire beads meet traditional bridal elegance in this one-of-a-kind piece.',
    'Sapphire crystal beads, ivory satin, silver hardware',
    'bridal',
    165000, 108000, 3,
    ARRAY['https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=800'],
    false
  ),
  (
    'Lagos Nights Bag',
    'lagos-nights-bag',
    'Inspired by the vibrant energy of Lagos nightlife. Deep navy and silver beading with a metallic finish.',
    'Metallic seed beads, leather trim, zip closure',
    'statement-bags',
    95000, 62000, 11,
    ARRAY['https://images.pexels.com/photos/1204462/pexels-photo-1204462.jpeg?auto=compress&cs=tinysrgb&w=800'],
    false
  )
) AS p(name, slug, description, material, cat_slug, retail_price, wholesale_price, stock, images, featured)
ON CONFLICT (slug) DO NOTHING;

-- Testimonials
INSERT INTO testimonials (customer_name, location, text, rating, visible) VALUES
  ('Adaeze Okonkwo', 'Lagos, Nigeria', 'I wore my Celestial Bridal Bag on my wedding day and received so many compliments. Every bead was placed with such care — you can feel the love in the craftsmanship.', 5, true),
  ('Ngozi Adeyemi', 'Abuja, Nigeria', 'The Aurora Clutch is absolutely stunning in person. Photos don''t do it justice. Fave Dazzling Jewels has a customer for life!', 5, true),
  ('Chioma Eze', 'Port Harcourt, Nigeria', 'Ordered the Crimson Statement Tote for a friend''s traditional wedding and it was the talk of the event. Fast delivery to PH and beautifully packaged.', 5, true),
  ('Funmi Balogun', 'Ibadan, Nigeria', 'The quality is unmatched. I''ve bought luxury bags from abroad and honestly the craftsmanship here rivals anything I''ve seen. Proud to support Nigerian art.', 5, true),
  ('Amara Nwosu', 'Enugu, Nigeria', 'My Golden Hour Mini arrived even more beautiful than expected. The beadwork is immaculate. Will definitely be ordering again for the festive season!', 5, true)
ON CONFLICT DO NOTHING;

-- Site settings
INSERT INTO site_settings (key, value) VALUES
  ('whatsapp_number', '2348012345678'),
  ('business_email', 'hello@favedazzlingjewels.com'),
  ('business_phone', '+234 801 234 5678'),
  ('business_address', '15 Admiralty Way, Lekki Phase 1, Lagos, Nigeria'),
  ('instagram_url', 'https://instagram.com/favedazzlingjewels'),
  ('facebook_url', 'https://facebook.com/favedazzlingjewels'),
  ('tiktok_url', 'https://tiktok.com/@favedazzlingjewels'),
  ('whatsapp_message', 'Hello! I''m interested in your beautiful hand-beaded bags. Can you tell me more?')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
