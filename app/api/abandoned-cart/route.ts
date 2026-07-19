import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Triggered by Vercel Cron (see vercel.json) once an hour. Not reachable
// usefully by anyone else: Vercel automatically sends
// "Authorization: Bearer <CRON_SECRET>" on cron-triggered requests, and we
// reject anything that doesn't match.
//
// Logic: find users whose cart hasn't been touched in 24+ hours, who
// either never got a reminder or whose cart changed since their last
// reminder, and email them once.

const ABANDONED_AFTER_HOURS = 24;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
  }
  if (!gmailUser || !gmailPass) {
    return NextResponse.json({ error: 'Missing GMAIL_USER / GMAIL_APP_PASSWORD' }, { status: 500 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const cutoff = new Date(Date.now() - ABANDONED_AFTER_HOURS * 60 * 60 * 1000).toISOString();

  // All cart rows untouched since the cutoff, with product name/price for
  // the email. Profiles are fetched separately below since cart_items has
  // no direct foreign key to profiles for PostgREST to embed.
  const { data: staleItems, error: staleError } = await adminClient
    .from('cart_items')
    .select('user_id, quantity, updated_at, products(name, retail_price, slug)')
    .lt('updated_at', cutoff);

  if (staleError) {
    console.error('abandoned-cart cron: failed to load stale cart items', staleError);
    return NextResponse.json({ error: 'Failed to load cart items' }, { status: 500 });
  }

  type StaleRow = {
    user_id: string;
    quantity: number;
    updated_at: string;
    products: { name: string; retail_price: number; slug: string } | null;
  };

  const normalizedRows: StaleRow[] = ((staleItems || []) as any[]).map((row) => ({
    user_id: row.user_id,
    quantity: row.quantity,
    updated_at: row.updated_at,
    products: Array.isArray(row.products) ? row.products[0] || null : row.products || null,
  }));

  const byUser = new Map<string, StaleRow[]>();
  for (const row of normalizedRows) {
    const list = byUser.get(row.user_id) || [];
    list.push(row);
    byUser.set(row.user_id, list);
  }

  if (byUser.size === 0) {
    return NextResponse.json({ checked: 0, sent: 0 });
  }

  const { data: profileRows } = await adminClient
    .from('profiles')
    .select('id, email, full_name')
    .in('id', Array.from(byUser.keys()));

  const profileMap = new Map((profileRows || []).map((p) => [p.id, p]));

  const { data: lastReminders } = await adminClient
    .from('abandoned_cart_emails')
    .select('user_id, sent_at')
    .in('user_id', Array.from(byUser.keys()));

  const lastReminderMap = new Map((lastReminders || []).map((r) => [r.user_id, r.sent_at]));

  const nodemailer = (await import('nodemailer')).default;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass },
  });

  const formatNaira = (amount: number) =>
    '\u20A6' + new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(amount);

  let sent = 0;

  for (const [userId, items] of Array.from(byUser.entries())) {
    // Most recent activity on this user's cart, across all their items.
    const mostRecentUpdate = items.reduce(
      (latest: string, i: StaleRow) => (new Date(i.updated_at) > new Date(latest) ? i.updated_at : latest),
      items[0].updated_at
    );
    const lastSent = lastReminderMap.get(userId);
    // Skip if we already reminded them since their most recent cart activity.
    if (lastSent && new Date(lastSent) >= new Date(mostRecentUpdate)) continue;

    const profile = profileMap.get(userId);
    const email = profile?.email;
    if (!email) continue;
    const firstName = (profile?.full_name || '').split(' ')[0] || 'there';

    const rows = items
      .filter((i: StaleRow) => i.products)
      .map(
        (i: StaleRow) =>
          `<tr><td style="padding:6px 0;">${escapeHtml(i.products!.name)} &times; ${i.quantity}</td><td style="padding:6px 0;text-align:right;">${formatNaira(i.products!.retail_price * i.quantity)}</td></tr>`
      )
      .join('');

    try {
      await transporter.sendMail({
        from: `"Fave Dazzling Jewels" <${gmailUser}>`,
        to: email,
        subject: 'You left something beautiful behind',
        html: `
          <div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:480px;margin:0 auto;">
            <p>Hi ${escapeHtml(firstName)},</p>
            <p>You still have items waiting in your cart:</p>
            <table style="width:100%;border-collapse:collapse;margin-top:12px;">${rows}</table>
            <p style="margin-top:20px;">They're not reserved forever — complete your order before they sell out.</p>
            <p style="margin-top:20px;">&mdash; Fave Dazzling Jewels</p>
          </div>
        `,
      });

      await adminClient
        .from('abandoned_cart_emails')
        .upsert({ user_id: userId, sent_at: new Date().toISOString() });
      sent += 1;
    } catch (err) {
      console.error('abandoned-cart cron: failed to email user', userId, err);
    }
  }

  return NextResponse.json({ checked: byUser.size, sent });
}

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
