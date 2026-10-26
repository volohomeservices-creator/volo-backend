import { z } from 'zod';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { ensureBucketsExist } from '@/lib/storage-setup';
import { encryptBankAccount, decryptBankAccount } from '@/lib/settlement-engine';

export async function GET(request: Request) {
  const cacheHeaders = { 'Cache-Control': 'no-store, max-age=0, must-revalidate' };
  try {
    const session = await requireRole(request, 'worker');
    const workerId = session.user_id;

    // Run bucket initialization checks
    await ensureBucketsExist();

    // Fetch documents metadata
    const { data: documents, error: docsErr } = await supabaseAdmin
      .from('worker_documents')
      .select('*')
      .eq('worker_id', workerId);

    if (docsErr) throw docsErr;

    // Generate signed URLs for documents
    const docsWithUrls = await Promise.all((documents || []).map(async (doc) => {
      let bucket = 'kyc-docs';
      let path = '';

      if (doc.document_type === 'PROFILE_PHOTO') {
        bucket = 'profile-images';
        path = `worker_${workerId}/profile.webp`;
      } else {
        bucket = 'kyc-docs';
        const fileMap: Record<string, string> = {
          AADHAAR_FRONT: 'aadhaar-front.webp',
          AADHAAR_BACK: 'aadhaar-back.webp',
          PAN_CARD: 'pan.webp',
          SELFIE_VERIFICATION: 'selfie.webp',
          EXPERIENCE_CERTIFICATE: 'certificate.webp',
          CERTIFICATE: 'certificate.webp'
        };
        path = `worker_${workerId}/${fileMap[doc.document_type] || 'certificate.webp'}`;
      }

      const { data } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(path, 3600); // 1 hour expiry

      return {
        ...doc,
        signedUrl: data?.signedUrl || null
      };
    }));

    // Fetch overall KYC status
    const { data: kycState, error: kycErr } = await supabaseAdmin
      .from('worker_kyc')
      .select('*')
      .eq('worker_id', workerId)
      .single();

    if (kycErr && kycErr.code !== 'PGRST116') throw kycErr;

    // Fetch user details for name
    const { data: userDetails } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', workerId)
      .single();

    // Fetch bank account details, dob, and worker_id_code from workers table
    const { data: workerData, error: workerErr } = await supabaseAdmin
      .from('workers')
      .select('bank_account_name, bank_account_number, bank_ifsc, dob, worker_id_code')
      .eq('id', workerId)
      .single();

    if (workerErr) throw workerErr;

    // Fetch bank account from worker_bank_accounts (settlement source of truth)
    let { data: primaryBank } = await supabaseAdmin
      .from('worker_bank_accounts')
      .select('id, account_holder_name, bank_name, branch, account_type, account_last_four, ifsc_code, upi_id, is_verified, verification_status, is_primary')
      .eq('worker_id', workerId)
      .eq('is_primary', true)
      .maybeSingle();

    if (!primaryBank) {
      const { data: fallbackBank } = await supabaseAdmin
        .from('worker_bank_accounts')
        .select('id, account_holder_name, bank_name, branch, account_type, account_last_four, ifsc_code, upi_id, is_verified, verification_status, is_primary')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      primaryBank = fallbackBank;
    }

    // Fetch skills from worker_profiles
    const { data: profile } = await supabaseAdmin
      .from('worker_profiles')
      .select('skills')
      .eq('worker_id', workerId)
      .maybeSingle();

    // Fetch active categories (strictly active, ordered, and deduplicated)
    const { data: rawCategories } = await supabaseAdmin
      .from('service_categories')
      .select('id, name, skills')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const seenCategoryNames = new Set<string>();
    const categories: Array<{ id: string; name: string; skills: string[] }> = [];
    (rawCategories || []).forEach((c: any) => {
      const normalized = (c.name || '').trim().toLowerCase();
      if (normalized && !seenCategoryNames.has(normalized)) {
        seenCategoryNames.add(normalized);
        categories.push({
          id: c.id,
          name: c.name.trim(),
          skills: Array.isArray(c.skills) ? c.skills : []
        });
      }
    });

    return NextResponse.json({
      success: true,
      documents: docsWithUrls,
      kycState: kycState || {
        worker_id: workerId,
        aadhaar_status: 'PENDING',
        pan_status: 'PENDING',
        selfie_status: 'PENDING',
        overall_status: 'PENDING',
        remarks: null,
        submitted_at: null
      },
      skills: profile?.skills || [],
      categories: categories || [],
      bankDetails: {
        full_name: userDetails?.full_name || '',
        dob: workerData?.dob || '',
        worker_id_code: workerData?.worker_id_code || '',
        bank_account_name: primaryBank?.account_holder_name || workerData?.bank_account_name || '',
        account_holder_name: primaryBank?.account_holder_name || workerData?.bank_account_name || '',
        bank_name: primaryBank?.bank_name || '',
        branch: primaryBank?.branch || '',
        account_type: primaryBank?.account_type || 'Savings',
        bank_account_number: workerData?.bank_account_number || '',
        account_last_four: primaryBank?.account_last_four || (workerData?.bank_account_number ? workerData.bank_account_number.slice(-4) : ''),
        masked_account_number: primaryBank ? `•••• ${primaryBank.account_last_four}` : (workerData?.bank_account_number ? `•••• ${workerData.bank_account_number.slice(-4)}` : ''),
        bank_ifsc: primaryBank?.ifsc_code || workerData?.bank_ifsc || '',
        ifsc_code: primaryBank?.ifsc_code || workerData?.bank_ifsc || '',
        upi_id: primaryBank?.upi_id || '',
        verification_status: primaryBank?.verification_status || 'PENDING',
        is_verified: primaryBank?.is_verified ?? false
      }
    }, { headers: cacheHeaders });
  } catch (error: any) {
    console.error('Error fetching KYC documents:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500, headers: cacheHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(request, 'worker');
    const workerId = session.user_id;

    // Run bucket initialization checks
    await ensureBucketsExist();

    // Fetch overall kyc status
    const { data: kycState } = await supabaseAdmin
      .from('worker_kyc')
      .select('overall_status')
      .eq('worker_id', workerId)
      .single();

    if (kycState?.overall_status === 'APPROVED') {
      return NextResponse.json(
        { error: 'KYC application is already approved and locked.' },
        { status: 400 }
      );
    }

    const { data: body, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;
    const { document_type, file_url, file_size, mime_type, bankDetails } = body;

    // 1. Handle Bank & Personal Details Upload if sent
    if (bankDetails) {
      const { 
        bank_account_name, 
        account_holder_name,
        bank_account_number, 
        confirm_account_number,
        bank_ifsc, 
        ifsc_code,
        bank_name,
        branch,
        account_type,
        upi_id,
        full_name, 
        dob, 
        skills 
      } = bankDetails;

      const rawHolder = (account_holder_name || bank_account_name || full_name || '').toString().trim().replace(/\s+/g, ' ');
      const cleanAccountNo = (bank_account_number || '').toString().trim();
      const cleanIfsc = (ifsc_code || bank_ifsc || '').toString().trim().toUpperCase();

      // If bank account is supplied, enforce strict validation and save to worker_bank_accounts
      if (cleanAccountNo || cleanIfsc) {
        if (!cleanAccountNo || !/^\d{9,18}$/.test(cleanAccountNo)) {
          return NextResponse.json({ 
            error: 'Invalid Bank Account Number. Must be between 9 and 18 digits (numbers only).' 
          }, { status: 400 });
        }

        if (confirm_account_number && cleanAccountNo !== confirm_account_number.toString().trim()) {
          return NextResponse.json({ 
            error: 'Bank account numbers do not match.' 
          }, { status: 400 });
        }

        if (!cleanIfsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
          return NextResponse.json({ 
            error: 'Invalid IFSC format. Expected 11 characters starting with 4 letters followed by 0 (e.g. HDFC0001234).' 
          }, { status: 400 });
        }

        if (rawHolder && (!/^[a-zA-Z\s.\-']+$/.test(rawHolder) || !/[a-zA-Z]/.test(rawHolder))) {
          return NextResponse.json({ 
            error: 'Account Holder Name contains invalid characters. Numbers, emojis, and symbols are not allowed.' 
          }, { status: 400 });
        }

        // Resolve Bank Name & Branch if not provided
        let resolvedBankName = (bank_name || '').toString().trim();
        let resolvedBranch = (branch || '').toString().trim();
        if (!resolvedBankName) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const ifscRes = await fetch(`https://ifsc.razorpay.com/${cleanIfsc}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (ifscRes.ok) {
              const ifscData = await ifscRes.json();
              resolvedBankName = ifscData.BANK || 'Bank';
              resolvedBranch = ifscData.BRANCH || 'Branch';
            }
          } catch (ifscErr) {
            if (!resolvedBankName) resolvedBankName = 'Bank';
          }
        }

        const cleanAccountType = ['Savings', 'Current'].includes(account_type) ? account_type : 'Savings';
        const rawUpi = (upi_id || '').toString().trim();
        const isUpiValid = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(rawUpi);

        // Encrypt account number
        const encrypted = encryptBankAccount(cleanAccountNo);
        const lastFour = cleanAccountNo.slice(-4);

        // Single Account Enforcement: Check if worker already has a bank account record
        const { data: existingAccount } = await supabaseAdmin
          .from('worker_bank_accounts')
          .select('id, ifsc_code, account_last_four, account_number_encrypted, is_verified, verification_status')
          .eq('worker_id', workerId)
          .maybeSingle();

        if (existingAccount) {
          // Check if the account details are identical
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
            account_holder_name: rawHolder || 'Partner',
            bank_name: resolvedBankName || 'Bank',
            branch: isUpiValid ? `UPI:${rawUpi}` : (resolvedBranch || 'Branch'),
            account_type: cleanAccountType,
            is_primary: true,
            updated_at: new Date().toISOString()
          };
          if (isUpiValid) {
            updatePayload.upi_id = rawUpi;
          }

          if (!isSameAccount) {
            // Details changed: update encrypted number and reset verification to PENDING
            updatePayload.account_number_encrypted = encrypted;
            updatePayload.account_last_four = lastFour;
            updatePayload.ifsc_code = cleanIfsc;
            updatePayload.is_verified = false;
            updatePayload.verification_status = 'PENDING';
            updatePayload.beneficiary_id = null;
            updatePayload.provider_fund_account_id = null;
          }

          const { error: bankUpdateErr } = await supabaseAdmin
            .from('worker_bank_accounts')
            .update(updatePayload)
            .eq('id', existingAccount.id);

          if (bankUpdateErr) {
            console.error('[KYC Bank Account Update Error]:', bankUpdateErr.message);
          }
        } else {
          // No record exists: insert a single record
          const bankInsertPayload: any = {
            worker_id: workerId,
            account_holder_name: rawHolder || 'Partner',
            bank_name: resolvedBankName || 'Bank',
            branch: isUpiValid ? `UPI:${rawUpi}` : (resolvedBranch || 'Branch'),
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
            bankInsertPayload.upi_id = rawUpi;
          }

          const { error: bankAccErr } = await supabaseAdmin
            .from('worker_bank_accounts')
            .insert(bankInsertPayload);

          if (bankAccErr) {
            console.error('[KYC Bank Account Insert Error]:', bankAccErr.message);
          }
        }
      }

      const updateData: any = {
        bank_account_name: rawHolder || bank_account_name,
        bank_account_number: cleanAccountNo || bank_account_number,
        bank_ifsc: cleanIfsc || bank_ifsc
      };
      if (dob) {
        updateData.dob = dob;
      }

      // Generate worker_id_code if not already set
      const { data: currentWorker } = await supabaseAdmin
        .from('workers')
        .select('worker_id_code')
        .eq('id', workerId)
        .single();
      
      if (!currentWorker?.worker_id_code && full_name && dob) {
        let attempts = 0;
        let isUnique = false;
        const specialChars = ['@', '#', '$', '%', '&', '*', '!'];
        const digits = '0123456789';

        while (!isUnique && attempts < 100) {
          let firstName = 'VOLO';
          const parts = full_name.trim().split(/\s+/);
          if (parts[0]) {
            firstName = parts[0].toUpperCase().replace(/[^A-Z]/g, '');
          }
          firstName = (firstName + 'XXXX').slice(0, 4);

          let dobYear = '1995';
          const dobParts = dob.split('-');
          if (dobParts[0] && dobParts[0].length === 4) {
            dobYear = dobParts[0];
          }

          const char1 = specialChars[Math.floor(Math.random() * specialChars.length)];
          const char2 = digits[Math.floor(Math.random() * digits.length)];
          const candidateCode = `${firstName}${dobYear}${char1}${char2}`;

          const { data: existing } = await supabaseAdmin
            .from('workers')
            .select('id')
            .eq('worker_id_code', candidateCode)
            .maybeSingle();

          if (!existing) {
            updateData.worker_id_code = candidateCode;
            isUnique = true;
          }
          attempts++;
        }
      }

      const { error: updateBankErr } = await supabaseAdmin
        .from('workers')
        .update(updateData)
        .eq('id', workerId);

      if (updateBankErr) throw updateBankErr;

      // Update full_name in users table
      if (full_name) {
        const { error: updateUserErr } = await supabaseAdmin
          .from('users')
          .update({ full_name })
          .eq('id', workerId);
        if (updateUserErr) throw updateUserErr;
      }

      // Save/Update skills in worker_profiles
      if (Array.isArray(skills) && skills.length > 0) {
        const cleanSkills = skills.map((s: any) => String(s).trim()).filter(Boolean);

        const { error: profileErr } = await supabaseAdmin
          .from('worker_profiles')
          .upsert({
            worker_id: workerId,
            skills: cleanSkills,
            city: 'Bangalore',
            state: 'Karnataka',
            updated_at: new Date().toISOString()
          }, { onConflict: 'worker_id' });

        if (profileErr) throw profileErr;

        // Match the trade/skills to the active service category ID
        try {
          const { data: dbCategories } = await supabaseAdmin
            .from('service_categories')
            .select('id, name, skills')
            .eq('is_active', true);

          let matchedCategoryId: string | null = null;
          if (dbCategories && dbCategories.length > 0) {
            for (const cat of dbCategories) {
              const catNameLower = cat.name.toLowerCase().trim();
              const hasMatchingSkill = cleanSkills.some((s: string) => {
                const sLower = s.toLowerCase().trim();
                return sLower === catNameLower ||
                  sLower.includes(catNameLower) ||
                  catNameLower.includes(sLower) ||
                  (sLower.length >= 4 && catNameLower.length >= 4 && sLower.slice(0, 4) === catNameLower.slice(0, 4)) ||
                  (Array.isArray(cat.skills) && cat.skills.some((cs: string) => cs.toLowerCase().trim() === sLower));
              });

              if (hasMatchingSkill) {
                matchedCategoryId = cat.id;
                break;
              }
            }
          }

          if (matchedCategoryId) {
            const { error: workerCatErr } = await supabaseAdmin
              .from('workers')
              .update({
                service_category_ids: [matchedCategoryId],
                updated_at: new Date().toISOString()
              })
              .eq('id', workerId);

            if (workerCatErr) {
              console.error('[KYC API] Failed to update worker service_category_ids:', workerCatErr);
            }
          }
        } catch (err) {
          console.error('[KYC API] Exception matching category:', err);
        }
      }

      return NextResponse.json({ success: true, message: 'Bank and personal details updated.' });
    }

    // 2. Otherwise process Document Upload
    if (!document_type || !file_url || !file_size) {
      return NextResponse.json({ error: 'Missing document parameters' }, { status: 400 });
    }

    const validTypes = [
      'AADHAAR_FRONT',
      'AADHAAR_BACK',
      'PAN_CARD',
      'PROFILE_PHOTO',
      'SELFIE_VERIFICATION',
      'EXPERIENCE_CERTIFICATE',
      'CERTIFICATE'
    ];
    const requiredTypes = [
      'AADHAAR_FRONT',
      'AADHAAR_BACK',
      'PAN_CARD',
      'PROFILE_PHOTO',
      'SELFIE_VERIFICATION',
      'EXPERIENCE_CERTIFICATE'
    ];
    if (!validTypes.includes(document_type)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    // Upsert into worker_documents
    const { error: docUpsertErr } = await supabaseAdmin
      .from('worker_documents')
      .upsert({
        worker_id: workerId,
        document_type,
        file_url,
        file_size,
        mime_type: mime_type || 'image/webp',
        status: 'PENDING',
        uploaded_at: new Date().toISOString()
      }, {
        onConflict: 'worker_id,document_type'
      });

    if (docUpsertErr) throw docUpsertErr;

    // Sync URLs to main workers table for compatibility
    let syncData: any = {};
    if (document_type === 'AADHAAR_FRONT') syncData.aadhar_front_url = file_url;
    if (document_type === 'AADHAAR_BACK') syncData.aadhar_back_url = file_url;
    if (document_type === 'PAN_CARD') syncData.pan_url = file_url;
    if (document_type === 'SELFIE_VERIFICATION') syncData.selfie_url = file_url;
    if (document_type === 'EXPERIENCE_CERTIFICATE' || document_type === 'CERTIFICATE') {
      syncData.certificate_url = file_url;
    }

    if (Object.keys(syncData).length > 0) {
      const { error: syncErr } = await supabaseAdmin
        .from('workers')
        .update(syncData)
        .eq('id', workerId);
      if (syncErr) throw syncErr;
    }

    // Update matching fields in worker_kyc status tracker
    let kycStatusUpdate: any = {};
    if (document_type === 'AADHAAR_FRONT' || document_type === 'AADHAAR_BACK') {
      // Aadhaar is approved when both front and back are approved
      kycStatusUpdate.aadhaar_status = 'PENDING';
    }
    if (document_type === 'PAN_CARD') {
      kycStatusUpdate.pan_status = 'PENDING';
    }
    if (document_type === 'SELFIE_VERIFICATION') {
      kycStatusUpdate.selfie_status = 'PENDING';
    }
    if (document_type === 'EXPERIENCE_CERTIFICATE' || document_type === 'CERTIFICATE') {
      kycStatusUpdate.certificate_status = 'PENDING';
    }

    // Get all uploaded document types for this worker
    const { data: currentDocs } = await supabaseAdmin
      .from('worker_documents')
      .select('document_type')
      .eq('worker_id', workerId);

    const uploadedTypes = currentDocs?.map(d => d.document_type) || [];
    
    // Check if all requirements including experience/certificate are met
    const hasAllDocs = requiredTypes.every(type => {
      if (type === 'EXPERIENCE_CERTIFICATE') {
        return (
          uploadedTypes.includes('EXPERIENCE_CERTIFICATE') ||
          uploadedTypes.includes('CERTIFICATE') ||
          document_type === 'EXPERIENCE_CERTIFICATE' ||
          document_type === 'CERTIFICATE'
        );
      }
      return uploadedTypes.includes(type) || type === document_type;
    });

    if (hasAllDocs) {
      kycStatusUpdate.overall_status = 'PENDING';
      kycStatusUpdate.submitted_at = new Date().toISOString();
      // Reset remarks on resubmission
      kycStatusUpdate.remarks = null;
    }

    if (Object.keys(kycStatusUpdate).length > 0) {
      const { error: kycUpdateErr } = await supabaseAdmin
        .from('worker_kyc')
        .update(kycStatusUpdate)
        .eq('worker_id', workerId);

      if (kycUpdateErr) throw kycUpdateErr;
    }

    return NextResponse.json({
      success: true,
      message: 'Document uploaded successfully.',
      overallStatus: hasAllDocs ? 'PENDING' : 'INCOMPLETE'
    });
  } catch (error: any) {
    console.error('Error uploading KYC document:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}
