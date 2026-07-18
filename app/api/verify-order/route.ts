import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Verifies that a claimed order number actually exists, and belongs to the
// email address the person is submitting the claim with — before the
// Shipping & Returns form will accept a claim.
//
// No login is required to submit a claim (guests can too), so this route
// can't check "does this order belong to the signed-in user." Instead it
// uses the service-role key to look the order up directly and match it
// against the shipping email on file. It never returns anything about the
// order beyond a yes/no + the name on file, so it can't be used to fish for
// other customers' order details.

export async function POST(req: NextRequest) {
  try {
    const { orderNumber, email } = await req.json();
    if (!orderNumber?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Order number and email are required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server is not configured (missing SUPABASE_SERVICE_ROLE_KEY).' },
        { status: 500 }
      );
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Order numbers shown to customers are the first 8 characters of the
    // order's UUID (see #A1B2C3D4 in My Account / Admin Orders).
    const prefix = orderNumber.trim().replace(/^#/, '');

    const { data: matches, error } = await adminClient.rpc('find_order_by_prefix_and_email', {
      p_prefix: prefix,
      p_email: email.trim(),
    });

    if (error) {
      console.error('verify-order error', error);
      return NextResponse.json({ error: 'Unexpected error verifying order' }, { status: 500 });
    }

    const order = matches?.[0];
    if (!order) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({ valid: true, name: order.shipping_name });
  } catch (err) {
    console.error('verify-order error', err);
    return NextResponse.json({ error: 'Unexpected error verifying order' }, { status: 500 });
  }
}