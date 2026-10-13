import { z } from 'zod';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { logAuditAction } from '@/lib/audit';
import { AuditAction } from '@/types';
import { dispatchNotification } from '@/lib/notification-dispatcher';
import { encryptBankAccount } from '@/lib/settlement-engine';

export async function GET(request: Request) {
  try {
    const session = await requireRole(request, 'worker');
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch the worker's primary bank account
    let { data, error } = await supabaseAdmin
      .from('worker_bank_accounts')
      .select('id, worker_id, account_holder_name, bank_name, branch, account_type, account_last_four, ifsc_code, is_verified, verification_status, is_primary, created_at, updated_at')
      .eq('worker_id', session.user_id)
      .eq('is_primary', true)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    // Fallback if no account has is_primary=true yet
    if (!data) {
      const { data: fallback } = await supabaseAdmin
        .from('worker_bank_accounts')
        .select('id, worker_id, account_holder_name, bank_name, branch, account_type, account_last_four, ifsc_code, is_verified, verification_status, is_primary, created_at, updated_at')
        .eq('worker_id', session.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      data = fallback;
    }

    if (!data) return NextResponse.json({ account: null });

    // SECURITY: Full account numbers are NEVER exposed after saving.
    // Display masked format only: •••• 9012
    return NextResponse.json({
      account: {
        id: data.id,
        account_holder_name: data.account_holder_name,
        bank_name: data.bank_name,
        branch: data.branch || '',
        account_type: data.account_type || 'Savings',
        account_last_four: data.account_last_four,
        masked_account_number: `•••• ${data.account_last_four}`,
        ifsc_code: data.ifsc_code,
        is_verified: data.is_verified,
        verification_status: data.verification_status || (data.is_verified ? 'VERIFIED' : 'PENDING'),
        is_primary: data.is_primary ?? true,
        updated_at: data.updated_at
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(request, 'worker');
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: body, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;

    // 1. ACCOUNT HOLDER NAME VALIDATION
    // Allowed: A-Z, a-z, spaces, period, hyphen, apostrophe (2-100 chars)
    const rawHolder = (body.account_holder_name || '').toString().trim().replace(/\s+/g, ' ');
    if (!rawHolder) {
      return NextResponse.json({ error: 'Account Holder Name is required.' }, { status: 400 });
    }
    if (rawHolder.length < 2 || rawHolder.length > 100) {
      return NextResponse.json({ error: 'Account Holder Name must be between 2 and 100 characters.' }, { status: 400 });
    }
    if (!/^[a-zA-Z\s.\-']+$/.test(rawHolder) || !/[a-zA-Z]/.test(rawHolder)) {
      return NextResponse.json({ 
        error: 'Account Holder Name contains invalid characters. Numbers, emojis, and special symbols are not allowed.' 
      }, { status: 400 });
    }

    // 2. BANK ACCOUNT NUMBER VALIDATION
    // Digits only, 9 to 18 digits
    const cleanAccountNo = (body.account_number || '').toString().trim();
    if (!cleanAccountNo) {
      return NextResponse.json({ error: 'Bank Account Number is required.' }, { status: 400 });
    }
    if (!/^\d{9,18}$/.test(cleanAccountNo)) {
      return NextResponse.json({ 
        error: 'Invalid Bank Account Number. Must be between 9 and 18 digits (numbers only, no spaces or hyphens).' 
      }, { status: 400 });
    }

    // 3. CONFIRM BANK ACCOUNT NUMBER VALIDATION
    const cleanConfirm = (body.confirm_account_number || '').toString().trim();
    if (!cleanConfirm) {
      return NextResponse.json({ error: 'Confirm Bank Account Number is required.' }, { status: 400 });
    }
    if (cleanAccountNo !== cleanConfirm) {
      return NextResponse.json({ error: 'Bank account numbers do not match.' }, { status: 400 });
    }

    // 4. IFSC CODE VALIDATION & VERIFICATION
    const cleanIfsc = (body.ifsc_code || '').toString().trim().toUpperCase();
    if (!cleanIfsc) {
      return NextResponse.json({ error: 'IFSC Code is required.' }, { status: 400 });
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      return NextResponse.json({ 
        error: 'Invalid IFSC format. Expected 11 characters starting with 4 letters followed by 0 (e.g. HDFC0001234).' 
      }, { status: 400 });
    }

    // Lookup and verify IFSC existence directly
    let resolvedBankName = (body.bank_name || '').toString().trim();
    let resolvedBranch = (body.branch || '').toString().trim();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const ifscRes = await fetch(`https://ifsc.razorpay.com/${cleanIfsc}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (ifscRes.status === 404) {
        return NextResponse.json({ 
          error: `IFSC code "${cleanIfsc}" does not exist. Please check your bank passbook/cheque.` 
        }, { status: 400 });
      }

      if (ifscRes.ok) {
        const ifscData = await ifscRes.json();
        resolvedBankName = ifscData.BANK || resolvedBankName || 'Bank';
        resolvedBranch = ifscData.BRANCH || resolvedBranch || 'Branch';
      }
    } catch (ifscErr) {
      // If external lookup timed out, fallback to client-sent bank name if present
      if (!resolvedBankName) resolvedBankName = 'Scheduled Commercial Bank';
    }

    // 5. ACCOUNT TYPE (Savings or Current)
    const rawAccountType = (body.account_type || 'Savings').toString().trim();
    const cleanAccountType = ['Savings', 'Current'].includes(rawAccountType) ? rawAccountType : 'Savings';

    // 6. ENCRYPT SENSITIVE DATA AT REST
    const encrypted = encryptBankAccount(cleanAccountNo);
    const lastFour = cleanAccountNo.slice(-4);

    // 7. EDIT / SINGLE PRIMARY ACCOUNT ENFORCEMENT
    // Ensure existing primary accounts for this worker are set to is_primary = false
    await supabaseAdmin
      .from('worker_bank_accounts')
      .update({ is_primary: false, updated_at: new Date().toISOString() })
      .eq('worker_id', session.user_id);

    // Insert new account record with is_primary = true and status PENDING
    const { data: newAccount, error: insertError } = await supabaseAdmin
      .from('worker_bank_accounts')
      .insert({
        worker_id: session.user_id,
        account_holder_name: rawHolder,
        bank_name: resolvedBankName,
        branch: resolvedBranch,
        account_type: cleanAccountType,
        account_number_encrypted: encrypted,
        account_last_four: lastFour,
        ifsc_code: cleanIfsc,
        is_verified: false,
        verification_status: 'PENDING',
        is_primary: true,
        updated_at: new Date().toISOString()
      })
      .select('id, worker_id, account_holder_name, bank_name, branch, account_type, account_last_four, ifsc_code, is_verified, verification_status, is_primary, created_at')
      .single();

    if (insertError) {
      console.error('[Bank Account Save Error]:', insertError.message);
      return NextResponse.json({ error: 'Failed to record bank account. Please check your details.' }, { status: 500 });
    }

    // 8. AUDIT LOG (NEVER LOG FULL ACCOUNT NUMBERS)
    await logAuditAction({
      admin_id: session.user_id,
      action: AuditAction.BANK_ACCOUNT_ADDED,
      target_type: 'worker_bank_accounts',
      target_id: newAccount.id,
      metadata: {
        bank_name: resolvedBankName,
        account_last_four: lastFour,
        ifsc_code: cleanIfsc,
        account_type: cleanAccountType,
        verification_status: 'PENDING'
      }
    });

    // 9. NOTIFY ADMINS FOR VERIFICATION
    const { data: admins } = await supabaseAdmin.from('users').select('id').eq('role', 'admin');
    if (admins && admins.length > 0) {
      for (const admin of admins) {
        await dispatchNotification({
          userId: admin.id,
          type: 'MANUAL_ASSIGNMENT_CREATED' as any,
          title: 'Partner Bank Account Verification Needed',
          body: `${rawHolder} has submitted new bank account details (${resolvedBankName} •••• ${lastFour}) for verification.`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      account: {
        id: newAccount.id,
        account_holder_name: newAccount.account_holder_name,
        bank_name: newAccount.bank_name,
        branch: newAccount.branch,
        account_type: newAccount.account_type,
        account_last_four: newAccount.account_last_four,
        masked_account_number: `•••• ${newAccount.account_last_four}`,
        ifsc_code: newAccount.ifsc_code,
        is_verified: false,
        verification_status: 'PENDING',
        is_primary: true
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
