import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUser } from '@/lib/push-server';

const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  shipped: { title: 'Your order has shipped!', body: 'Your Fave Dazzling Jewels order is on its way.' },
  delivered: { title: 'Order delivered', body: 'Your order has been marked as delivered. Enjoy!' },
};

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

    const { order_id, status } = await req.json();
    if (!order_id || !status) {
      return NextResponse.json({ error: 'order_id and status are required' }, { status: 400 });
    }

    const message = STATUS_MESSAGES[status];
    if (!message) {
      return NextResponse.json({ notified: false, reason: 'No notification for this status' });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: order } = await adminClient.from('orders').select('id, user_id').eq('id', order_id).maybeSingle();
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    await sendPushToUser(adminClient, order.user_id, {
      title: message.title,
      body: message.body,
      url: '/account',
    });

    return NextResponse.json({ notified: true });
  } catch (err) {
    console.error('notify-order-status error', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
