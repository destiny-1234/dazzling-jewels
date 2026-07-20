import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Called from the admin Products page right after a product is saved.
// If the product now has stock > 0, emails everyone who asked to be
// notified for it and haven't been told yet, then marks them notified so
// they're never emailed twice for the same restock.

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: isAdmin, error: roleError } = await userClient.rpc('has_role', {
      uid: userData.user.id,
      r: 'admin',
    });
    if (roleError || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { product_id } = await req.json();
    if (!product_id) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: product } = await adminClient
      .from('products')
      .select('id, name, slug, stock')
      .eq('id', product_id)
      .maybeSingle();

    if (!product || product.stock <= 0) {
      return NextResponse.json({ notified: 0, reason: 'Product not in stock' });
    }

    const { data: requests } = await adminClient
      .from('back_in_stock_requests')
      .select('id, email')
      .eq('product_id', product_id)
      .eq('notified', false);

    if (!requests || requests.length === 0) {
      return NextResponse.json({ notified: 0 });
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    if (!gmailUser || !gmailPass) {
      return NextResponse.json(
        { error: 'Email sending is not configured yet (missing GMAIL_USER / GMAIL_APP_PASSWORD).' },
        { status: 500 }
      );
    }

    const nodemailer = (await import('nodemailer')).default;
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    });

    const siteUrl = 'https://dazzling-jewels.vercel.app';
    let notified = 0;

    for (const request of requests) {
      try {
        await transporter.sendMail({
          from: `"Fave Dazzling Jewels" <${gmailUser}>`,
          to: request.email,
          subject: `${product.name} is back in stock!`,
          html: `
            <div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:480px;margin:0 auto;">
              <p>Good news!</p>
              <p><strong>${escapeHtml(product.name)}</strong> is back in stock.</p>
              <p style="margin-top:16px;"><a href="${siteUrl}/products/${product.slug}" style="color:#8a1c3c;">View it here</a> before it sells out again.</p>
              <p style="margin-top:24px;">&mdash; Fave Dazzling Jewels</p>
            </div>
          `,
        });
        await adminClient.from('back_in_stock_requests').update({ notified: true }).eq('id', request.id);
        notified += 1;
      } catch (err) {
        console.error('notify-back-in-stock: failed to email', request.email, err);
      }
    }

    return NextResponse.json({ notified });
  } catch (err) {
    console.error('notify-back-in-stock error', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
