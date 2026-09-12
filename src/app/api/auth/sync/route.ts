import { z } from 'zod';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase-admin';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';
const supabaseAdmin: any = supabaseAdminOriginal;
import { createSessionCookie } from '@/lib/session';
import { serialize } from 'cookie';

export async function POST(request: Request) {
  try {
    const { data: body, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;
    const { idToken, role, ref_code } = body || {};

    if (!idToken || !role) {
      return NextResponse.json({ error: 'Missing credentials (idToken or role)' }, { status: 400 });
    }

    if (role !== 'customer' && role !== 'worker') {
      return NextResponse.json({ error: 'UNAUTHORIZED_ROLE' }, { status: 400 });
    }

    // 1. Verify Firebase ID Token
    let firebase_uid: string;
    let rawPhone: string;
    try {
      const decoded = await verifyFirebaseToken(idToken);
      firebase_uid = decoded.uid;
      rawPhone = decoded.phone_number;
    } catch (err: any) {
      console.error('[/api/auth/sync] Firebase Token verification error:', err);
      return NextResponse.json({ error: 'FIREBASE_TOKEN_INVALID', details: err?.message }, { status: 401 });
    }

    if (!rawPhone) {
      return NextResponse.json({ error: 'INVALID_PHONE' }, { status: 400 });
    }

    const clean10Digits = rawPhone.replace(/\D/g, '').slice(-10);
    const formattedPhone = `+91${clean10Digits}`;
    const phoneVariants = Array.from(new Set([rawPhone, formattedPhone, clean10Digits]));

    // 2. Query Existing User by firebase_uid OR phone number
    let { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('firebase_uid', firebase_uid)
      .maybeSingle();

    if (!existingUser) {
      const { data: userByPhone } = await supabaseAdmin
        .from('users')
        .select('*')
        .in('phone', phoneVariants)
        .maybeSingle();

      if (userByPhone) {
        existingUser = userByPhone;
        // Link firebase_uid to this user
        await supabaseAdmin
          .from('users')
          .update({ firebase_uid, is_active: true })
          .eq('id', userByPhone.id);
      }
    }

    let user_id = '';
    let isNewUser = false;
    let current_full_name = '';
    let is_active = true;

    if (!existingUser) {
      // Create fresh user record
      const { data: newUser, error: insertErr } = await supabaseAdmin
        .from('users')
        .insert({
          firebase_uid,
          phone: formattedPhone,
          role,
          is_active: true
        })
        .select('*')
        .single();

      if (insertErr || !newUser) {
        console.error('[/api/auth/sync] Failed to insert new user:', insertErr);
        return NextResponse.json({
          error: 'Failed to create user record',
          details: insertErr?.message
        }, { status: 500 });
      }

      isNewUser = true;
      user_id = newUser.id;
      is_active = newUser.is_active;
      current_full_name = newUser.full_name || '';

      // If worker, initialize workers table
      if (role === 'worker') {
        try {
          await supabaseAdmin
            .from('workers')
            .upsert({
              id: user_id,
              status: 'OFFLINE',
              kyc_status: 'PENDING'
            }, { onConflict: 'id' });
        } catch (wErr) {
          console.warn('[/api/auth/sync] Non-fatal worker initialization notice:', wErr);
        }
      }

      // Process referral code if provided on signup
      if (ref_code && typeof ref_code === 'string') {
        try {
          const { data: refCodeRow } = await supabaseAdmin
            .from('referral_codes')
            .select('user_id, role')
            .eq('referral_code', ref_code.trim().toUpperCase())
            .eq('active', true)
            .maybeSingle();

          if (refCodeRow && refCodeRow.user_id !== user_id) {
            const { data: settings } = await supabaseAdmin
              .from('referral_settings')
              .select('referrer_reward')
              .eq('role', refCodeRow.role)
              .eq('active', true)
              .maybeSingle();

            await supabaseAdmin
              .from('referrals')
              .insert({
                referrer_id: refCodeRow.user_id,
                referred_user_id: user_id,
                referral_code: ref_code.trim().toUpperCase(),
                role: refCodeRow.role,
                status: 'PENDING',
                reward_amount: settings?.referrer_reward || 500,
              });
          }
        } catch (refErr) {
          console.warn('Referral processing non-fatal notice:', refErr);
        }
      }
    } else {
      user_id = existingUser.id;
      is_active = existingUser.is_active !== false;
      current_full_name = existingUser.full_name || '';

      // If existing user role differs, update to selected role
      if (existingUser.role !== role) {
        await supabaseAdmin
          .from('users')
          .update({ role })
          .eq('id', user_id);
      }

      // If logging in as worker, ensure worker row exists
      if (role === 'worker') {
        try {
          await supabaseAdmin
            .from('workers')
            .upsert({
              id: user_id,
              status: 'OFFLINE',
              kyc_status: 'PENDING'
            }, { onConflict: 'id' });
        } catch (_) {}
      }
    }

    // 3. Verify Account Status
    if (!is_active) {
      return NextResponse.json({ error: 'ACCOUNT_BLOCKED' }, { status: 403 });
    }

    // 4. Calculate Redirection
    let redirectTo = '';
    if (role === 'customer') {
      redirectTo = isNewUser || !current_full_name ? '/customer/onboarding' : '/customer/dashboard';
    } else {
      // Worker
      const { data: workerProfile } = await supabaseAdmin
        .from('workers')
        .select('kyc_status')
        .eq('id', user_id)
        .maybeSingle();

      if (workerProfile?.kyc_status === 'REJECTED') {
        return NextResponse.json({ error: 'KYC_REJECTED' }, { status: 403 });
      }

      redirectTo = workerProfile?.kyc_status === 'APPROVED' ? '/worker/dashboard' : '/worker/kyc';
    }

    // 5. Generate and Set HttpOnly Session Cookie
    const sessionCookie = await createSessionCookie({
      firebase_uid,
      role,
      user_id
    });

    const serializedCookie = serialize('volo_session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    const existingPinHash = existingUser ? existingUser.pin_hash : null;

    const response = NextResponse.json({
      success: true,
      isNewUser,
      redirectTo,
      user: {
        id: user_id,
        role,
        full_name: current_full_name,
        phone: formattedPhone
      },
      pinSet: !!existingPinHash,
      promptPinSetup: !existingPinHash
    });

    response.headers.set('Set-Cookie', serializedCookie);
    return response;

  } catch (error: any) {
    console.error('[/api/auth/sync] Unhandled Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error?.message || String(error)
    }, { status: 500 });
  }
}
