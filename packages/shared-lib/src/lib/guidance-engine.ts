import {
  GuidanceRole,
  ProfileCompletionResult,
  ProfileCompletionItem,
  GuideDefinition,
  UserGuidanceProgress,
} from '@volo/shared-types';
import { supabaseAdmin } from './supabase-server';

// ─── Authoritative Customer Profile Completion ────────────────

export async function calculateCustomerCompletion(userId: string): Promise<ProfileCompletionResult> {
  const [userRes, addrRes] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('full_name, phone, email, avatar_url')
      .eq('id', userId)
      .single(),
    supabaseAdmin
      .from('customer_addresses')
      .select('id, address, latitude, longitude, is_default')
      .eq('customer_id', userId)
      .limit(10),
  ]);

  const user = userRes.data;
  const addresses = addrRes.data || [];
  const hasValidAddress = addresses.some(
    (a) => a.address && a.address.trim().length >= 3
  );

  const items: ProfileCompletionItem[] = [
    {
      id: 'phone',
      label: 'Verified Mobile Number',
      completed: Boolean(user?.phone && user.phone.trim().length >= 10),
      isMandatory: true,
      description: 'Your registered primary phone number for service communication.',
    },
    {
      id: 'name',
      label: 'Personal Information (Full Name)',
      completed: Boolean(user?.full_name && user.full_name.trim().length >= 2),
      isMandatory: true,
      targetRoute: '/profile',
      description: 'Provide your name so service captains and invoices address you correctly.',
    },
    {
      id: 'address',
      label: 'Default Service Address',
      completed: hasValidAddress,
      isMandatory: true,
      targetRoute: '/profile/addresses',
      description: 'Add your home or office address with accurate pin location for doorstep service.',
    },
    {
      id: 'email',
      label: 'Email Address (Optional)',
      completed: Boolean(user?.email && user.email.includes('@')),
      isMandatory: false,
      targetRoute: '/profile',
      description: 'Receive digital tax invoices and booking confirmations via email.',
    },
  ];

  const mandatoryItems = items.filter((i) => i.isMandatory);
  const completedMandatory = mandatoryItems.filter((i) => i.completed);
  const percentage = Math.round((completedMandatory.length / mandatoryItems.length) * 100);
  const isComplete = completedMandatory.length === mandatoryItems.length;

  const completedList = items.filter((i) => i.completed).map((i) => i.label);
  const missingList = items.filter((i) => !i.completed).map((i) => i.label);

  const firstIncomplete = items.find((i) => i.isMandatory && !i.completed);

  return {
    percentage,
    isComplete,
    completedItems: completedList,
    missingItems: missingList,
    items,
    nextStep: firstIncomplete ? firstIncomplete.label : null,
    nextRoute: firstIncomplete ? firstIncomplete.targetRoute || null : null,
  };
}

// ─── Authoritative Worker / Captain Profile Completion ────────

export async function calculateWorkerCompletion(userId: string): Promise<ProfileCompletionResult> {
  const [userRes, workerRes, docsRes, profileRes, kycRes, availRes] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('full_name, phone, email, avatar_url')
      .eq('id', userId)
      .single(),
    supabaseAdmin
      .from('workers')
      .select('id, service_category_ids, kyc_status, bank_account_number, bank_ifsc, status, aadhar_front_url, aadhar_back_url, pan_url, selfie_url')
      .eq('id', userId)
      .single(),
    supabaseAdmin
      .from('worker_documents')
      .select('document_type, status')
      .eq('worker_id', userId),
    supabaseAdmin
      .from('worker_profiles')
      .select('skills, city, experience')
      .eq('worker_id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('worker_kyc')
      .select('overall_status, aadhaar_status, pan_status, selfie_status')
      .eq('worker_id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('worker_availability')
      .select('worker_id, working_days')
      .eq('worker_id', userId)
      .maybeSingle(),
  ]);

  const user = userRes.data;
  const worker = workerRes.data;
  const workerDocs = docsRes.data || [];
  const profile = profileRes.data;
  const kyc = kycRes.data;
  const avail = availRes.data;

  const hasName = Boolean(user?.full_name && user.full_name.trim().length >= 2);
  const hasPhone = Boolean(user?.phone && user.phone.trim().length >= 10);
  const hasCategory = Boolean(
    (worker?.service_category_ids && worker.service_category_ids.length > 0) ||
      (profile?.skills && profile.skills.length > 0)
  );
  const hasBankDetails = Boolean(
    worker?.bank_account_number &&
      worker.bank_account_number.trim().length >= 6 &&
      worker?.bank_ifsc &&
      worker.bank_ifsc.trim().length >= 4
  );
  const hasAvailability = Boolean(
    avail && (!avail.working_days || avail.working_days.length > 0)
  );

  // Accurate KYC check across workers, worker_documents, and worker_kyc tables
  const hasKycApprovedStatus =
    worker?.kyc_status === 'APPROVED' || kyc?.overall_status === 'APPROVED';

  const hasDocumentFiles =
    workerDocs.length >= 3 ||
    Boolean(
      (worker?.aadhar_front_url || workerDocs.some((d) => d.document_type === 'AADHAAR_FRONT')) &&
        (worker?.pan_url || workerDocs.some((d) => d.document_type === 'PAN_CARD')) &&
        (worker?.selfie_url || workerDocs.some((d) => d.document_type === 'SELFIE_VERIFICATION'))
    );

  const hasKycDocs = hasKycApprovedStatus || hasDocumentFiles;

  const items: ProfileCompletionItem[] = [
    {
      id: 'phone',
      label: 'Verified Mobile Number',
      completed: hasPhone,
      isMandatory: true,
      description: 'Registered mobile number used for login and customer service calls.',
    },
    {
      id: 'name',
      label: 'Professional Profile Name',
      completed: hasName,
      isMandatory: true,
      targetRoute: '/profile',
      description: 'Your full legal name as it appears on government identification.',
    },
    {
      id: 'skills',
      label: 'Service Category & Skills',
      completed: hasCategory,
      isMandatory: true,
      targetRoute: '/skills',
      description: 'Select your primary trade and specializations to receive relevant jobs.',
    },
    {
      id: 'kyc',
      label: 'Identity & KYC Documents',
      completed: hasKycDocs,
      isMandatory: true,
      targetRoute: '/kyc',
      description: 'Upload Aadhaar, PAN, and live verification selfie for security compliance.',
    },
    {
      id: 'bank',
      label: 'Bank Account / Payout Setup',
      completed: hasBankDetails,
      isMandatory: true,
      targetRoute: '/payouts',
      description: 'Add your bank account number and IFSC code for direct earnings settlement.',
    },
    {
      id: 'availability',
      label: 'Duty Schedule & Availability',
      completed: hasAvailability,
      isMandatory: true,
      targetRoute: '/availability',
      description: 'Set your operational working hours and days of the week.',
    },
  ];

  const mandatoryItems = items.filter((i) => i.isMandatory);
  const completedMandatory = mandatoryItems.filter((i) => i.completed);
  const percentage = Math.round((completedMandatory.length / mandatoryItems.length) * 100);
  const isComplete = completedMandatory.length === mandatoryItems.length;

  const completedList = items.filter((i) => i.completed).map((i) => i.label);
  const missingList = items.filter((i) => !i.completed).map((i) => i.label);

  const firstIncomplete = items.find((i) => i.isMandatory && !i.completed);

  const kycStatus = worker?.kyc_status || 'PENDING';
  const isApproved = kycStatus === 'APPROVED';

  return {
    percentage,
    isComplete,
    isApproved,
    operationalStatus: kycStatus,
    completedItems: completedList,
    missingItems: missingList,
    items,
    nextStep: firstIncomplete ? firstIncomplete.label : null,
    nextRoute: firstIncomplete ? firstIncomplete.targetRoute || null : null,
  };
}

// ─── Authoritative Role-Specific Guide Definitions ────────────

export const CUSTOMER_GUIDES: GuideDefinition[] = [
  {
    id: 'customer_welcome_tour',
    role: 'customer',
    title: 'Customer Welcome & App Tour',
    description: 'Explore the key features of the VOLO Home Services app.',
    category: 'Getting Started',
    steps: [
      {
        id: 'home_overview',
        title: 'Home & Services',
        description:
          'Explore trusted home services including Electrician, Plumbing, AC Repair, Carpentry, Cleaning, and more.',
        targetId: 'home_categories_section',
        position: 'bottom',
        actionText: 'Next',
      },
      {
        id: 'search_services',
        title: 'Search & Quick Find',
        description:
          'Easily find any household service with instant price transparency and verified professionals.',
        targetId: 'search_bar_anchor',
        position: 'bottom',
        actionText: 'Next',
      },
      {
        id: 'my_bookings',
        title: 'Manage Bookings',
        description:
          'Track upcoming services, view booking history, live captain location, and digital invoices.',
        targetId: 'nav_bookings_tab',
        position: 'top',
        actionText: 'Next',
      },
      {
        id: 'support_help',
        title: 'Help & Guides',
        description:
          'Access quick guides, 24/7 customer support, and instant assistance whenever you need it.',
        targetId: 'help_guides_anchor',
        position: 'bottom',
        actionText: 'Get Started',
      },
    ],
  },
  {
    id: 'customer_booking_guide',
    role: 'customer',
    title: 'How to Book a Service',
    description: 'A step-by-step walkthrough of creating and confirming a booking.',
    category: 'Bookings',
    steps: [
      {
        id: 'pick_service',
        title: '1. Select Your Service',
        description:
          'Browse our service categories, choose the exact service you need, and review upfront pricing.',
        position: 'center',
      },
      {
        id: 'choose_address',
        title: '2. Select Service Address',
        description:
          'Pick your saved home address or pinpoint a new location on the map for doorstep service.',
        position: 'center',
      },
      {
        id: 'schedule_slot',
        title: '3. Instant or Scheduled',
        description:
          'Choose Instant for immediate captain dispatch, or pick a convenient future date and time slot.',
        position: 'center',
      },
      {
        id: 'payment_confirm',
        title: '4. Flexible Payment & Confirmation',
        description:
          'Pay safely online via UPI / Cards or choose Cash on Delivery upon service satisfaction.',
        position: 'center',
      },
    ],
  },
  {
    id: 'customer_tracking_guide',
    role: 'customer',
    title: 'Service Tracking & Safety',
    description: 'Understand live tracking, OTP verification, and safety protocols.',
    category: 'Safety & Tracking',
    steps: [
      {
        id: 'captain_assignment',
        title: '1. Captain Assigned',
        description:
          'A verified nearby professional accepts your request. You will see their name, photo, and rating.',
        position: 'center',
      },
      {
        id: 'live_eta',
        title: '2. Live Navigation & ETA',
        description:
          'Watch your Captain travel toward your doorstep in real time with an estimated arrival time.',
        position: 'center',
      },
      {
        id: 'otp_verification',
        title: '3. Secure Start OTP',
        description:
          'Provide the 4-digit security OTP to your Captain only after they arrive at your location.',
        position: 'center',
      },
      {
        id: 'completion_rating',
        title: '4. Review & Ratings',
        description:
          'Once the service is completed, inspect the work, receive your digital invoice, and leave feedback.',
        position: 'center',
      },
    ],
  },
];

export const WORKER_GUIDES: GuideDefinition[] = [
  {
    id: 'worker_welcome_tour',
    role: 'worker',
    title: 'Captain Dashboard Tour',
    description: 'Master your professional workspace, duty controls, and job flow.',
    category: 'Getting Started',
    steps: [
      {
        id: 'duty_status',
        title: 'Duty Switch (Online / Offline)',
        description:
          'Toggle your status to ONLINE when you are ready to receive job offers in your service area.',
        targetId: 'duty_switch_anchor',
        position: 'bottom',
        actionText: 'Next',
      },
      {
        id: 'available_jobs',
        title: 'Live Job Assignments',
        description:
          'Review incoming assignments, service details, payout amount, and distance before accepting.',
        targetId: 'job_offers_section',
        position: 'bottom',
        actionText: 'Next',
      },
      {
        id: 'earnings_wallet',
        title: 'Earnings & Wallet',
        description:
          'Track your daily earnings, commission balance, weekly settlements, and incentive bonuses.',
        targetId: 'earnings_overview_card',
        position: 'bottom',
        actionText: 'Next',
      },
      {
        id: 'profile_kyc',
        title: 'Profile & Verification',
        description:
          'Maintain your skills, documents, and bank details to keep your account active and verified.',
        targetId: 'captain_profile_anchor',
        position: 'top',
        actionText: 'Ready',
      },
    ],
  },
  {
    id: 'worker_job_lifecycle',
    role: 'worker',
    title: 'Job Lifecycle Guide',
    description: 'How to manage assignments from acceptance to final payment.',
    category: 'Job Operations',
    steps: [
      {
        id: 'accept_assignment',
        title: '1. Accept Assignment',
        description:
          'When a new job alert arrives, review the customer details and tap Accept within the countdown timer.',
        position: 'center',
      },
      {
        id: 'reach_location',
        title: '2. Travel to Customer',
        description:
          'Tap "Navigate" to open GPS directions. Tap "Arrived" once you reach the customer doorstep.',
        position: 'center',
      },
      {
        id: 'verify_otp',
        title: '3. Enter Start OTP',
        description:
          'Ask the customer for their 4-digit start OTP and enter it in the app before commencing work.',
        position: 'center',
      },
      {
        id: 'complete_settle',
        title: '4. Complete & Settle',
        description:
          'Mark the job complete, collect cash if COD, or let the customer pay online. Payout will credit to your account.',
        position: 'center',
      },
    ],
  },
  {
    id: 'worker_earnings_guide',
    role: 'worker',
    title: 'Earnings, Commission & Payouts',
    description: 'Understand how payments, commission wallet, and payouts work.',
    category: 'Finance',
    steps: [
      {
        id: 'earnings_breakdown',
        title: '1. Transparent Earnings',
        description:
          'You earn the majority of the service fee directly. All earnings are logged with itemized breakdowns.',
        position: 'center',
      },
      {
        id: 'commission_rules',
        title: '2. Commission Wallet',
        description:
          'Maintain a positive wallet balance for platform commission deduction. Top up easily via UPI.',
        position: 'center',
      },
      {
        id: 'direct_payouts',
        title: '3. Bank Payouts',
        description:
          'Completed job earnings are settled directly to your registered bank account on the scheduled cycle.',
        position: 'center',
      },
    ],
  },
];

// ─── Guidance Progress Persistence Helper ────────────────────

export async function getUserGuidanceProgress(
  userId: string,
  role: GuidanceRole
): Promise<UserGuidanceProgress> {
  const { data, error } = await supabaseAdmin
    .from('user_guidance_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('role', role)
    .maybeSingle();

  if (error || !data) {
    // Return default clean record if table or record doesn't exist
    return {
      user_id: userId,
      role,
      completed_guides: [],
      dismissed_guides: [],
      current_flow: null,
      current_step: null,
      flow_version: 1,
    };
  }

  return {
    id: data.id,
    user_id: data.user_id,
    role: data.role as GuidanceRole,
    completed_guides: Array.isArray(data.completed_guides) ? data.completed_guides : [],
    dismissed_guides: Array.isArray(data.dismissed_guides) ? data.dismissed_guides : [],
    current_flow: data.current_flow || null,
    current_step: data.current_step || null,
    flow_version: data.flow_version || 1,
    updated_at: data.updated_at,
  };
}

export async function updateUserGuidanceProgress(
  userId: string,
  role: GuidanceRole,
  updates: Partial<UserGuidanceProgress>
): Promise<UserGuidanceProgress> {
  const current = await getUserGuidanceProgress(userId, role);

  const completedGuides = Array.from(
    new Set([...current.completed_guides, ...(updates.completed_guides || [])])
  );
  const dismissedGuides = Array.from(
    new Set([...current.dismissed_guides, ...(updates.dismissed_guides || [])])
  );

  const payload = {
    user_id: userId,
    role,
    completed_guides: completedGuides,
    dismissed_guides: dismissedGuides,
    current_flow: updates.current_flow !== undefined ? updates.current_flow : current.current_flow,
    current_step: updates.current_step !== undefined ? updates.current_step : current.current_step,
    flow_version: updates.flow_version || current.flow_version || 1,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabaseAdmin
      .from('user_guidance_progress')
      .upsert(payload, { onConflict: 'user_id,role' })
      .select('*')
      .single();

    if (error) {
      console.warn('Guidance progress upsert warning (fallback in-memory):', error.message);
      return payload as UserGuidanceProgress;
    }

    return {
      id: data.id,
      user_id: data.user_id,
      role: data.role as GuidanceRole,
      completed_guides: data.completed_guides || [],
      dismissed_guides: data.dismissed_guides || [],
      current_flow: data.current_flow,
      current_step: data.current_step,
      flow_version: data.flow_version,
      updated_at: data.updated_at,
    };
  } catch (err: any) {
    console.warn('Guidance progress error (fallback in-memory):', err.message);
    return payload as UserGuidanceProgress;
  }
}
