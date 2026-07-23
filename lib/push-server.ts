import webpush from 'web-push';

// Shared helper so any server route can push a notification to a signed-in
// user's subscribed devices. Safe to call even if the user has never
// enabled push — it just finds zero subscriptions and does nothing.

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error('Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY');
  }
  webpush.setVapidDetails('mailto:support@favedazzlingjewels.com', publicKey, privateKey);
  configured = true;
}

export async function sendPushToUser(
  adminClient: any,
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  try {
    ensureConfigured();
  } catch (err) {
    console.error('push: not configured', err);
    return;
  }

  const { data: subs } = await adminClient
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (!subs || subs.length === 0) return;

  for (const sub of subs as any[]) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
    } catch (err: any) {
      // 410/404 means the subscription is dead (browser data cleared,
      // uninstalled, etc) — clean it up so we stop trying.
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await adminClient.from('push_subscriptions').delete().eq('id', sub.id);
      } else {
        console.error('push: failed to send to subscription', sub.id, err?.statusCode || err);
      }
    }
  }
}
