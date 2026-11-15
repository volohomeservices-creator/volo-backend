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

    // Check if there is already a PENDING request
    const { data: existingReq } = await supabaseAdmin
      .from('account_deletion_requests')
      .select('id, status')
      .or(`phone.eq.${formattedPhone}${userId ? `,user_id.eq.${userId}` : ''}`)
      .eq('status', 'PENDING')
      .maybeSingle();

    let newReqId = existingReq?.id;

    if (!existingReq) {
      // Record deletion request in account_deletion_requests
      try {
        const { data: inserted } = await supabaseAdmin
          .from('account_deletion_requests')
          .insert({
            user_id: userId,
            phone: formattedPhone,
            role: user?.role || role,
            reason: typeof reason === 'string' ? reason.trim().slice(0, 1000) : '',
            requested_via: requested_via === 'APP' ? 'APP' : 'WEB',
            status: 'PENDING',
          })
          .select('id')
          .single();
        newReqId = inserted?.id;
      } catch (insertErr) {
        console.warn('[Account Deletion] Table insert warning (fallback):', insertErr);
      }
    }

    // Alert all admins via notifications
    try {
      const { data: admins } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        const displayName = user?.full_name || formattedPhone;
        const notifInserts = admins.map((admin: any) => ({
          user_id: admin.id,
          type: 'ADMIN_BROADCAST',
          title: '⚠️ Account Deactivation Request',
          body: `User ${displayName} (${user?.role || role}) requested account deactivation. Pending admin approval.`,
          data: { type: 'ACCOUNT_DELETION_REQUEST', requestId: newReqId, phone: formattedPhone, role: user?.role || role }
        }));
        await supabaseAdmin.from('notifications').insert(notifInserts);
      }
    } catch (notifErr) {
      console.warn('Failed to notify admins of deactivation request:', notifErr);
    }

    // Account remains active until explicit admin approval!
    return NextResponse.json(
      {
        success: true,
        pending: true,
        message: 'Your account deactivation request has been successfully submitted to the admin team for review. Your account will remain active until approved by an administrator.',
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
