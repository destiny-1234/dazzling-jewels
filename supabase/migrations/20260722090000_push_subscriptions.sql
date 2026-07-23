/*
# Push Notification Subscriptions

Stores each browser/device's Web Push subscription so the server can send
notifications later (order shipped, back-in-stock alerts, etc).

RLS: a user can only manage their own subscriptions. Sending pushes always
happens server-side with the service-role key, which bypasses RLS.
*/

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_all_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_all_own" ON push_subscriptions FOR ALL
TO authenticated USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
