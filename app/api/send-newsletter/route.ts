import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// This route runs server-side only. It never ships to the browser, so it's
// the one safe place to use GMAIL_USER / GMAIL_APP_PASSWORD.
//
// Security: anyone could try to POST to this URL directly, so we verify the
// caller is a signed-in admin (via their Supabase access token) before
// sending a single email. Without this check, this endpoint would be an
// open relay that could spam your whole subscriber list on demand.

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

    const { subject, message } = await req.json();
    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    const { data: subscribers, error: subError } = await supabase
      .from('newsletter_subscribers')
      .select('email');
    if (subError) {
      return NextResponse.json({ error: 'Failed to load subscribers' }, { status: 500 });
    }

    const recipients = (subscribers || []).map((s) => s.email).filter(Boolean);
    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No subscribers to send to' }, { status: 400 });
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

    // Send one-by-one rather than one email with everyone in To/CC, so
    // subscribers never see each other's addresses.
    const results = await Promise.allSettled(
      recipients.map((to) =>
        transporter.sendMail({
          from: `"Fave Dazzling Jewels" <${gmailUser}>`,
          to,
          subject,
          text: message,
          html: `<div style="font-family:sans-serif;font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(
            message
          )}</div>`,
        })
      )
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - sent;

    return NextResponse.json({ sent, failed, total: recipients.length });
  } catch (err) {
    console.error('send-newsletter error', err);
    return NextResponse.json({ error: 'Unexpected error sending newsletter' }, { status: 500 });
  }
}

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
