import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { createSessionCookie } from '@/lib/session';
import bcryptjs from 'bcryptjs';
import { serialize } from 'cookie';
import { logAuditAction } from '@/lib/audit';
import { AuditAction } from '@/types';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid or missing JSON payload' }, { status: 400 });
    }

    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const { email, password } = parseResult.data;

    // 1. Query Admin profile from Supabase using maybeSingle to prevent single() errors
    const { data: user, error: fetchErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('role', 'admin')
      .maybeSingle();

    if (fetchErr) {
      console.error('[Admin Login DB Error]:', fetchErr);
      return NextResponse.json({ error: 'UNAUTHORIZED_ROLE' }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED_ROLE' }, { status: 401 });
    }

    if (!user.is_active) {
      return NextResponse.json({ error: 'ACCOUNT_BLOCKED' }, { status: 403 });
    }

    if (!user.password_hash) {
      return NextResponse.json({ error: 'ADMIN_WRONG_CREDS' }, { status: 401 });
    }

    // 2. Compare Bcrypt Passwords
    const match = await bcryptjs.compare(password, user.password_hash);
    if (!match) {
      return NextResponse.json({ error: 'ADMIN_WRONG_CREDS' }, { status: 401 });
    }

    // 3. Set Session Cookie
    const sessionCookie = await createSessionCookie({
      firebase_uid: user.firebase_uid || null,
      role: 'admin',
      user_id: user.id
    });

    const serializedCookie = serialize('volo_session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    // Write Audit Log (non-blocking)
    try {
      await logAuditAction({
        admin_id: user.id,
        action: AuditAction.ADMIN_LOGIN,
        target_type: 'user',
        target_id: user.id,
        metadata: { email: user.email }
      });
    } catch (auditErr) {
      console.error('[Admin Login Audit Warning]:', auditErr);
    }

    const response = NextResponse.json({
      success: true,
      redirectTo: '/admin/dashboard'
    });

    response.headers.set('Set-Cookie', serializedCookie);
    return response;
  } catch (error: any) {
    console.error('[Admin Login Server Exception]:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message || String(error)
    }, { status: 500 });
  }
}
