import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This is the ONLY place an order is allowed to be marked "paid." It runs
// server-side, never trusts the browser, and re-checks the payment with
// Paystack itself using the secret key before touching the database.
//
// Flow:
// 1. Confirm the caller is signed in (their Supabase access token).
// 2. Load the order using the service-role key (bypasses RLS — safe here
//    because every check below is done explicitly in code).
// 3. Confirm the order actually belongs to that caller.
// 4. Ask Paystack directly: "was this reference really a successful
//    charge, for at least this order's total, in NGN?" — the browser's
//    own claim about the payment is never trusted.
// 5. Only if all of that checks out: mark paid + run stock fulfillment.

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

    const { order_id, reference } = await req.json();
    if (!order_id || !reference) {
      return NextResponse.json({ error: 'order_id and reference are required' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server is not configured (missing SUPABASE_SERVICE_ROLE_KEY).' },
        { status: 500 }
      );
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('id, user_id, total, subtotal, delivery_fee, discount_amount, coupon_code, payment_status, shipping_name, shipping_email')
      .eq('id', order_id)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.user_id !== userData.user.id) {
      return NextResponse.json({ error: 'This order does not belong to you' }, { status: 403 });
    }
    if (order.payment_status === 'paid') {
      // Already verified (e.g. the browser retried this call) — idempotent success.
      return NextResponse.json({ verified: true, already: true });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: 'Server is not configured (missing PAYSTACK_SECRET_KEY).' },
        { status: 500 }
      );
    }

    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    const paystackData = await paystackRes.json();
    const tx = paystackData?.data;

    // Paystack amounts are in kobo — order.total is stored in naira, so
    // convert before comparing.
    const expectedKobo = Math.round(Number(order.total) * 100);

    const isValid =
      paystackData?.status === true &&
      tx?.status === 'success' &&
      tx?.currency === 'NGN' &&
      Number(tx?.amount) >= expectedKobo;

    if (!isValid) {
      return NextResponse.json({ error: 'Payment could not be verified', verified: false }, { status: 400 });
    }

    const { error: updateError } = await adminClient
      .from('orders')
      .update({ payment_status: 'paid', payment_reference: String(reference) })
      .eq('id', order_id);

    if (updateError) {
      console.error('verify-payment: failed to mark order paid', updateError);
      return NextResponse.json({ error: 'Payment verified but order update failed' }, { status: 500 });
    }

    const { error: stockError } = await adminClient.rpc('fulfill_order_stock', { p_order_id: order_id });
    if (stockError) {
      console.error('verify-payment: stock fulfillment failed', order_id, stockError);
    }

    // Record that this coupon was used (never blocks the response).
    if (order.coupon_code) {
      try {
        const { data: coupon } = await adminClient
          .from('coupons')
          .select('id, times_used')
          .ilike('code', order.coupon_code)
          .maybeSingle();
        if (coupon) {
          await adminClient
            .from('coupons')
            .update({ times_used: coupon.times_used + 1 })
            .eq('id', coupon.id);
        }
      } catch (couponErr) {
        console.error('verify-payment: failed to record coupon usage', order_id, couponErr);
      }
    }

    // Alert the admin if any product in this order is now low on stock.
    try {
      await checkLowStockAndAlert(adminClient, order_id);
    } catch (lowStockErr) {
      console.error('verify-payment: low stock check failed', order_id, lowStockErr);
    }

    // Send the order confirmation email. This never blocks or fails the
    // payment verification itself — if the email fails to send, the order
    // is still correctly marked paid, we just log it.
    try {
      await sendOrderConfirmationEmail(adminClient, order_id, order.shipping_name, order.shipping_email);
    } catch (emailErr) {
      console.error('verify-payment: confirmation email failed', order_id, emailErr);
    }

    return NextResponse.json({ verified: true });
  } catch (err) {
    console.error('verify-payment error', err);
    return NextResponse.json({ error: 'Unexpected error verifying payment' }, { status: 500 });
  }
}

async function checkLowStockAndAlert(adminClient: any, orderId: string) {
  const { data: orderItems } = await adminClient
    .from('order_items')
    .select('product_id')
    .eq('order_id', orderId);

  const productIds = Array.from(
    new Set((orderItems || []).map((i: { product_id: string | null }) => i.product_id).filter(Boolean))
  );
  if (productIds.length === 0) return;

  const { data: settingsRows } = await adminClient
    .from('site_settings')
    .select('key, value')
    .in('key', ['low_stock_threshold', 'business_email']);

  const settings: Record<string, string> = {};
  (settingsRows || []).forEach((s: { key: string; value: string | null }) => {
    settings[s.key] = s.value || '';
  });

  const threshold = Number(settings.low_stock_threshold) || 5;
  const alertEmail = settings.business_email || process.env.GMAIL_USER;
  if (!alertEmail) return;

  const { data: products } = await adminClient
    .from('products')
    .select('id, name, stock')
    .in('id', productIds);

  const lowStockProducts = (products || []).filter((p: { stock: number }) => p.stock <= threshold);
  if (lowStockProducts.length === 0) return;

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) {
    console.error('verify-payment: GMAIL_USER / GMAIL_APP_PASSWORD not configured, skipping low-stock alert');
    return;
  }

  const nodemailer = (await import('nodemailer')).default;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass },
  });

  const rows = lowStockProducts
    .map(
      (p: { name: string; stock: number }) =>
        `<tr><td style="padding:6px 0;">${escapeHtml(p.name)}</td><td style="padding:6px 0;text-align:right;">${p.stock} left</td></tr>`
    )
    .join('');

  await transporter.sendMail({
    from: `"Fave Dazzling Jewels" <${gmailUser}>`,
    to: alertEmail,
    subject: `Low Stock Alert — ${lowStockProducts.length} item${lowStockProducts.length > 1 ? 's' : ''} running low`,
    html: `
      <div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:480px;margin:0 auto;">
        <p><strong>Heads up — some items just dropped to or below your low-stock threshold (${threshold}):</strong></p>
        <table style="width:100%;border-collapse:collapse;margin-top:12px;">${rows}</table>
        <p style="margin-top:20px;">You can update stock and thresholds from the admin dashboard.</p>
      </div>
    `,
  });
}

async function sendOrderConfirmationEmail(
  adminClient: any,
  orderId: string,
  shippingName: string | null,
  shippingEmail: string | null
) {
  if (!shippingEmail) return;

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) {
    console.error('verify-payment: GMAIL_USER / GMAIL_APP_PASSWORD not configured, skipping confirmation email');
    return;
  }

  const { data: order } = await adminClient
    .from('orders')
    .select('id, total, subtotal, delivery_fee, discount_amount, coupon_code, created_at, order_items(product_name, quantity, unit_price)')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) return;

  const nodemailer = (await import('nodemailer')).default;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass },
  });

  const formatNaira = (amount: number) =>
    '\u20A6' + new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(amount);

  const orderRef = String(order.id).slice(0, 8).toUpperCase();
  const firstName = (shippingName || '').split(' ')[0] || 'there';
  const items = (order.order_items || []) as { product_name: string; quantity: number; unit_price: number }[];

  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;">${escapeHtml(item.product_name)} &times; ${item.quantity}</td>
          <td style="padding:8px 0;text-align:right;">${formatNaira(item.unit_price * item.quantity)}</td>
        </tr>`
    )
    .join('');

  await transporter.sendMail({
    from: `"Fave Dazzling Jewels" <${gmailUser}>`,
    to: shippingEmail,
    subject: `Order Confirmed — #${orderRef}`,
    html: `
      <div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:480px;margin:0 auto;">
        <p>Hi ${escapeHtml(firstName)},</p>
        <p><strong>Thank you for your order!</strong> We've received your payment and your order is being prepared.</p>
        <p style="color:#666;font-size:13px;">Order reference: <strong>#${orderRef}</strong></p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          ${itemRows}
          <tr>
            <td style="padding:8px 0;border-top:1px solid #ddd;">Subtotal</td>
            <td style="padding:8px 0;border-top:1px solid #ddd;text-align:right;">${formatNaira(order.subtotal)}</td>
          </tr>
          ${
            order.discount_amount > 0
              ? `<tr>
                  <td style="padding:4px 0;">Discount${order.coupon_code ? ` (${escapeHtml(order.coupon_code)})` : ''}</td>
                  <td style="padding:4px 0;text-align:right;">-${formatNaira(order.discount_amount)}</td>
                </tr>`
              : ''
          }
          <tr>
            <td style="padding:4px 0;">Delivery</td>
            <td style="padding:4px 0;text-align:right;">${order.delivery_fee ? formatNaira(order.delivery_fee) : 'TBC'}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-weight:bold;border-top:1px solid #ddd;">Total</td>
            <td style="padding:8px 0;font-weight:bold;border-top:1px solid #ddd;text-align:right;">${formatNaira(order.total)}</td>
          </tr>
        </table>
        <p style="margin-top:24px;">We'll notify you again once your order ships. If you have any questions, just reply to this email.</p>
        <p style="margin-top:24px;">&mdash; Fave Dazzling Jewels</p>
      </div>
    `,
  });
}

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
