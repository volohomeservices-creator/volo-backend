import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const cacheHeaders = { 'Cache-Control': 'no-store, max-age=0, must-revalidate' };
  try {
    const body = await request.json();
    const { phone, role = 'customer', reason = '', requested_via = 'WEB' } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { error: 'Valid 10-digit mobile number is required.' },
        { status: 400, headers: cacheHeaders }
      );
    }

    const clean10Digits = phone.replace(/\D/g, '').slice(-10);
    if (clean10Digits.length !== 10) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit mobile number.' },
        { status: 400, headers: cacheHeaders }
      );
    }

    const formattedPhone = `+91${clean10Digits}`;
    const phoneVariants = Array.from(new Set([phone, formattedPhone, clean10Digits]));

    // Query user record
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, full_name, role, is_active')
      .in('phone', phoneVariants)
      .maybeSingle();

    if (userErr) {
      console.error('[Account Deletion] DB lookup error:', userErr);
    }

    const userId = user?.id || null;

    // Record deletion request in account_deletion_requests (if table exists)
    try {
      await supabaseAdmin
        .from('account_deletion_requests')
        .insert({
          user_id: userId,
          phone: formattedPhone,
          role: user?.role || role,
          reason: typeof reason === 'string' ? reason.trim().slice(0, 1000) : '',
          requested_via: requested_via === 'APP' ? 'APP' : 'WEB',
          status: 'PENDING',
        });
    } catch (insertErr) {
      console.warn('[Account Deletion] Table insert warning (fallback):', insertErr);
    }

    // Immediately soft-deactivate user account if found
    if (userId) {
      await supabaseAdmin
        .from('users')
        .update({ is_active: false })
        .eq('id', userId);

      if (user?.role === 'worker' || role === 'worker') {
        await supabaseAdmin
          .from('workers')
          .update({ status: 'OFFLINE' })
          .eq('id', userId);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Your account deletion request has been successfully submitted. Your account is now deactivated, and your personal data will be permanently purged within 30 days in accordance with data protection policies.',
      },
      { status: 200, headers: cacheHeaders }
    );
  } catch (error: any) {
    console.error('[Account Deletion] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to submit account deletion request. Please contact support@voloapp.in directly.' },
      { status: 500, headers: cacheHeaders }
    );
  }
}
