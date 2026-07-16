import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// This route runs server-side only, so it's the one safe place to use
// GMAIL_USER / GMAIL_APP_PASSWORD (same credentials as send-newsletter).
// It sends the customer an email whenever an admin moves their
// exchange/return claim to "reviewing" or "resolved".
//
// Security: verify the caller is a signed-in admin (via their Supabase
// access token) before sending anything, so this can't be used as an open
// email relay.

const STATUS_CONTENT: Record<string, { subject: string; heading: string; body: string }> = {
  reviewing: {
    subject: 'Your exchange claim is being reviewed',
    heading: "We're reviewing your claim",
    body: "Good news — our team has picked up your exchange/return claim and is currently reviewing it. We'll follow up again as soon as we've made a decision.",
  },
  resolved: {
    subject: 'Your exchange claim has been resolved',
    heading: 'Your claim has been resolved',
    body: "Your exchange/return claim has been resolved. If we owe you a replacement, we'll be in touch shortly with next steps. If you have any questions, just reply to this email.",
  },
};

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      uid: userData.user.id,
      r: 'admin',
    });
    if (roleError || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { email, name, orderNumber, status } = await req.json();
    if (!email?.trim() || !orderNumber?.trim() || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const content = STATUS_CONTENT[status];
    if (!content) {
      return NextResponse.json({ error: 'Email is only sent for reviewing or resolved statuses' }, { status: 400 });
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    if (!gmailUser || !gmailPass) {
      return NextResponse.json(
        { error: 'Email sending is not configured yet (missing GMAIL_USER / GMAIL_APP_PASSWORD in Vercel).' },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    });

    const firstName = (name || '').split(' ')[0] || 'there';

    await transporter.sendMail({
      from: `"Fave Dazzling Jewels" <${gmailUser}>`,
      to: email,
      subject: content.subject,
      text: `Hi ${firstName},\n\n${content.heading}\n\n${content.body}\n\nOrder reference: ${orderNumber}\n\n— Fave Dazzling Jewels`,
      html: `
        <div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;">
          <p>Hi ${escapeHtml(firstName)},</p>
          <p><strong>${escapeHtml(content.heading)}</strong></p>
          <p>${escapeHtml(content.body)}</p>
          <p style="color:#666;font-size:13px;">Order reference: <strong>${escapeHtml(orderNumber)}</strong></p>
          <p style="margin-top:24px;">&mdash; Fave Dazzling Jewels</p>
        </div>
      `,
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('send-return-status-email error', err);
    return NextResponse.json({ error: 'Unexpected error sending email' }, { status: 500 });
  }
}

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
