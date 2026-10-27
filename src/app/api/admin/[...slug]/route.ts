import { z } from 'zod';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';
const supabaseAdmin: any = supabaseAdminOriginal;
import { logAuditAction } from '@/lib/audit';
import { AuditAction } from '@/types';
import { dispatchNotification, dispatchBulkNotifications } from '@/lib/notification-dispatcher';
import { memoryCache } from '@/lib/cache';
import { parseBookingIdentifier, getUuidRangeForShortId } from '@/lib/booking-slug';
import { toTitleCase } from '@/lib/title-case';


// Helper to calculate date boundaries
const getTodayDate = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const getStartOfWeekDate = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
};

const getStartOfMonthDate = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
};

const REQUIRED_KYC_DOCUMENTS = ['AADHAAR_FRONT', 'AADHAAR_BACK', 'PAN_CARD', 'PROFILE_PHOTO', 'SELFIE_VERIFICATION'];

// workers.kyc_status gates going online and dispatch; worker_kyc.overall_status drives the worker portal KYC page.
async function getWorkerKycSync(workerId: string, adminStatus: string) {
  const [{ data: kycRow }, { data: docs }] = await Promise.all([
    supabaseAdmin
      .from('worker_kyc')
      .select('overall_status, reviewed_at')
      .eq('worker_id', workerId)
      .maybeSingle(),
    supabaseAdmin
      .from('worker_documents')
      .select('document_type, status')
      .eq('worker_id', workerId),
  ]);

  const portalStatus: string | null = kycRow?.overall_status || null;
  const approvedDocs = REQUIRED_KYC_DOCUMENTS.filter((type) =>
    (docs || []).some((d: any) => d.document_type === type && d.status === 'APPROVED')
  ).length;
  const allDocsApproved = approvedDocs === REQUIRED_KYC_DOCUMENTS.length;
  const inSync = !portalStatus || portalStatus === adminStatus;

  let reason: string | null = null;
  if (!inSync) {
    if (portalStatus === 'APPROVED' && adminStatus !== 'APPROVED') {
      reason = allDocsApproved
        ? `The worker portal shows KYC approved${kycRow?.reviewed_at ? ` (reviewed ${new Date(kycRow.reviewed_at).toLocaleDateString('en-IN')})` : ''} and all ${REQUIRED_KYC_DOCUMENTS.length} documents are approved, but the account status used for going online and job dispatch is still ${adminStatus}. The worker sees "Approved" but cannot go online.`
        : `The worker portal shows KYC approved, but only ${approvedDocs} of ${REQUIRED_KYC_DOCUMENTS.length} documents are approved and the account status is ${adminStatus}. Review the documents before approving.`;
    } else if (adminStatus === 'APPROVED' && portalStatus !== 'APPROVED') {
      reason = `Account is marked Approved for job dispatch, but worker portal documents show ${portalStatus}. Syncing will update portal documents to Approved.`;
    } else {
      reason = `The worker portal shows KYC ${portalStatus}, but the account status is ${adminStatus}.`;
    }
  }

  const canSync =
    (portalStatus === 'APPROVED' && adminStatus !== 'APPROVED' && allDocsApproved) ||
    (adminStatus === 'APPROVED' && portalStatus !== 'APPROVED');

  return {
    admin_status: adminStatus,
    portal_status: portalStatus,
    reviewed_at: kycRow?.reviewed_at || null,
    documents_approved: approvedDocs,
    documents_required: REQUIRED_KYC_DOCUMENTS.length,
    in_sync: inSync,
    can_sync: canSync,
    reason,
  };
}

// GET Route handlers
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    // 1. Enforce strict admin access control
    const session = await requireRole(request, 'admin');
    const { slug } = await params;

    // X. search
    if (slug[0] === 'search') {
      const { searchParams } = new URL(request.url);
      const query = searchParams.get('q') || '';

      if (!query.trim()) {
        return NextResponse.json({ workers: [], customers: [], bookings: [] });
      }

      const cleanQuery = query.trim();

      // Parallel database lookups
      const [workersRes, customersRes, bookingsRes] = await Promise.all([
        supabaseAdmin
          .from('users')
          .select('id, full_name, phone')
          .eq('role', 'worker')
          .or(`full_name.ilike.%${cleanQuery}%,phone.ilike.%${cleanQuery}%`)
          .eq('is_active', true)
          .limit(5),
        supabaseAdmin
          .from('users')
          .select('id, full_name, phone')
          .eq('role', 'customer')
          .or(`full_name.ilike.%${cleanQuery}%,phone.ilike.%${cleanQuery}%`)
          .eq('is_active', true)
          .limit(5),
        supabaseAdmin
          .from('bookings')
          .select('id, status, service_items(name)')
          .or(`status.ilike.%${cleanQuery}%`)
          .limit(5)
      ]);

      // Handle UUID check for exact booking ID lookup
      let bookingByUuid: any[] = [];
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(cleanQuery)) {
        const { data } = await supabaseAdmin
          .from('bookings')
          .select('id, status, service_items(name)')
          .eq('id', cleanQuery)
          .limit(1);
        if (data) bookingByUuid = data;
      }

      const workers = (workersRes.data || []).map((w: any) => ({
        name: `${w.full_name} (${w.phone})`,
        url: `/admin/workers/view?id=${w.id}`
      }));

      const customers = (customersRes.data || []).map((c: any) => ({
        name: `${c.full_name} (${c.phone})`,
        url: `/admin/customers/view?id=${c.id}`
      }));

      const bookingsCombined = [...bookingByUuid, ...(bookingsRes.data || [])];
      // Deduplicate bookings
      const uniqueBookings = Array.from(new Map(bookingsCombined.map(b => [b.id, b])).values());

      const bookings = uniqueBookings.slice(0, 5).map((b: any) => ({
        name: `Booking ${(b.service_items as any)?.name || 'Service'} (${b.id.substring(0, 8)}) - ${b.status}`,
        url: `/admin/bookings`
      }));

      return NextResponse.json({ workers, customers, bookings });
    }

    // A. dashboard/metrics
    if (slug[0] === 'dashboard' && slug[1] === 'metrics') {
      const today = getTodayDate();
      const weekStart = getStartOfWeekDate();
      const monthStart = getStartOfMonthDate();

      // Run multiple aggregations parallelly to avoid block
      const [
        { count: totalWorkers },
        { count: activeWorkers },
        { count: pendingKyc },
        { count: totalCustomers },
        { count: todaysBookings },
        { count: completedBookings },
        { count: pendingBookings },
        { data: paymentsToday },
        { data: paymentsWeek },
        { data: paymentsMonth },
        { data: pendingSettlementsData }
      ] = await Promise.all([
        supabaseAdmin.from('workers').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('workers').select('*', { count: 'exact', head: true }).in('status', ['ONLINE', 'ON_JOB']),
        supabaseAdmin.from('workers').select('*', { count: 'exact', head: true }).eq('kyc_status', 'PENDING'),
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
        supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', today),
        supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'COMPLETED'),
        supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'PENDING_ASSIGNMENT'),
        supabaseAdmin.from('payments').select('amount').eq('status', 'SUCCESS').gte('paid_at', today),
        supabaseAdmin.from('payments').select('amount').eq('status', 'SUCCESS').gte('paid_at', weekStart),
        supabaseAdmin.from('payments').select('amount').eq('status', 'SUCCESS').gte('paid_at', monthStart),
        supabaseAdmin.from('settlement_ledger').select('amount').eq('status', 'PENDING')
      ]);

      const sumAmount = (arr: any[] | null) => (arr || []).reduce((sum, item) => sum + Number(item.amount), 0);

      return NextResponse.json({
        total_workers: totalWorkers || 0,
        active_workers: activeWorkers || 0,
        pending_kyc: pendingKyc || 0,
        total_customers: totalCustomers || 0,
        todays_bookings: todaysBookings || 0,
        completed_bookings: completedBookings || 0,
        pending_bookings: pendingBookings || 0,
        revenue_today: sumAmount(paymentsToday),
        revenue_this_week: sumAmount(paymentsWeek),
        revenue_this_month: sumAmount(paymentsMonth),
        pending_settlements: (pendingSettlementsData || []).length,
        pending_settlement_amount: sumAmount(pendingSettlementsData)
      });
    }

    // B. dashboard/recent-activity
    if (slug[0] === 'dashboard' && slug[1] === 'recent-activity') {
      const { data: logs, error } = await supabaseAdmin
        .from('audit_logs')
        .select('*, users(full_name)')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return NextResponse.json(logs || []);
    }

    // C. workers
    if (slug[0] === 'workers' && slug.length === 1) {
      const { searchParams } = new URL(request.url);
      const page = Math.max(1, Number(searchParams.get('page') || 1));
      const limit = Math.max(1, Number(searchParams.get('limit') || 20));
      const search = searchParams.get('search') || '';
      const status = searchParams.get('status') || '';
      const kycStatus = searchParams.get('kyc_status') || '';

      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('workers')
        .select('id, status, kyc_status, rating, total_jobs, created_at, location_updated_at, users!inner(full_name, phone), worker_wallets(balance)', { count: 'exact' });

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`, { foreignTable: 'users' });
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (kycStatus) {
        query = query.eq('kyc_status', kycStatus);
      }

      const { data: workers, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Auto-reconcile orphaned ON_JOB status if no active booking exists
      const onJobWorkerIds = (workers || [])
        .filter((w: any) => w.status === 'ON_JOB')
        .map((w: any) => w.id);

      if (onJobWorkerIds.length > 0) {
        const { data: activeBookings } = await supabaseAdmin
          .from('bookings')
          .select('worker_id')
          .in('worker_id', onJobWorkerIds)
          .in('status', ['WORKER_ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS']);

        const activeWorkerIdSet = new Set((activeBookings || []).map((b: any) => b.worker_id));

        for (const w of (workers || [])) {
          if (w.status === 'ON_JOB' && !activeWorkerIdSet.has(w.id)) {
            w.status = 'ONLINE';
            // Self-heal DB row in background
            supabaseAdmin
              .from('workers')
              .update({ status: 'ONLINE', updated_at: new Date().toISOString() })
              .eq('id', w.id)
              .then(() => {});
          }
        }
      }

      const workerIds = (workers || []).map((w: any) => w.id);
      const portalKycById = new Map<string, string>();
      if (workerIds.length > 0) {
        const { data: kycRows } = await supabaseAdmin
          .from('worker_kyc')
          .select('worker_id, overall_status')
          .in('worker_id', workerIds);
        for (const row of kycRows || []) {
          portalKycById.set(row.worker_id, row.overall_status);
        }
      }

      return NextResponse.json({
        workers: (workers || []).map((w: any) => ({
          id: w.id,
          full_name: w.users?.full_name,
          phone: w.users?.phone,
          status: w.status,
          kyc_status: w.kyc_status,
          portal_kyc_status: portalKycById.get(w.id) || null,
          kyc_mismatch: !!portalKycById.get(w.id) && portalKycById.get(w.id) !== w.kyc_status,
          rating: w.rating,
          total_jobs: w.total_jobs,
          commission_wallet_balance: (Array.isArray(w.worker_wallets) ? w.worker_wallets[0]?.balance : w.worker_wallets?.balance) || 0,
          created_at: w.created_at,
          location_updated_at: w.location_updated_at
        })),
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      });
    }

    // D. workers/[id]
    if (slug[0] === 'workers' && slug.length === 2) {
      const workerId = slug[1];

      // Fetch user profile join worker details and profile details
      const { data: worker, error: workerErr } = await supabaseAdmin
        .from('workers')
        .select('*, users(*), worker_profiles(*), worker_wallets(balance)')
        .eq('id', workerId)
        .single();

      if (workerErr || !worker) {
        return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
      }

      // Resolve service category IDs to names
      let categoryNames: string[] = [];
      const workerData = worker as any;
      if (workerData.service_category_ids && workerData.service_category_ids.length > 0) {
        const { data: categories } = await supabaseAdmin
          .from('service_categories')
          .select('name')
          .in('id', workerData.service_category_ids);
        if (categories) {
          categoryNames = categories.map((c: any) => c.name);
        }
      }

      // Fetch last 10 wallet transactions
      const { data: walletTxns } = await supabaseAdmin
        .from('wallet_transactions')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch last 10 settlements
      const { data: settlements } = await supabaseAdmin
        .from('settlement_ledger')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false })
        .limit(10);

      const kycSync = await getWorkerKycSync(workerId, workerData.kyc_status);

      // Fetch documents metadata and generate signed URLs
      const { data: workerDocs } = await supabaseAdmin
        .from('worker_documents')
        .select('*')
        .eq('worker_id', workerId);

      const docsWithUrls = await Promise.all((workerDocs || []).map(async (doc: any) => {
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
          path = doc.file_url || `worker_${workerId}/${fileMap[doc.document_type] || 'certificate.webp'}`;
        }

        const { data } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(path, 900);

        return {
          ...doc,
          signedUrl: data?.signedUrl || null
        };
      }));

      const getSignedUrlForType = (docType: string) => {
        const found = docsWithUrls.find((d: any) => d.document_type === docType);
        return found?.signedUrl || null;
      };

      // Mask bank account number securely for display
      const maskBankAcc = (acc: string | null) => {
        if (!acc) return '';
        if (acc.length < 4) return '****';
        return `******${acc.slice(-4)}`;
      };

      return NextResponse.json({
        id: workerData.id,
        full_name: workerData.users?.full_name,
        phone: workerData.users?.phone,
        email: workerData.users?.email,
        status: workerData.status,
        kyc_status: workerData.kyc_status,
        kyc_sync: kycSync,
        documents: docsWithUrls,
        aadhar_front_url: getSignedUrlForType('AADHAAR_FRONT') || workerData.aadhar_front_url,
        aadhar_back_url: getSignedUrlForType('AADHAAR_BACK') || workerData.aadhar_back_url,
        pan_url: getSignedUrlForType('PAN_CARD') || workerData.pan_url,
        selfie_url: getSignedUrlForType('SELFIE_VERIFICATION') || workerData.selfie_url,
        certificate_url: getSignedUrlForType('EXPERIENCE_CERTIFICATE') || getSignedUrlForType('CERTIFICATE') || workerData.certificate_url,
        experience_years: workerData.experience_years || 0,
        bank_account_name: workerData.bank_account_name,
        bank_account_number: maskBankAcc(workerData.bank_account_number),
        bank_ifsc: workerData.bank_ifsc,
        razorpayx_contact_id: workerData.razorpayx_contact_id,
        razorpayx_fund_account_id: workerData.razorpayx_fund_account_id,
        commission_wallet_balance: (Array.isArray((workerData as any).worker_wallets) ? (workerData as any).worker_wallets[0]?.balance : (workerData as any).worker_wallets?.balance) || 0,
        rating: workerData.rating,
        total_jobs: workerData.total_jobs,
        created_at: workerData.created_at,
        is_active: workerData.users?.is_active,
        wallet_transactions: walletTxns || [],
        settlements: settlements || [],
        dob: workerData.dob,
        worker_id_code: workerData.worker_id_code,
        skills: workerData.worker_profiles?.skills || [],
        service_categories: categoryNames,
        service_category_ids: workerData.service_category_ids || []
      });
    }

    // D.2 workers/[id]/kyc-docs
    if (slug[0] === 'workers' && slug.length === 3 && slug[2] === 'kyc-docs') {
      const workerId = slug[1];

      // Fetch documents metadata
      const { data: docs, error: docsErr } = await supabaseAdmin
        .from('worker_documents')
        .select('*')
        .eq('worker_id', workerId);

      if (docsErr) {
        return NextResponse.json({ error: docsErr.message }, { status: 500 });
      }

      // Generate signed URLs for documents
      const docsWithUrls = await Promise.all((docs || []).map(async (doc: any) => {
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
            SELFIE_VERIFICATION: 'selfie.webp'
          };
          path = doc.file_url || `worker_${workerId}/${fileMap[doc.document_type]}`;
        }

        const { data, error } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(path, 900); // 15 mins expiry

        return {
          ...doc,
          signedUrl: data?.signedUrl || null
        };
      }));

      // Fetch overall kyc status review state
      const { data: kycState } = await supabaseAdmin
        .from('worker_kyc')
        .select('*')
        .eq('worker_id', workerId)
        .maybeSingle();

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
        }
      });
    }

    // E. customers
    if (slug[0] === 'customers' && slug.length === 1) {
      const { searchParams } = new URL(request.url);
      const page = Math.max(1, Number(searchParams.get('page') || 1));
      const limit = Math.max(1, Number(searchParams.get('limit') || 20));
      const search = searchParams.get('search') || '';

      const offset = (page - 1) * limit;

      let countQuery = supabaseAdmin
        .from('users')
        .select('id', { count: 'exact' })
        .eq('role', 'customer');

      let query = supabaseAdmin
        .from('users')
        .select('id, full_name, phone, email, is_active, created_at, bookings(id)')
        .eq('role', 'customer');

      if (search) {
        countQuery = countQuery.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
        query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const [{ count }, { data: customers, error }] = await Promise.all([
        countQuery,
        query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)
      ]);

      if (error) throw error;

      return NextResponse.json({
        customers: (customers || []).map((c: any) => ({
          id: c.id,
          full_name: c.full_name,
          phone: c.phone,
          email: c.email,
          is_active: c.is_active,
          created_at: c.created_at,
          total_bookings: c.bookings?.length || 0
        })),
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      });
    }

    // F. customers/[id]
    if (slug[0] === 'customers' && slug.length === 2) {
      const customerId = slug[1];

      const { data: customer, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', customerId)
        .eq('role', 'customer')
        .single();

      if (error || !customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }

      // Fetch last 20 bookings
      const { data: bookings } = await supabaseAdmin
        .from('bookings')
        .select('id, status, total_amount, created_at, service_items(name)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(20);

      const customerData = customer as any;

      return NextResponse.json({
        id: customerData.id,
        full_name: customerData.full_name,
        phone: customerData.phone,
        email: customerData.email,
        is_active: customerData.is_active,
        created_at: customerData.created_at,
        bookings: (bookings || []).map((b: any) => ({
          id: b.id,
          status: b.status,
          total_amount: b.total_amount,
          created_at: b.created_at,
          service_name: b.service_items?.name
        }))
      });
    }

    // F.2 deletion-requests
    if (slug[0] === 'deletion-requests' && slug.length === 1) {
      try {
        const { data: requests, error } = await supabaseAdmin
          .from('account_deletion_requests')
          .select(`
            id,
            user_id,
            phone,
            role,
            reason,
            status,
            requested_via,
            admin_notes,
            processed_at,
            created_at,
            users:users!account_deletion_requests_user_id_fkey (
              full_name,
              email,
              is_active
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[Admin Deletion Requests] DB error:', error);
          return NextResponse.json({ requests: [], total: 0 });
        }

        return NextResponse.json({
          requests: requests || [],
          total: requests?.length || 0,
        });
      } catch (err) {
        return NextResponse.json({ requests: [], total: 0 });
      }
    }

    // G. bookings
    if (slug[0] === 'bookings' && slug.length === 1) {
      const { searchParams } = new URL(request.url);
      const page = Math.max(1, Number(searchParams.get('page') || 1));
      const limit = Math.max(1, Number(searchParams.get('limit') || 20));
      const search = searchParams.get('search') || '';
      const status = searchParams.get('status') || '';
      const paymentMode = searchParams.get('payment_mode') || '';
      const bookingType = searchParams.get('booking_type') || '';
      const dateFrom = searchParams.get('date_from') || '';
      const dateTo = searchParams.get('date_to') || '';

      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('bookings')
        .select('id, status, payment_mode, booking_type, total_amount, created_at, scheduled_at, service_items(name), customer:users!bookings_customer_id_fkey(full_name, phone), worker:workers(users(full_name, phone))', { count: 'exact' });

      if (status) query = query.eq('status', status);
      if (paymentMode) query = query.eq('payment_mode', paymentMode);
      if (bookingType) query = query.eq('booking_type', bookingType);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo);

      if (search) {
        const cleanSearch = search.trim().replace(/^#/, '');

        // 1. Find matching customer users by full_name or phone
        const { data: matchedUsers } = await supabaseAdmin
          .from('users')
          .select('id')
          .or(`full_name.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%`)
          .limit(100);

        const matchedCustomerIds = (matchedUsers || []).map((u: any) => u.id);

        // 2. Check if cleanSearch matches booking ID
        const isHexSearch = /^[0-9a-fA-F-]{4,36}$/.test(cleanSearch);
        let matchedBookingIds: string[] = [];

        if (isHexSearch) {
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanSearch)) {
            matchedBookingIds = [cleanSearch.toLowerCase()];
          } else {
            const { data: recentBookings } = await supabaseAdmin
              .from('bookings')
              .select('id')
              .limit(1000);
            matchedBookingIds = (recentBookings || [])
              .map((b: any) => b.id)
              .filter((id: string) => id.toLowerCase().includes(cleanSearch.toLowerCase()));
          }
        }

        const candidateBookingIds = Array.from(new Set(matchedBookingIds));

        if (matchedCustomerIds.length > 0 && candidateBookingIds.length > 0) {
          query = query.or(`customer_id.in.(${matchedCustomerIds.join(',')}),id.in.(${candidateBookingIds.join(',')})`);
        } else if (matchedCustomerIds.length > 0) {
          query = query.in('customer_id', matchedCustomerIds);
        } else if (candidateBookingIds.length > 0) {
          query = query.in('id', candidateBookingIds);
        } else {
          return NextResponse.json({
            bookings: [],
            total: 0,
            page,
            totalPages: 0
          });
        }
      }

      const { data: bookings, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return NextResponse.json({
        bookings: (bookings || []).map((b: any) => ({
          id: b.id,
          status: b.status,
          payment_mode: b.payment_mode,
          booking_type: b.booking_type,
          total_amount: b.total_amount,
          created_at: b.created_at,
          scheduled_at: b.scheduled_at,
          service_name: b.service_items?.name,
          customer_name: b.customer?.full_name,
          customer_phone: b.customer?.phone,
          worker_name: b.worker?.users?.full_name,
          worker_phone: b.worker?.users?.phone
        })),
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      });
    }

    // H. bookings/[id]
    if (slug[0] === 'bookings' && slug.length === 2) {
      const bookingIdentifier = slug[1];
      const parsed = parseBookingIdentifier(bookingIdentifier);

      let bookingQuery = supabaseAdmin
        .from('bookings')
        .select('*, service_items(*), customer:users!bookings_customer_id_fkey(*), worker:workers(id, users(*)), payments(*)');

      if (parsed.isUuid && parsed.fullUuid) {
        bookingQuery = bookingQuery.eq('id', parsed.fullUuid);
      } else if (parsed.shortId) {
        const range = getUuidRangeForShortId(parsed.shortId);
        bookingQuery = bookingQuery.gte('id', range.minUuid).lte('id', range.maxUuid);
      } else {
        bookingQuery = bookingQuery.eq('id', bookingIdentifier);
      }

      const { data: booking, error } = await bookingQuery.maybeSingle();

      if (error || !booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }

      const bookingData = booking as any;
      const actualBookingId = bookingData.id;

      // Fetch completion images
      const { data: images } = await supabaseAdmin
        .from('booking_images')
        .select('image_url')
        .eq('booking_id', actualBookingId);

      const imageUrls = (images || []).map((img: any) => {
        if (img.image_url.startsWith('http')) return img.image_url;
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('booking-images')
          .getPublicUrl(img.image_url);
        return publicUrl;
      });

      return NextResponse.json({
        id: bookingData.id,
        status: bookingData.status,
        booking_type: bookingData.booking_type,
        payment_mode: bookingData.payment_mode,
        address_line: bookingData.address_line,
        lat: bookingData.lat,
        lng: bookingData.lng,
        scheduled_at: bookingData.scheduled_at,
        started_at: bookingData.started_at,
        completed_at: bookingData.completed_at,
        total_amount: bookingData.total_amount,
        notes: bookingData.notes,
        otp: bookingData.otp,
        created_at: bookingData.created_at,
        service: bookingData.service_items,
        customer: bookingData.customer,
        worker: bookingData.worker ? {
          id: bookingData.worker.id,
          full_name: bookingData.worker.users?.full_name,
          phone: bookingData.worker.users?.phone,
        } : null,
        images: imageUrls,
        payment: bookingData.payments || []
      });
    }

    // I. services
    if (slug[0] === 'services' && slug.length === 1) {
      const { data: categories, error } = await supabaseAdmin
        .from('service_categories')
        .select('*, service_items(*)')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return NextResponse.json(categories || []);
    }

    // J. manual-assignment
    if (slug[0] === 'manual-assignment' && slug.length === 1) {
      const { searchParams } = new URL(request.url);
      const bookingId = searchParams.get('booking_id');

      // Fetch all unassigned jobs
      const { data: unassignedJobs } = await supabaseAdmin
        .from('bookings')
        .select('id, address_line, lat, lng, created_at, service_items(name), customer:users!bookings_customer_id_fkey(full_name)')
        .eq('status', 'PENDING_ASSIGNMENT')
        .order('created_at', { ascending: false });

      let availableWorkers: any[] = [];

      // If a booking is selected, search nearby workers via Haversine calculation
      if (bookingId) {
        const { data: targetJob } = await supabaseAdmin
          .from('bookings')
          .select('lat, lng')
          .eq('id', bookingId)
          .single();

        if (targetJob) {
          const supabaseAdminAny: any = supabaseAdmin;
          const { data: nearbyWorkers, error: rpcErr } = await supabaseAdminAny.rpc(
            'find_nearby_workers',
            {
              p_lat: targetJob.lat,
              p_lng: targetJob.lng,
              radius_km: 25.0 // search up to 25km for manual assignments
            }
          );

          if (!rpcErr && nearbyWorkers) {
            const workerIds = nearbyWorkers.map((w: any) => w.worker_id);
            if (workerIds.length > 0) {
               const { data: workerProfiles } = await supabaseAdmin
                .from('workers')
                .select('id, rating, total_jobs, users(full_name, phone), worker_profiles(skills, experience)')
                .in('id', workerIds);

              availableWorkers = (workerProfiles || []).map((w: any) => {
                const distanceObj = nearbyWorkers.find((nw: any) => nw.worker_id === w.id);
                return {
                  id: w.id,
                  name: w.users?.full_name,
                  phone: w.users?.phone,
                  rating: w.rating,
                  distance_km: distanceObj ? Number(distanceObj.distance_km.toFixed(2)) : null,
                  total_jobs: w.total_jobs || 0,
                  experience: w.worker_profiles?.experience || 0,
                  skills: w.worker_profiles?.skills || []
                };
              }).sort((a: any, b: any) => (a.distance_km ?? 9999) - (b.distance_km ?? 9999));
            }
          }
        }
      } else {
        const { data: onlineWorkers } = await supabaseAdmin
          .from('workers')
          .select('id, rating, total_jobs, users(full_name, phone), worker_profiles(skills, experience)')
          .eq('status', 'ONLINE')
          .eq('kyc_status', 'APPROVED');

        availableWorkers = (onlineWorkers || []).map((w: any) => ({
          id: w.id,
          name: w.users?.full_name,
          phone: w.users?.phone,
          rating: w.rating,
          distance_km: null,
          total_jobs: w.total_jobs || 0,
          experience: w.worker_profiles?.experience || 0,
          skills: w.worker_profiles?.skills || []
        }));
      }

      return NextResponse.json({
        unassigned_jobs: (unassignedJobs || []).map((j: any) => ({
          id: j.id,
          customer_name: j.customer?.full_name,
          service_name: j.service_items?.name,
          address_line: j.address_line,
          lat: j.lat,
          lng: j.lng,
          created_at: j.created_at
        })),
        available_workers: availableWorkers
      });
    }

    // K. settlements (overview, batches, ledger, or specific subroutes)
    if (slug[0] === 'settlements') {
      // 1. cashfree-balance
      if (slug[1] === 'cashfree-balance') {
        const { CashfreePayoutProvider } = await import('@/lib/payouts/cashfree-payout-provider');
        const provider = new CashfreePayoutProvider();
        const isLive = provider.isLiveEnabled();
        const env = provider.getEnvironment();
        try {
          const balanceData = await provider.getBalance();
          return NextResponse.json({
            success: true,
            environment: env,
            isLiveEnabled: isLive,
            balance: balanceData.balance,
            availableBalance: balanceData.availableBalance,
            currency: 'INR',
            status: 'CONNECTED',
          });
        } catch (providerErr: any) {
          const msg = providerErr.message || '';
          const isIpRestricted = msg.includes('IP not whitelisted') || msg.includes('403');
          return NextResponse.json({
            success: false,
            environment: env,
            isLiveEnabled: isLive,
            balance: null,
            status: isIpRestricted ? 'IP_RESTRICTED' : 'CONNECTION_ERROR',
            message: msg,
            ipHelpUrl: 'https://docs.cashfree.com/docs/payouts-2fa#ip-whitelist',
          });
        }
      }

      // 2. bank-accounts
      if (slug[1] === 'bank-accounts') {
        const { data, error } = await supabaseAdmin
          .from('worker_bank_accounts')
          .select('*, workers(users(full_name, phone))')
          .order('is_verified', { ascending: false })
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: false });
        if (error) throw error;

        // Deduplicate by worker_id so each partner appears once
        const seenWorkerIds = new Set<string>();
        const uniqueAccounts: any[] = [];
        for (const account of data || []) {
          if (!seenWorkerIds.has(account.worker_id)) {
            seenWorkerIds.add(account.worker_id);
            uniqueAccounts.push(account);
          }
        }

        const { decryptData } = await import('@/lib/crypto');
        const decryptedData = uniqueAccounts.map((account: any) => {
          let decryptedAccount = '';
          try {
            decryptedAccount = decryptData(account.account_number_encrypted);
          } catch (e) {
            decryptedAccount = 'Error Decrypting';
          }
          const upiId = account.upi_id || (account.branch?.startsWith('UPI:') ? account.branch.replace('UPI:', '').trim() : '');
          return {
            ...account,
            upi_id: upiId || null,
            account_number_decrypted: decryptedAccount
          };
        });
        return NextResponse.json({ accounts: decryptedData });
      }

      // 3. batch-items
      if (slug[1] === 'batch-items') {
        const { searchParams } = new URL(request.url);
        const batchId = searchParams.get('batchId');
        if (!batchId) return NextResponse.json({ error: 'Missing batchId parameter' }, { status: 400 });

        const { data: batch, error: bErr } = await supabaseAdmin
          .from('settlement_batches')
          .select('*')
          .eq('id', batchId)
          .single();
        if (bErr || !batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

        const { data: items, error: iErr } = await supabaseAdmin
          .from('settlement_ledger')
          .select(`
            id,
            worker_id,
            booking_id,
            gross_amount,
            commission_amount,
            net_amount,
            status,
            razorpayx_transfer_id,
            created_at,
            workers:worker_id(
              id,
              users:id(full_name, phone)
            )
          `)
          .eq('settlement_batch_id', batchId);
        if (iErr) throw iErr;

        const workerIds = Array.from(new Set((items || []).map((it: any) => it.worker_id)));
        let bankMap = new Map();
        if (workerIds.length > 0) {
          const { data: banks } = await supabaseAdmin
            .from('worker_bank_accounts')
            .select('worker_id, bank_name, account_last_four, ifsc_code, is_verified, provider_fund_account_id')
            .in('worker_id', workerIds);
          (banks || []).forEach((b: any) => bankMap.set(b.worker_id, b));
        }

        const workerGroups = new Map();
        (items || []).forEach((it: any) => {
          const wId = it.worker_id;
          const bank = bankMap.get(wId);
          const wName = it.workers?.users?.full_name || 'Service Partner';
          const wPhone = it.workers?.users?.phone || '';

          if (!workerGroups.has(wId)) {
            workerGroups.set(wId, {
              workerId: wId,
              workerName: wName,
              workerPhone: wPhone,
              bankName: bank?.bank_name || 'Registered Bank',
              accountLastFour: bank?.account_last_four || 'XXXX',
              ifscCode: bank?.ifsc_code || '',
              isBankVerified: !!bank?.is_verified,
              routeAccountId: bank?.provider_fund_account_id || null,
              grossAmount: 0,
              commissionAmount: 0,
              netAmount: 0,
              bookingCount: 0,
              status: it.status,
              transferId: it.razorpayx_transfer_id || null,
              bookings: []
            });
          }

          const curr = workerGroups.get(wId);
          curr.grossAmount += Number(it.gross_amount || 0);
          curr.commissionAmount += Number(it.commission_amount || 0);
          curr.netAmount += Number(it.net_amount || 0);
          curr.bookingCount += 1;
          if (it.razorpayx_transfer_id) curr.transferId = it.razorpayx_transfer_id;
          curr.bookings.push({
            bookingId: it.booking_id,
            gross: Number(it.gross_amount || 0),
            commission: Number(it.commission_amount || 0),
            net: Number(it.net_amount || 0)
          });
        });

        return NextResponse.json({
          success: true,
          batch,
          workers: Array.from(workerGroups.values())
        });
      }

      // 4. payout-status
      if (slug[1] === 'payout-status') {
        const { searchParams } = new URL(request.url);
        const batchId = searchParams.get('batchId');
        if (!batchId) return NextResponse.json({ error: 'batchId is required' }, { status: 400 });

        try {
          const { PayoutService } = await import('@/lib/payouts/payout-service');
          await PayoutService.reconcilePayouts();
        } catch (recErr) {
          console.warn('[PayoutStatus] Live reconcile notice:', recErr);
        }

        const { data: payouts, error } = await supabaseAdmin
          .from('payouts')
          .select(`
            id,
            worker_id,
            amount,
            status,
            provider,
            provider_reference,
            provider_status,
            utr_number,
            failure_code,
            failure_reason,
            retry_count,
            processed_at,
            created_at,
            updated_at,
            workers:worker_id(
              id,
              users:id(full_name, phone)
            )
          `)
          .eq('settlement_batch_id', batchId)
          .order('created_at', { ascending: false });

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ payouts: payouts || [] });
      }

      // 5. settlements/[worker_id]
      if (slug.length === 2) {
        const workerId = slug[1];

        const { data: userProfile } = await supabaseAdmin
          .from('users')
          .select('full_name, phone')
          .eq('id', workerId)
          .single();

        const { data: ledger } = await supabaseAdmin
          .from('settlement_ledger')
          .select('*, payment:payments(booking_id, amount)')
          .eq('worker_id', workerId)
          .order('created_at', { ascending: false });

        return NextResponse.json({
          worker_name: userProfile?.full_name || 'Worker',
          worker_phone: userProfile?.phone || '',
          history: ledger || []
        });
      }

      // 6. settlements (overview, batches, ledger)
      if (slug.length === 1) {
        const { searchParams } = new URL(request.url);
        const pageParam = searchParams.get('page');

        if (pageParam) {
          const page = Math.max(1, Number(pageParam || 1));
          const limit = Math.max(1, Number(searchParams.get('limit') || 20));
          const status = searchParams.get('status') || '';
          const dateFrom = searchParams.get('date_from') || '';
          const dateTo = searchParams.get('date_to') || '';

          const offset = (page - 1) * limit;

          let query = supabaseAdmin
            .from('settlement_ledger')
            .select('*, worker:workers(users(full_name, phone))', { count: 'exact' });

          if (status) query = query.eq('status', status);
          if (dateFrom) query = query.gte('created_at', dateFrom);
          if (dateTo) query = query.lte('created_at', dateTo);

          const { data: settlements, count, error } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          if (error) throw error;

          return NextResponse.json({
            settlements: (settlements || []).map((s: any) => ({
              id: s.id,
              worker_id: s.worker_id,
              worker_name: s.worker?.users?.full_name,
              worker_phone: s.worker?.users?.phone,
              gross_amount: s.gross_amount,
              commission_amount: s.commission_amount,
              net_amount: s.net_amount,
              status: s.status,
              created_at: s.created_at
            })),
            total: count || 0,
            page,
            totalPages: Math.ceil((count || 0) / limit)
          });
        }

        const { data: batchesData } = await supabaseAdmin
          .from('settlement_batches')
          .select('*')
          .order('created_at', { ascending: false });

        const { data: ledgerData } = await supabaseAdmin
          .from('settlement_ledger')
          .select(`
            id,
            worker_id,
            booking_id,
            gross_amount,
            commission_amount,
            net_amount,
            status,
            created_at,
            settlement_batch_id,
            updated_at,
            workers:worker_id(
              id,
              rating,
              users:id(full_name, phone)
            ),
            bookings:booking_id(
              id,
              total_amount,
              service_items(name)
            )
          `)
          .order('created_at', { ascending: false })
          .limit(100);

        let finalLedger = ledgerData;
        if (!ledgerData || ledgerData.length === 0) {
          const { data: rawLedger } = await supabaseAdmin
            .from('settlement_ledger')
            .select('*, workers(users(full_name, phone))')
            .order('created_at', { ascending: false })
            .limit(100);
          finalLedger = rawLedger || [];
        }

        let batchPending = 0;
        let batchReady = 0;
        let batchPaid = 0;
        let totalComm = 0;
        let totalEarn = 0;

        (batchesData || []).forEach((b: any) => {
          totalComm += Number(b.commission_amount || 0);
          totalEarn += Number(b.net_amount || 0);
          if (b.status === 'PROCESSING') batchPending++;
          if (b.status === 'READY_FOR_PAYOUT') batchReady++;
          if (b.status === 'PAID') batchPaid++;
        });

        let unbatchedPendingGross = 0;
        let unbatchedPendingComm = 0;
        let unbatchedPendingNet = 0;
        let unbatchedCount = 0;

        (finalLedger || []).forEach((l: any) => {
          if (l.status === 'PENDING' && !l.settlement_batch_id) {
            unbatchedPendingGross += Number(l.gross_amount || 0);
            unbatchedPendingComm += Number(l.commission_amount || 0);
            unbatchedPendingNet += Number(l.net_amount || 0);
            unbatchedCount++;
          }
        });

        const overview = {
          pending: batchPending + (unbatchedCount > 0 ? 1 : 0),
          ready: batchReady,
          paid: batchPaid,
          totalComm: Number((totalComm + unbatchedPendingComm).toFixed(2)),
          totalEarn: Number((totalEarn + unbatchedPendingNet).toFixed(2)),
          unbatchedCount,
          unbatchedPendingNet: Number(unbatchedPendingNet.toFixed(2))
        };

        return NextResponse.json({
          overview,
          batches: batchesData || [],
          ledger: finalLedger || []
        });
      }
    }

    // M. reports/revenue
    if (slug[0] === 'reports' && slug[1] === 'revenue') {
      const { searchParams } = new URL(request.url);
      const dateFrom = searchParams.get('date_from') || '';
      const dateTo = searchParams.get('date_to') || '';

      let query = supabaseAdmin
        .from('payments')
        .select('amount, admin_commission, worker_share, paid_at')
        .eq('status', 'SUCCESS');

      if (dateFrom) query = query.gte('paid_at', dateFrom);
      if (dateTo) query = query.lte('paid_at', dateTo);

      const { data: payments, error } = await query;
      if (error) throw error;

      // Group payments by date simple parser
      const timeSeriesMap: Record<string, any> = {};
      let totalRev = 0;
      let totalComm = 0;
      let totalShare = 0;

      (payments || []).forEach((p: any) => {
        const dateStr = p.paid_at ? p.paid_at.split('T')[0] : 'N/A';
        const amt = Number(p.amount);
        const comm = Number(p.admin_commission || amt * 0.15);
        const share = Number(p.worker_share || amt * 0.85);

        totalRev += amt;
        totalComm += comm;
        totalShare += share;

        if (!timeSeriesMap[dateStr]) {
          timeSeriesMap[dateStr] = {
            period: dateStr,
            total_revenue: 0,
            admin_commission: 0,
            worker_share: 0,
            booking_count: 0
          };
        }

        timeSeriesMap[dateStr].total_revenue += amt;
        timeSeriesMap[dateStr].admin_commission += comm;
        timeSeriesMap[dateStr].worker_share += share;
        timeSeriesMap[dateStr].booking_count += 1;
      });

      const timeSeries = Object.values(timeSeriesMap).sort((a: any, b: any) => a.period.localeCompare(b.period));

      return NextResponse.json({
        time_series: timeSeries,
        summary: {
          total: totalRev,
          avg_per_booking: payments && payments.length > 0 ? Number((totalRev / payments.length).toFixed(2)) : 0,
          admin_share: totalComm,
          worker_share: totalShare
        }
      });
    }

    // N. reports/bookings
    if (slug[0] === 'reports' && slug[1] === 'bookings') {
      const { data: bookings } = await supabaseAdmin
        .from('bookings')
        .select('status, payment_mode, booking_type');

      const byStatus: Record<string, number> = {};
      const byPayment: Record<string, number> = {};
      const byType: Record<string, number> = {};
      let cancelledCount = 0;

      (bookings || []).forEach((b: any) => {
        byStatus[b.status] = (byStatus[b.status] || 0) + 1;
        byPayment[b.payment_mode] = (byPayment[b.payment_mode] || 0) + 1;
        byType[b.booking_type] = (byType[b.booking_type] || 0) + 1;
        if (b.status === 'CANCELLED') {
          cancelledCount += 1;
        }
      });

      const total = bookings?.length || 0;

      return NextResponse.json({
        by_status: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
        by_payment: Object.entries(byPayment).map(([name, value]) => ({ name, value })),
        by_type: Object.entries(byType).map(([name, value]) => ({ name, value })),
        cancellation_rate: total > 0 ? Number(((cancelledCount / total) * 100).toFixed(2)) : 0
      });
    }

    // O. reports/workers
    if (slug[0] === 'reports' && slug[1] === 'workers') {
      const { data: topWorkers } = await supabaseAdmin
        .from('workers')
        .select('id, rating, total_jobs, users(full_name)')
        .order('total_jobs', { ascending: false })
        .limit(10);

      const { data: bestRated } = await supabaseAdmin
        .from('workers')
        .select('id, rating, total_jobs, users(full_name)')
        .order('rating', { ascending: false })
        .limit(10);

      const [
        { count: pendingCount },
        { count: approvedCount },
        { count: rejectedCount }
      ] = await Promise.all([
        supabaseAdmin.from('workers').select('id', { count: 'exact', head: true }).eq('kyc_status', 'PENDING'),
        supabaseAdmin.from('workers').select('id', { count: 'exact', head: true }).eq('kyc_status', 'APPROVED'),
        supabaseAdmin.from('workers').select('id', { count: 'exact', head: true }).eq('kyc_status', 'REJECTED')
      ]);

      return NextResponse.json({
        top_by_jobs: (topWorkers || []).map((w: any) => ({
          name: w.users?.full_name,
          jobs: w.total_jobs,
          rating: w.rating
        })),
        top_by_rating: (bestRated || []).map((w: any) => ({
          name: w.users?.full_name,
          jobs: w.total_jobs,
          rating: w.rating
        })),
        kyc_funnel: {
          pending: pendingCount || 0,
          approved: approvedCount || 0,
          rejected: rejectedCount || 0
        }
      });
    }

    // P. reports/services
    if (slug[0] === 'reports' && slug[1] === 'services') {
      const { data: bookings } = await supabaseAdmin
        .from('bookings')
        .select('service_item_id, total_amount, service_items(name)');

      const serviceStatsMap: Record<string, any> = {};

      (bookings || []).forEach((b: any) => {
        const serviceId = b.service_item_id;
        const name = b.service_items?.name || 'Unknown Service';
        const amt = Number(b.total_amount);

        if (!serviceStatsMap[serviceId]) {
          serviceStatsMap[serviceId] = {
            id: serviceId,
            name,
            bookings_count: 0,
            revenue: 0
          };
        }

        serviceStatsMap[serviceId].bookings_count += 1;
        serviceStatsMap[serviceId].revenue += amt;
      });

      return NextResponse.json(Object.values(serviceStatsMap).sort((a: any, b: any) => b.bookings_count - a.bookings_count));
    }

    // Q. settings
    if (slug[0] === 'settings' && slug.length === 1) {
      const { data: settings, error } = await supabaseAdmin
        .from('platform_settings')
        .select('*');

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      (settings || []).forEach((s: any) => {
        settingsMap[s.key] = s.value;
      });

      return NextResponse.json(settingsMap);
    }

    // R. audit-logs
    if (slug[0] === 'audit-logs' && slug.length === 1) {
      const { searchParams } = new URL(request.url);
      const page = Math.max(1, Number(searchParams.get('page') || 1));
      const limit = Math.max(1, Number(searchParams.get('limit') || 20));
      const action = searchParams.get('action') || '';
      const dateFrom = searchParams.get('date_from') || '';
      const dateTo = searchParams.get('date_to') || '';

      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('audit_logs')
        .select('*, admin:users(full_name)', { count: 'exact' });

      if (action) query = query.eq('action', action);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo);

      const { data: logs, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return NextResponse.json({
        logs: (logs || []).map((l: any) => ({
          id: l.id,
          timestamp: l.created_at,
          admin_name: l.admin?.full_name || 'System',
          action: l.action,
          target_type: l.target_type,
          target_id: l.target_id,
          metadata: l.metadata
        })),
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      });
    }

    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  } catch (error: any) {
    console.error('Admin GET route error:', error);
    const status = error.status || 500;
    const msg = error.message || 'Internal server error';
    return NextResponse.json({ error: msg }, { status });
  }
}

// POST Route handlers
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const session = await requireRole(request, 'admin');
    const { slug } = await params;

    // Settlements actions
    if (slug[0] === 'settlements') {
      // 1. reset-batch
      if (slug[1] === 'reset-batch') {
        const { data: body, errorResponse } = await validateBody(request, z.any());
        if (errorResponse) return errorResponse;
        const batchId = body?.batchId;
        if (!batchId) return NextResponse.json({ error: 'batchId is required' }, { status: 400 });

        await supabaseAdmin
          .from('payouts')
          .update({
            status: 'READY_FOR_PAYOUT',
            failure_reason: null,
            failure_code: null,
            execution_lock_until: null,
            updated_at: new Date().toISOString()
          })
          .eq('settlement_batch_id', batchId)
          .neq('status', 'PAID');

        await supabaseAdmin
          .from('settlement_batches')
          .update({
            status: 'READY_FOR_PAYOUT',
            updated_at: new Date().toISOString()
          })
          .eq('id', batchId);

        return NextResponse.json({ success: true, message: 'Batch reset to READY_FOR_PAYOUT' });
      }

      // 2. mark-ready
      if (slug[1] === 'mark-ready') {
        const { data: body, errorResponse } = await validateBody(request, z.any());
        if (errorResponse) return errorResponse;
        const { batchId } = body || {};
        if (!batchId) return NextResponse.json({ error: 'Missing batchId' }, { status: 400 });

        const { markReadyForPayout } = await import('@/lib/settlement-engine');
        const result = await markReadyForPayout(batchId, session.user_id);
        if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      // 3. execute
      if (slug[1] === 'execute') {
        const { data: body, errorResponse } = await validateBody(request, z.any());
        if (errorResponse) return errorResponse;
        const { batchId, preferredMode } = body || {};
        if (!batchId) return NextResponse.json({ error: 'Missing batchId' }, { status: 400 });

        const { PayoutService } = await import('@/lib/payouts/payout-service');
        const result = await PayoutService.executePayoutsForBatch(batchId, session.user_id, {
          preferredMode: preferredMode === 'banktransfer' ? 'banktransfer' : 'upi'
        });
        return NextResponse.json(result);
      }

      // 4. reconcile
      if (slug[1] === 'reconcile') {
        const { PayoutService } = await import('@/lib/payouts/payout-service');
        const result = await PayoutService.reconcilePayouts();
        return NextResponse.json(result);
      }

      // 5. bank-accounts (VERIFY / REJECT)
      if (slug[1] === 'bank-accounts') {
        const { data: body, errorResponse } = await validateBody(request, z.any());
        if (errorResponse) return errorResponse;
        const { accountId, action } = body || {};
        if (!accountId || !action) return NextResponse.json({ error: 'Missing accountId or action' }, { status: 400 });

        const isVerified = action === 'VERIFY';
        const { data: account, error: updateErr } = await supabaseAdmin
          .from('worker_bank_accounts')
          .update({ 
            is_verified: isVerified,
            verification_status: isVerified ? 'VERIFIED' : 'FAILED',
            is_primary: isVerified ? true : false,
            updated_at: new Date().toISOString() 
          })
          .eq('id', accountId)
          .select('worker_id')
          .single();

        if (updateErr || !account) throw updateErr;

        if (isVerified) {
          await supabaseAdmin
            .from('worker_bank_accounts')
            .delete()
            .eq('worker_id', account.worker_id)
            .neq('id', accountId);

          try {
            const { DefaultPayoutProvider } = await import('@/lib/payouts/payout-provider');
            const provider = new DefaultPayoutProvider();
            const { data: fullAcc } = await supabaseAdmin
              .from('worker_bank_accounts')
              .select('*')
              .eq('id', accountId)
              .single();

            if (fullAcc) {
              const { data: userRec } = await supabaseAdmin
                .from('users')
                .select('full_name, email, phone')
                .eq('id', fullAcc.worker_id)
                .maybeSingle();

              const userName = userRec?.full_name || fullAcc.account_holder_name || 'Volo Partner';
              const userEmail = userRec?.email || '';
              const userPhone = userRec?.phone || '';

              const bankAccountWithContact = {
                ...fullAcc,
                phone: userPhone,
                email: userEmail,
                account_holder_name: userName,
              };

              const contactId = await provider.createContact(fullAcc.worker_id, userName, userEmail, userPhone);
              const fundAccountId = await provider.createFundAccount(contactId, bankAccountWithContact);
              await supabaseAdmin
                .from('worker_bank_accounts')
                .update({
                  beneficiary_id: fundAccountId,
                  provider_contact_id: contactId,
                  provider_fund_account_id: fundAccountId,
                  updated_at: new Date().toISOString()
                })
                .eq('id', accountId);
            }
          } catch (linkErr: any) {
            console.warn('[Auto-link on verify] Notice:', linkErr.message);
          }
        }

        return NextResponse.json({ success: true, is_verified: isVerified });
      }

      // 6. payout-status (single payout retry)
      if (slug[1] === 'payout-status') {
        const { data: body, errorResponse } = await validateBody(request, z.any());
        if (errorResponse) return errorResponse;
        const { payoutId } = body || {};
        if (!payoutId) return NextResponse.json({ error: 'payoutId is required' }, { status: 400 });

        const { data, error } = await supabaseAdmin
          .from('payouts')
          .update({
            status: 'READY_FOR_PAYOUT',
            failure_reason: null,
            failure_code: null,
            execution_lock_until: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', payoutId)
          .select()
          .single();

        if (error || !data) {
          return NextResponse.json({ error: error?.message || 'Payout not found' }, { status: 400 });
        }

        if (data.settlement_batch_id) {
          await supabaseAdmin
            .from('settlement_batches')
            .update({
              status: 'READY_FOR_PAYOUT',
              updated_at: new Date().toISOString()
            })
            .eq('id', data.settlement_batch_id);
        }

        return NextResponse.json({ success: true, message: 'Payout reset to READY_FOR_PAYOUT for retry' });
      }

      // 7. settlements root (POST to generate batch, or PATCH to update batch)
      if (slug.length === 1) {
        const { data: body } = await validateBody(request, z.any());
        // If batchId is present, this is an update (PATCH)
        if (body?.batchId) {
          const { batchId, batch_type, batch_reference, status } = body;
          const updateFields: any = { updated_at: new Date().toISOString() };
          if (batch_type) updateFields.batch_type = String(batch_type).toUpperCase();
          if (batch_reference) updateFields.batch_reference = String(batch_reference).trim();
          if (status) updateFields.status = String(status).toUpperCase();

          const { data, error } = await supabaseAdmin
            .from('settlement_batches')
            .update(updateFields)
            .eq('id', batchId)
            .select()
            .single();

          if (error) return NextResponse.json({ error: error.message }, { status: 400 });
          return NextResponse.json({ success: true, message: 'Settlement batch updated successfully', batch: data });
        } else {
          // Otherwise generate batch
          const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
          const batchType = (body?.batch_type || days[new Date().getDay()]).toUpperCase();
          const { generateSettlementBatch } = await import('@/lib/settlement-engine');
          const result = await generateSettlementBatch(batchType);
          return NextResponse.json(result);
        }
      }
    }

    // A.2 services/categories
    if (slug[0] === 'services' && slug[1] === 'categories' && slug.length === 2) {
      const { data: { name, icon_url, sort_order, skills }, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;

      if (!name) {
        return NextResponse.json({ error: 'Missing category name' }, { status: 400 });
      }

      const formattedName = toTitleCase(name);
      const formattedSkills = Array.isArray(skills) ? skills.map((s: string) => toTitleCase(s)) : [];

      const { data: newCategory, error } = await supabaseAdmin
        .from('service_categories')
        .insert({
          name: formattedName,
          icon_url: icon_url || null,
          sort_order: sort_order || 0,
          is_active: true,
          skills: formattedSkills
        })
        .select('*')
        .single();

      if (error || !newCategory) throw error;

      memoryCache.delete('customer_services_default');

      await logAuditAction({
        admin_id: session.user_id,
        action: AuditAction.SERVICE_CREATED,
        target_type: 'service_category',
        target_id: newCategory.id,
        metadata: { category_name: formattedName }
      });

      return NextResponse.json(newCategory);
    }

    // A.3 services/categories/[id]
    if (slug[0] === 'services' && slug[1] === 'categories' && slug.length === 3) {
      const categoryId = slug[2];
      const { data: updateFields, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;

      if (updateFields.name) {
        updateFields.name = toTitleCase(updateFields.name);
      }
      if (Array.isArray(updateFields.skills)) {
        updateFields.skills = updateFields.skills.map((s: string) => toTitleCase(s));
      }

      const { data: updatedCategory, error } = await supabaseAdmin
        .from('service_categories')
        .update(updateFields)
        .eq('id', categoryId)
        .select('*')
        .single();

      if (error || !updatedCategory) throw error;

      if (updateFields.is_active === false) {
        await supabaseAdmin
          .from('service_items')
          .update({ is_active: false })
          .eq('category_id', categoryId);
      }

      memoryCache.delete('customer_services_default');

      await logAuditAction({
        admin_id: session.user_id,
        action: AuditAction.SERVICE_UPDATED,
        target_type: 'service_category',
        target_id: categoryId,
        metadata: { updated_fields: Object.keys(updateFields) }
      });

      return NextResponse.json({ success: true, category: updatedCategory });
    }

    // A. services

    if (slug[0] === 'services' && slug.length === 1) {
      const { data: { category_id, name, description, base_price, estimated_mins, icon_url, skill_tag }, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;

      if (!category_id || !name || !base_price) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
      }

      const formattedName = toTitleCase(name);
      const formattedSkillTag = skill_tag ? toTitleCase(skill_tag) : null;

      const { data: newService, error } = await supabaseAdmin
        .from('service_items')
        .insert({
          category_id,
          name: formattedName,
          description,
          base_price,
          estimated_mins: estimated_mins || 60,
          icon_url: icon_url || null,
          skill_tag: formattedSkillTag,
          is_active: true
        })
        .select('*')
        .single();

      if (error || !newService) throw error;

      memoryCache.delete('customer_services_default');

      // Log audit action
      await logAuditAction({
        admin_id: session.user_id,
        action: AuditAction.SERVICE_CREATED,
        target_type: 'service',
        target_id: newService.id,
        metadata: { service_name: formattedName, base_price }
      });

      return NextResponse.json({ success: true, service: newService });
    }


    // B. manual-assignment
    if (slug[0] === 'manual-assignment' && slug.length === 1) {
      const { data: { booking_id, worker_id }, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;

      if (!booking_id || !worker_id) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
      }

      // Execute row-locked Postgres Transaction RPC
      const supabaseAdminAny: any = supabaseAdmin;
      const { data: assignResult, error: assignErr } = await supabaseAdminAny.rpc(
        'manual_assign_worker',
        {
          p_booking_id: booking_id,
          p_worker_id: worker_id,
          p_admin_id: session.user_id
        }
      );

      if (assignErr || !assignResult) {
        const errorMsg = assignErr?.message || '';
        if (errorMsg.includes('BOOKING_NOT_PEND')) {
          return NextResponse.json({ error: 'Booking is no longer pending assignment' }, { status: 409 });
        }
        if (errorMsg.includes('WORKER_NOT_AVAIL')) {
          return NextResponse.json({ error: 'Worker is no longer online or approved' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Assignment failed' }, { status: 500 });
      }

      // Send Firebase Cloud Notification payloads
      const customerId = (await supabaseAdmin.from('bookings').select('customer_id').eq('id', booking_id).single()).data?.customer_id;
      
      await Promise.all([
        dispatchNotification({
          userId: worker_id,
          type: 'BOOKING_REQUEST',
          title: 'New Manual Assignment',
          body: 'You have been manually assigned a new booking by the administrator.'
        }),
        dispatchNotification({
          userId: customerId,
          type: 'BOOKING_ACCEPTED',
          title: 'Worker Dispatched',
          body: 'A worker has been manually assigned to your service request.'
        })
      ]);

      // Write Audit Log
      await logAuditAction({
        admin_id: session.user_id,
        action: AuditAction.MANUAL_ASSIGNMENT,
        target_type: 'booking',
        target_id: booking_id,
        metadata: { worker_id, assigned_by: session.user_id }
      });

      return NextResponse.json({ success: true, message: 'Worker manually assigned successfully' });
    }

    // C. manual-assignment/reassign
    if (slug[0] === 'manual-assignment' && slug[1] === 'reassign') {
      const { data: { booking_id, new_worker_id }, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;

      if (!booking_id || !new_worker_id) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
      }

      const { data: currentBooking } = await supabaseAdmin
        .from('bookings')
        .select('worker_id, customer_id')
        .eq('id', booking_id)
        .single();

      const old_worker_id = currentBooking?.worker_id;

      // Execute row-locked Postgres Transaction RPC
      const supabaseAdminAny: any = supabaseAdmin;
      const { data: reassignResult, error: reassignErr } = await supabaseAdminAny.rpc(
        'manual_reassign_worker',
        {
          p_booking_id: booking_id,
          p_new_worker_id: new_worker_id,
          p_admin_id: session.user_id
        }
      );

      if (reassignErr || !reassignResult) {
        return NextResponse.json({ error: 'Reassignment failed' }, { status: 500 });
      }

      // Send notifications
      const notifyPromises = [
        dispatchNotification({
          userId: new_worker_id,
          type: 'BOOKING_REQUEST',
          title: 'New Job Assigned',
          body: 'You have been reassigned a manual booking request.'
        }),
        dispatchNotification({
          userId: currentBooking?.customer_id,
          type: 'BOOKING_ACCEPTED',
          title: 'Worker Reassigned',
          body: 'A new worker has been assigned to your booking request.'
        })
      ];

      if (old_worker_id) {
        notifyPromises.push(
          dispatchNotification({
            userId: old_worker_id,
            type: 'BOOKING_REJECTED',
            title: 'Job Unassigned',
            body: 'You have been unassigned from the booking.'
          })
        );
      }

      await Promise.all(notifyPromises);

      // Write Audit Log
      await logAuditAction({
        admin_id: session.user_id,
        action: AuditAction.MANUAL_REASSIGNMENT,
        target_type: 'booking',
        target_id: booking_id,
        metadata: { old_worker_id, new_worker_id, reassigned_by: session.user_id }
      });

      return NextResponse.json({ success: true, message: 'Worker reassigned successfully' });
    }

    // D. workers/kyc or workers/[id]/kyc
    if (slug[0] === 'workers' && (slug[1] === 'kyc' || (slug.length === 3 && slug[2] === 'kyc'))) {
      const { data: body, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;
      const workerId = slug.length === 3 ? slug[1] : body.workerId;
      const { action, reason, fieldApproval } = body;

      if (!workerId || !action) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
      }

      if (!['APPROVE', 'REJECT', 'REQUEST_RESUBMISSION'].includes(action)) {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }

      const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

      const { data: updatedWorker, error } = await supabaseAdmin
        .from('workers')
        .update({ kyc_status: status })
        .eq('id', workerId)
        .select('*')
        .single();

      if (error) throw error;

      if (action === 'APPROVE') {
        const { createWallet, creditWorkerKycWelcomeBonus } = await import('@/lib/wallet-engine');
        await createWallet(workerId);
        await creditWorkerKycWelcomeBonus(workerId);
      }

      // Update overall kyc checklist and remarks in worker_kyc table
      await supabaseAdmin
        .from('worker_kyc')
        .update({
          overall_status: status,
          remarks: reason || null,
          reviewed_by: session.user_id,
          reviewed_at: new Date().toISOString()
        })
        .eq('worker_id', workerId);

      // Update specific checklists if fieldApproval is provided
      if (fieldApproval) {
        const kycFieldsToUpdate: any = {
          aadhaar_status: fieldApproval.aadhaar || status,
          pan_status: fieldApproval.pan || status,
          selfie_status: fieldApproval.selfie || status
        };
        if (fieldApproval.certificate) {
          kycFieldsToUpdate.certificate_status = fieldApproval.certificate;
        }

        await supabaseAdmin
          .from('worker_kyc')
          .update(kycFieldsToUpdate)
          .eq('worker_id', workerId);

        // Update individual document statuses in worker_documents
        const docTypes = {
          aadhaar: ['AADHAAR_FRONT', 'AADHAAR_BACK'],
          pan: ['PAN_CARD'],
          selfie: ['SELFIE_VERIFICATION'],
          certificate: ['EXPERIENCE_CERTIFICATE', 'CERTIFICATE']
        };

        for (const [field, types] of Object.entries(docTypes)) {
          const fieldStatus = fieldApproval[field as keyof typeof docTypes];
          if (fieldStatus) {
            await supabaseAdmin
              .from('worker_documents')
              .update({ status: fieldStatus })
              .eq('worker_id', workerId)
              .in('document_type', types);
          }
        }
      } else if (action === 'APPROVE') {
        // Auto-approve all documents when approving KYC
        await supabaseAdmin
          .from('worker_kyc')
          .update({
            aadhaar_status: 'APPROVED',
            pan_status: 'APPROVED',
            selfie_status: 'APPROVED'
          })
          .eq('worker_id', workerId);

        await supabaseAdmin
          .from('worker_documents')
          .update({ status: 'APPROVED' })
          .eq('worker_id', workerId);
      }

      // Dispatch alert notification
      await dispatchNotification({
        userId: workerId,
        type: action === 'APPROVE' ? 'KYC_APPROVED' : 'KYC_REJECTED',
        title: action === 'APPROVE' ? 'KYC Approved' : 'KYC Status Update',
        body: action === 'APPROVE'
          ? 'Congratulations! Your profile KYC registration is approved.'
          : `KYC Review Update. Remarks: ${reason || 'Document verification updated.'}`
      });

      // Write Audit Log
      await logAuditAction({
        admin_id: session.user_id,
        action: action === 'APPROVE' ? AuditAction.WORKER_KYC_APPROVED : AuditAction.WORKER_KYC_REJECTED,
        target_type: 'worker',
        target_id: workerId,
        metadata: { action, reason }
      });

      return NextResponse.json({ success: true, worker: updatedWorker });
    }

    // D.1 workers/[id]/kyc-sync
    if (slug[0] === 'workers' && slug.length === 3 && slug[2] === 'kyc-sync') {
      const workerId = slug[1];

      const { data: worker, error: workerErr } = await supabaseAdmin
        .from('workers')
        .select('kyc_status')
        .eq('id', workerId)
        .single();

      if (workerErr || !worker) {
        return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
      }

      const kycSync = await getWorkerKycSync(workerId, worker.kyc_status);
      if (!kycSync.can_sync) {
        return NextResponse.json(
          { error: kycSync.reason || 'KYC status is already in sync.' },
          { status: 400 }
        );
      }

      if (worker.kyc_status === 'APPROVED' && kycSync.portal_status !== 'APPROVED') {
        // Sync portal status and all documents to APPROVED
        await supabaseAdmin
          .from('worker_kyc')
          .update({
            overall_status: 'APPROVED',
            aadhaar_status: 'APPROVED',
            pan_status: 'APPROVED',
            selfie_status: 'APPROVED',
            reviewed_by: session.user_id,
            reviewed_at: new Date().toISOString()
          })
          .eq('worker_id', workerId);

        await supabaseAdmin
          .from('worker_documents')
          .update({ status: 'APPROVED' })
          .eq('worker_id', workerId);

        await logAuditAction({
          admin_id: session.user_id,
          action: AuditAction.WORKER_KYC_APPROVED,
          target_type: 'worker',
          target_id: workerId,
          metadata: {
            action: 'SYNC_TO_WORKER_KYC',
            previous_portal_status: kycSync.portal_status,
            reviewed_at: new Date().toISOString(),
          }
        });

        return NextResponse.json({ success: true, kyc_status: 'APPROVED', portal_status: 'APPROVED' });
      } else {
        const { error: updateErr } = await supabaseAdmin
          .from('workers')
          .update({ kyc_status: 'APPROVED' })
          .eq('id', workerId);

        if (updateErr) throw updateErr;

        const { createWallet, creditWorkerKycWelcomeBonus } = await import('@/lib/wallet-engine');
        await createWallet(workerId);
        await creditWorkerKycWelcomeBonus(workerId);

        await logAuditAction({
          admin_id: session.user_id,
          action: AuditAction.WORKER_KYC_APPROVED,
          target_type: 'worker',
          target_id: workerId,
          metadata: {
            action: 'SYNC_FROM_WORKER_KYC',
            previous_status: worker.kyc_status,
            reviewed_at: kycSync.reviewed_at,
          }
        });

        return NextResponse.json({ success: true, kyc_status: 'APPROVED' });
      }
    }

    // D.2 workers/[id]/status
    if (slug[0] === 'workers' && slug.length === 3 && slug[2] === 'status') {
      const workerId = slug[1];
      const { data: { action }, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;

      if (!action || !['ACTIVATE', 'SUSPEND'].includes(action)) {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }

      const isActive = action === 'ACTIVATE';

      const { data: updatedUser, error } = await supabaseAdmin
        .from('users')
        .update({ is_active: isActive })
        .eq('id', workerId)
        .select('*')
        .single();

      if (error) throw error;

      // Write Audit Log
      await logAuditAction({
        admin_id: session.user_id,
        action: isActive ? AuditAction.WORKER_ACTIVATED : AuditAction.WORKER_SUSPENDED,
        target_type: 'worker',
        target_id: workerId,
        metadata: { action }
      });

      return NextResponse.json({ success: true, user: updatedUser });
    }

    // D.3 workers/[id]/categories
    if (slug[0] === 'workers' && slug.length === 3 && slug[2] === 'categories') {
      const workerId = slug[1];
      const { data: { categoryIds }, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;

      if (!Array.isArray(categoryIds)) {
        return NextResponse.json({ error: 'categoryIds must be an array' }, { status: 400 });
      }

      const { data: updatedWorker, error } = await supabaseAdmin
        .from('workers')
        .update({ service_category_ids: categoryIds, updated_at: new Date().toISOString() })
        .eq('id', workerId)
        .select('*')
        .single();

      if (error) throw error;

      // Write Audit Log
      await logAuditAction({
        admin_id: session.user_id,
        action: AuditAction.SETTINGS_UPDATED,
        target_type: 'worker',
        target_id: workerId,
        metadata: { service_category_ids: categoryIds }
      });

      return NextResponse.json({ success: true, worker: updatedWorker });
    }

    // E. bookings/[id]/cancel
    if (slug[0] === 'bookings' && slug.length === 3 && slug[2] === 'cancel') {
      const bookingId = slug[1];
      const { data: { reason }, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;

      if (!bookingId) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
      }

      const { data: booking, error: fetchErr } = await supabaseAdmin
        .from('bookings')
        .select('worker_id, customer_id')
        .eq('id', bookingId)
        .single();

      if (fetchErr) throw fetchErr;

      const { error: cancelErr } = await supabaseAdmin
        .from('bookings')
        .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (cancelErr) throw cancelErr;

      // Revert worker status to ONLINE if they were matched
      if (booking?.worker_id) {
        await supabaseAdmin
          .from('workers')
          .update({ status: 'ONLINE' })
          .eq('id', booking.worker_id);

        await dispatchNotification({
          userId: booking.worker_id,
          type: 'BOOKING_REJECTED',
          title: 'Booking Cancelled',
          body: `Job booking ${bookingId} was cancelled by administrator.`
        });
      }

      await dispatchNotification({
        userId: booking?.customer_id,
        type: 'BOOKING_REJECTED',
        title: 'Booking Cancelled',
        body: `Your booking request was cancelled by the administrator. Reason: ${reason}`
      });

      // Write Audit Log
      await logAuditAction({
        admin_id: session.user_id,
        action: AuditAction.BOOKING_CANCELLED,
        target_type: 'booking',
        target_id: bookingId,
        metadata: { reason }
      });

      return NextResponse.json({ success: true, status: 'CANCELLED' });
    }

    // E. services/[id]
    if (slug[0] === 'services' && slug.length === 2) {
      const serviceId = slug[1];
      const { data: updateFields, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;

      if (updateFields.name) {
        updateFields.name = toTitleCase(updateFields.name);
      }
      if (updateFields.skill_tag) {
        updateFields.skill_tag = toTitleCase(updateFields.skill_tag);
      }

      const { data: updatedService, error } = await supabaseAdmin
        .from('service_items')
        .update(updateFields)
        .eq('id', serviceId)
        .select('*')
        .single();

      if (error) throw error;

      memoryCache.delete('customer_services_default');

      // Write Audit Log
      await logAuditAction({
        admin_id: session.user_id,
        action: AuditAction.SERVICE_UPDATED,
        target_type: 'service',
        target_id: serviceId,
        metadata: { updated_fields: Object.keys(updateFields) }
      });

      return NextResponse.json({ success: true, service: updatedService });
    }

    // F. settings
    if (slug[0] === 'settings' && slug.length === 1) {
      const { data: settingsPayload, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;

      // Ensure late cancellation fee operation is strictly disabled across the platform
      if (settingsPayload.customer_cancellation_travel_fee !== undefined) {
        settingsPayload.customer_cancellation_travel_fee = '0';
      }

      // Get old settings values first for audit logs comparison
      const { data: oldSettings } = await supabaseAdmin.from('platform_settings').select('*');
      const oldMap: Record<string, string> = {};
      (oldSettings || []).forEach((s: any) => {
        oldMap[s.key] = s.value;
      });

      // Write transaction-style updates in loops
      const promises = Object.entries(settingsPayload).map(([key, val]) => {
        return supabaseAdmin
          .from('platform_settings')
          .upsert({ 
            key, 
            value: String(val), 
            updated_by: session.user_id, 
            updated_at: new Date().toISOString() 
          }, { onConflict: 'key' });
      });

      await Promise.all(promises);

      // Write Audit Log
      await logAuditAction({
        admin_id: session.user_id,
        action: AuditAction.SETTINGS_UPDATED,
        metadata: {
          changed_keys: Object.keys(settingsPayload),
          old_values: oldMap,
          new_values: settingsPayload
        }
      });

      return NextResponse.json({ success: true, settings: settingsPayload });
    }

    // G.1.5 customers/[id] - Edit Customer Details or Status
    if (slug[0] === 'customers' && slug.length === 2) {
      const customerId = slug[1];
      const { data: body, errorResponse } = await validateBody(request, z.any());
      if (errorResponse) return errorResponse;

      const updateData: any = {};
      if (body.full_name !== undefined) updateData.full_name = body.full_name;
      if (body.email !== undefined) updateData.email = body.email;
      if (body.phone !== undefined) updateData.phone = body.phone;
      if (body.is_active !== undefined) updateData.is_active = Boolean(body.is_active);

      const { data: updatedUser, error } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', customerId)
        .select('*')
        .single();

      if (error) throw error;

      if (updateData.is_active !== undefined) {
        await logAuditAction({
          admin_id: session.user_id,
          action: updateData.is_active ? AuditAction.CUSTOMER_ACTIVATED : AuditAction.CUSTOMER_DEACTIVATED,
          target_type: 'customer',
          target_id: customerId,
          metadata: { updated_fields: Object.keys(updateData) }
        });
      }

      return NextResponse.json({ success: true, customer: updatedUser, user: updatedUser });
    }

    // G.2 customers/[id]/status
    if (slug[0] === 'customers' && slug.length === 3 && slug[2] === 'status') {
      const customerId = slug[1];
      const { data: { action }, errorResponse } = await validateBody(request, z.any());
      if (errorResponse) return errorResponse;

      if (!action || !['ACTIVATE', 'DEACTIVATE', 'SUSPEND'].includes(action)) {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }

      const isActive = action === 'ACTIVATE';

      const { data: updatedUser, error } = await supabaseAdmin
        .from('users')
        .update({ is_active: isActive })
        .eq('id', customerId)
        .select('*')
        .single();

      if (error) throw error;

      await logAuditAction({
        admin_id: session.user_id,
        action: isActive ? AuditAction.CUSTOMER_ACTIVATED : AuditAction.CUSTOMER_DEACTIVATED,
        target_type: 'customer',
        target_id: customerId,
        metadata: { action }
      });

      return NextResponse.json({ success: true, user: updatedUser });
    }

    // G.3 deletion-requests
    if (slug[0] === 'deletion-requests' && slug.length === 1) {
      const body = await request.json();
      const { requestId, action, notes } = body;

      if (!requestId || !['APPROVE_PURGE', 'REJECT'].includes(action)) {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }

      const { data: reqItem, error: reqErr } = await supabaseAdmin
        .from('account_deletion_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (reqErr || !reqItem) {
        return NextResponse.json({ error: 'Deletion request not found' }, { status: 404 });
      }

      if (action === 'REJECT') {
        await supabaseAdmin
          .from('account_deletion_requests')
          .update({
            status: 'REJECTED',
            admin_notes: notes || 'Rejected by admin',
            processed_at: new Date().toISOString(),
            processed_by: session.user_id,
          })
          .eq('id', requestId);

        return NextResponse.json({ success: true, message: 'Request rejected' });
      }

      if (action === 'APPROVE_PURGE') {
        let targetUserId = reqItem.user_id;
        if (!targetUserId && reqItem.phone) {
          const { data: u } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('phone', reqItem.phone)
            .maybeSingle();
          if (u) targetUserId = u.id;
        }

        if (targetUserId) {
          await supabaseAdmin
            .from('users')
            .update({
              full_name: 'Deactivated User',
              email: null,
              phone: `+910000000000_deleted_${targetUserId.slice(0, 8)}`,
              avatar_url: null,
              is_active: false,
              is_suspended: true,
            })
            .eq('id', targetUserId);

          try {
            await supabaseAdmin
              .from('workers')
              .update({ status: 'OFFLINE', is_available: false })
              .eq('id', targetUserId);
          } catch (e) {
            // ignore if table not present
          }

          try {
            await supabaseAdmin
              .from('customer_addresses')
              .delete()
              .eq('customer_id', targetUserId);
          } catch (e) {
            // ignore if table not present
          }

          try {
            await supabaseAdmin
              .from('fcm_tokens')
              .delete()
              .eq('user_id', targetUserId);
          } catch (e) {
            // ignore if table not present
          }
        }


        await supabaseAdmin
          .from('account_deletion_requests')
          .update({
            status: 'PROCESSED',
            admin_notes: notes || 'Personal data purged by admin',
            processed_at: new Date().toISOString(),
            processed_by: session.user_id,
          })
          .eq('id', requestId);

        return NextResponse.json({ success: true, message: 'Account data successfully purged' });
      }
    }

    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  } catch (error: any) {
    console.error('Admin PATCH route error:', error);
    const status = error.status || 500;
    const msg = error.message || 'Internal server error';
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string[] }> }
) {
  return POST(request, context);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ slug: string[] }> }
) {
  return POST(request, context);
}

// DELETE Route handlers
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const session = await requireRole(request, 'admin');
    const { slug } = await params;

    // Settlements batch delete
    if (slug[0] === 'settlements') {
      const { searchParams } = new URL(request.url);
      const batchId = searchParams.get('batchId') || (slug.length === 2 ? slug[1] : null);

      if (!batchId) {
        return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
      }

      const { data: batch, error: fetchErr } = await supabaseAdmin
        .from('settlement_batches')
        .select('id, status, batch_reference')
        .eq('id', batchId)
        .single();

      if (fetchErr || !batch) {
        return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
      }

      if (batch.status === 'PAID') {
        return NextResponse.json({ error: 'Cannot delete a completed/paid settlement batch.' }, { status: 400 });
      }

      await supabaseAdmin
        .from('settlement_ledger')
        .update({ settlement_batch_id: null, status: 'PENDING' })
        .eq('settlement_batch_id', batchId);

      await supabaseAdmin
        .from('payouts')
        .delete()
        .eq('settlement_batch_id', batchId);

      const { error: delErr } = await supabaseAdmin
        .from('settlement_batches')
        .delete()
        .eq('id', batchId);

      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 400 });
      }

      return NextResponse.json({ 
        success: true, 
        message: `Batch ${batch.batch_reference} deleted successfully. Associated ledger items have been reverted to PENDING.` 
      });
    }

    // A. services/[id] (Try Hard Delete first, Fallback to Soft Delete if used in bookings)
    if (slug[0] === 'services' && slug.length === 2) {
      const serviceId = slug[1];

      // Try hard delete first
      const { error: deleteErr } = await supabaseAdmin
        .from('service_items')
        .delete()
        .eq('id', serviceId);

      if (deleteErr) {
        if (deleteErr.code === '23503') {
          // Fallback to soft-deactivating if referenced by bookings
          const { data: service, error: updateErr } = await supabaseAdmin
            .from('service_items')
            .update({ is_active: false })
            .eq('id', serviceId)
            .select('name')
            .single();

          if (updateErr) throw updateErr;

          memoryCache.delete('customer_services_default');

          // Write Audit Log
          await logAuditAction({
            admin_id: session.user_id,
            action: AuditAction.SERVICE_DELETED,
            target_type: 'service',
            target_id: serviceId,
            metadata: { service_name: service?.name, type: 'soft_delete_due_to_bookings' }
          });

          return NextResponse.json({ 
            success: true, 
            message: 'Service is referenced by bookings. It was deactivated/soft-deleted instead.' 
          });
        }
        throw deleteErr;
      }

      memoryCache.delete('customer_services_default');

      // Write Audit Log for hard delete
      await logAuditAction({
        admin_id: session.user_id,
        action: AuditAction.SERVICE_DELETED,
        target_type: 'service',
        target_id: serviceId,
        metadata: { type: 'hard_delete' }
      });

      return NextResponse.json({ success: true, message: 'Service deleted permanently' });
    }

    // B. services/categories/[id]
    if (slug[0] === 'services' && slug[1] === 'categories' && slug.length === 3) {
      const categoryId = slug[2];

      // Try hard delete first
      const { error: deleteErr } = await supabaseAdmin
        .from('service_categories')
        .delete()
        .eq('id', categoryId);

      if (deleteErr) {
        if (deleteErr.code === '23503') {
          // Fallback to soft-deactivating if referenced by items/bookings
          const { data: category, error: updateErr } = await supabaseAdmin
            .from('service_categories')
            .update({ is_active: false })
            .eq('id', categoryId)
            .select('name')
            .single();

          if (updateErr) throw updateErr;

          // Cascade deactivation to all child service items
          await supabaseAdmin
            .from('service_items')
            .update({ is_active: false })
            .eq('category_id', categoryId);

          memoryCache.delete('customer_services_default');

          // Write Audit Log
          await logAuditAction({
            admin_id: session.user_id,
            action: AuditAction.SERVICE_DELETED,
            target_type: 'service_category',
            target_id: categoryId,
            metadata: { category_name: category?.name, type: 'soft_delete_due_to_items_or_bookings' }
          });

          return NextResponse.json({ 
            success: true, 
            message: 'Category is referenced by service items or bookings. It was deactivated/soft-deleted instead.' 
          });
        }
        throw deleteErr;
      }

      memoryCache.delete('customer_services_default');

      // Write Audit Log for hard delete
      await logAuditAction({
        admin_id: session.user_id,
        action: AuditAction.SERVICE_DELETED,
        target_type: 'service_category',
        target_id: categoryId,
        metadata: { type: 'hard_delete' }
      });

      return NextResponse.json({ success: true, message: 'Category deleted permanently' });
    }

    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  } catch (error: any) {
    console.error('Admin DELETE route error:', error);
    const status = error.status || 500;
    const msg = error.message || 'Internal server error';
    return NextResponse.json({ error: msg }, { status });
  }
}
