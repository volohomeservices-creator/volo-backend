import { z } from 'zod';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';
const supabaseAdmin: any = supabaseAdminOriginal;
import { logAuditAction } from '@/lib/audit';
import { AuditAction } from '@/types';
import { dispatchNotification } from '@/lib/notification-dispatcher';

export const dynamic = 'force-dynamic';

// GET /api/admin/wallets - List all captain/worker wallets with user info
export async function GET(request: Request) {
  try {
    const session = await requireRole(request, 'admin');
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from('worker_wallets')
      .select(`
        id,
        worker_id,
        balance,
        minimum_balance,
        is_active,
        created_at,
        updated_at,
        workers:workers!inner (
          id,
          status,
          kyc_status,
          users:users!inner (
            id,
            full_name,
            phone
          )
        )
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Admin Wallets API Error]:', error);
      throw error;
    }

    const formatted = (data || []).map((w: any) => ({
      id: w.id,
      worker_id: w.worker_id,
      full_name: w.workers?.users?.full_name || 'Captain',
      phone: w.workers?.users?.phone || 'N/A',
      balance: Number(w.balance || 0),
      minimum_balance: Number(w.minimum_balance || -500),
      is_active: w.is_active ?? true,
      status: w.workers?.status || 'OFFLINE',
      kyc_status: w.workers?.kyc_status || 'PENDING'
    }));

    return NextResponse.json({ wallets: formatted });
  } catch (error: any) {
    const status = error.status || (error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500);
    return NextResponse.json({ error: error.message }, { status });
  }
}

// POST /api/admin/wallets - Adjust captain wallet balance (Credit / Debit)
export async function POST(request: Request) {
  try {
    const session = await requireRole(request, 'admin');
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const schema = z.object({
      walletId: z.string().optional(),
      workerId: z.string().optional(),
      amount: z.number().positive('Amount must be greater than 0'),
      type: z.enum(['CREDIT', 'DEBIT']),
      reason: z.string().optional()
    });

    const { data: body, errorResponse } = await validateBody(request, schema);
    if (errorResponse) return errorResponse;

    const { walletId, workerId, amount, type, reason } = body;

    let targetWalletQuery = supabaseAdmin.from('worker_wallets').select('*');
    if (walletId) {
      targetWalletQuery = targetWalletQuery.eq('id', walletId);
    } else if (workerId) {
      targetWalletQuery = targetWalletQuery.eq('worker_id', workerId);
    } else {
      return NextResponse.json({ error: 'walletId or workerId is required' }, { status: 400 });
    }

    const { data: wallet, error: fetchErr } = await targetWalletQuery.single();
    if (fetchErr || !wallet) {
      return NextResponse.json({ error: 'Worker wallet not found' }, { status: 404 });
    }

    const prevBal = Number(wallet.balance || 0);
    const delta = type === 'CREDIT' ? amount : -amount;
    const newBal = prevBal + delta;

    // 1. Update wallet balance
    const { error: updateErr } = await supabaseAdmin
      .from('worker_wallets')
      .update({
        balance: newBal,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet.id);

    if (updateErr) throw updateErr;

    // 2. Insert transaction statement record
    const description = reason || (type === 'CREDIT' ? 'Admin Wallet Credit' : 'Admin Wallet Debit');
    await supabaseAdmin.from('wallet_transactions').insert({
      worker_id: wallet.worker_id,
      type: type,
      amount: amount,
      balance_before: prevBal,
      balance_after: newBal,
      description: description
    });

    // 3. Log audit action
    await logAuditAction({
      admin_id: session.user_id,
      action: (type === 'CREDIT' ? 'WALLET_TOPUP' : 'WALLET_DEBIT') as any,
      target_type: 'worker_wallets',
      target_id: wallet.id,
      metadata: { worker_id: wallet.worker_id, prevBal, newBal, amount, type, reason }
    });

    // 4. Notify the worker
    try {
      await dispatchNotification({
        userId: wallet.worker_id,
        type: type === 'CREDIT' ? 'PAYMENT_SUCCESS' : 'SETTLEMENT_PROCESSED',
        title: type === 'CREDIT' ? '🎁 Wallet Credited' : '⚠️ Wallet Balance Adjusted',
        body: type === 'CREDIT'
          ? `₹${amount} has been added to your Captain wallet. New balance: ₹${newBal.toFixed(2)}.`
          : `₹${amount} was adjusted from your Captain wallet. New balance: ₹${newBal.toFixed(2)}.`,
        data: { amount: amount.toString(), newBalance: newBal.toString() }
      });
    } catch (notifErr) {
      console.warn('[Admin Wallets] Failed to dispatch notification:', notifErr);
    }

    return NextResponse.json({
      success: true,
      balance: newBal,
      message: `Successfully ${type === 'CREDIT' ? 'credited' : 'debited'} ₹${amount} to captain wallet.`
    });
  } catch (error: any) {
    console.error('[Admin Wallets POST Error]:', error);
    const status = error.status || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
