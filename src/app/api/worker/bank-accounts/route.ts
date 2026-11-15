import { z } from 'zod';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { logAuditAction } from '@/lib/audit';
import { AuditAction } from '@/types';
import { dispatchNotification } from '@/lib/notification-dispatcher';
import { encryptBankAccount, decryptBankAccount } from '@/lib/settlement-engine';

export async function GET(request: Request) {
  try {
    const session = await requireRole(request, 'worker');
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch the worker's primary bank account
    let { data, error } = await supabaseAdmin
      .from('worker_bank_accounts')
      .select('id, worker_id, account_holder_name, bank_name, branch, account_type, account_last_four, ifsc_code, upi_id, is_verified, verification_status, is_primary, created_at, updated_at')
      .eq('worker_id', session.user_id)
      .eq('is_primary', true)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    // Fallback if no account has is_primary=true yet
    if (!data) {
      const { data: fallback } = await supabaseAdmin
        .from('worker_bank_accounts')
        .select('id, worker_id, account_holder_name, bank_name, branch, account_type, account_last_four, ifsc_code, upi_id, is_verified, verification_status, is_primary, created_at, updated_at')
        .eq('worker_id', session.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      data = fallback;
    }

    if (!data) return NextResponse.json({ account: null });

    const rawUpi = (data as any).upi_id || (data.branch?.startsWith('UPI:') ? data.branch.replace('UPI:', '').trim() : '');

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
        upi_id: rawUpi || null,
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
    const { data: existingAccount } = await supabaseAdmin
      .from('worker_bank_accounts')
      .select('id, ifsc_code, account_last_four, account_number_encrypted, is_verified, verification_status')
      .eq('worker_id', session.user_id)
      .maybeSingle();

    // Optional UPI VPA
    const rawUpi = (body.upi_id || '').toString().trim();
    const isUpiValid = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(rawUpi);

    let newAccount: any = null;

    if (existingAccount) {
      let isSameAccount = false;
      try {
        const existingDecrypted = decryptBankAccount(existingAccount.account_number_encrypted);
        if (existingDecrypted === cleanAccountNo && existingAccount.ifsc_code === cleanIfsc) {
          isSameAccount = true;
        }
      } catch (e) {
        if (existingAccount.account_last_four === lastFour && existingAccount.ifsc_code === cleanIfsc) {
          isSameAccount = true;
        }
      }

      const updatePayload: any = {
        account_holder_name: rawHolder,
        bank_name: resolvedBankName,
        branch: isUpiValid ? `UPI:${rawUpi}` : resolvedBranch,
        account_type: cleanAccountType,
        is_primary: true,
        updated_at: new Date().toISOString()
      };
      if (isUpiValid) {
        updatePayload.upi_id = rawUpi;
      }

      if (!isSameAccount) {
        updatePayload.account_number_encrypted = encrypted;
        updatePayload.account_last_four = lastFour;
        updatePayload.ifsc_code = cleanIfsc;
        updatePayload.is_verified = false;
        updatePayload.verification_status = 'PENDING';
        updatePayload.beneficiary_id = null;
        updatePayload.provider_fund_account_id = null;
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('worker_bank_accounts')
        .update(updatePayload)
        .eq('id', existingAccount.id)
        .select('id, worker_id, account_holder_name, bank_name, branch, account_type, account_last_four, ifsc_code, is_verified, verification_status, is_primary, created_at')
        .single();

      if (updateError) {
        console.error('[Bank Account Update Error]:', updateError.message);
        return NextResponse.json({ error: 'Failed to update bank account.' }, { status: 500 });
      }
      newAccount = updated;
    } else {
      const insertPayload: any = {
        worker_id: session.user_id,
        account_holder_name: rawHolder,
        bank_name: resolvedBankName,
        branch: isUpiValid ? `UPI:${rawUpi}` : resolvedBranch,
        account_type: cleanAccountType,
        account_number_encrypted: encrypted,
        account_last_four: lastFour,
        ifsc_code: cleanIfsc,
        is_verified: false,
        verification_status: 'PENDING',
        is_primary: true,
        updated_at: new Date().toISOString()
      };
      if (isUpiValid) {
        insertPayload.upi_id = rawUpi;
      }

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('worker_bank_accounts')
        .insert(insertPayload)
        .select('id, worker_id, account_holder_name, bank_name, branch, account_type, account_last_four, ifsc_code, is_verified, verification_status, is_primary, created_at')
        .single();

      if (insertError) {
        console.error('[Bank Account Save Error]:', insertError.message);
        return NextResponse.json({ error: 'Failed to record bank account. Please check your details.' }, { status: 500 });
      }
      newAccount = inserted;
    }

    // Sync with workers table so KYC page and admin worker view stay 100% updated
    try {
      await supabaseAdmin
        .from('workers')
        .update({
          bank_account_name: rawHolder,
          bank_account_number: cleanAccountNo,
          bank_ifsc: cleanIfsc,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user_id);
    } catch (syncErr) {
      console.error('[Worker Bank Sync Error]:', syncErr);
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
        upi_id: isUpiValid ? rawUpi : null,
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
          body: `${rawHolder} has submitted new payout details (${resolvedBankName} •••• ${lastFour}${isUpiValid ? `, UPI: ${rawUpi}` : ''}) for verification.`,
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
        upi_id: isUpiValid ? rawUpi : null,
        is_verified: false,
        verification_status: 'PENDING',
        is_primary: true
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Quick UPI ID linking / updating handler
export async function PATCH(request: Request) {
  try {
    const session = await requireRole(request, 'worker');
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const rawUpi = (body.upi_id || '').toString().trim();
    if (!rawUpi) {
      return NextResponse.json({ error: 'UPI ID is required.' }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(rawUpi)) {
      return NextResponse.json({ 
        error: 'Invalid UPI ID format. Expected format like mobile@upi, name@okaxis, etc.' 
      }, { status: 400 });
    }

    let { data: account } = await supabaseAdmin
      .from('worker_bank_accounts')
      .select('id, branch')
      .eq('worker_id', session.user_id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ 
        error: 'Please register your bank account first before linking your UPI ID.' 
      }, { status: 400 });
    }

    // Try updating upi_id column
    const { error: upiColErr } = await supabaseAdmin
      .from('worker_bank_accounts')
      .update({ upi_id: rawUpi, updated_at: new Date().toISOString() })
      .eq('id', account.id);

    if (upiColErr) {
      await supabaseAdmin
        .from('worker_bank_accounts')
        .update({ branch: `UPI:${rawUpi}`, updated_at: new Date().toISOString() })
        .eq('id', account.id);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'UPI ID linked successfully for instant settlements.', 
      upi_id: rawUpi 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
