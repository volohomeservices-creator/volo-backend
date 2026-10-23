import { z } from 'zod';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { logAuditAction } from '@/lib/audit';
import { AuditAction } from '@/types';

async function handleRemove(request: Request) {
  try {
    const session = await requireSession(request);
    const userId = session.user_id;

    const url = new URL(request.url);
    const queryToken = url.searchParams.get('token') || url.searchParams.get('deviceToken');

    let bodyToken = '';
    try {
      const body = await request.json();
      bodyToken = body.deviceToken || body.token;
    } catch {
      // Body may be empty for DELETE
    }

    const deviceToken = queryToken || bodyToken;

    if (!deviceToken) {
      return NextResponse.json({ error: 'Device token is required' }, { status: 400 });
    }

    // Deactivate device token
    const { error: updateErr } = await supabaseAdmin
      .from('user_devices')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('device_token', deviceToken);

    if (updateErr) {
      throw updateErr;
    }

    // Log Audit Action
    await logAuditAction({
      admin_id: userId,
      action: AuditAction.DEVICE_REMOVED,
      target_type: 'user',
      target_id: userId,
      metadata: { action: 'logout_or_explicit_removal' }
    });

    return NextResponse.json({ success: true, message: 'Device removed successfully' });

  } catch (error: any) {
    console.error('Error removing device:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}

export const POST = handleRemove;
export const DELETE = handleRemove;

