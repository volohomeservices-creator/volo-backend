import { workerProfileUpdateSchema } from '@/lib/schemas';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { generateCaptainUniqueId } from '@/lib/captain-id';

// helper to calculate profile completion
function getCompletionPercentage(user: any, profile: any) {
  let completedFields = 0;
  const totalFields = 10;

  if (user?.full_name) completedFields++;
  if (user?.email) completedFields++;
  if (user?.avatar_url) completedFields++;
  if (profile?.address) completedFields++;
  if (profile?.city) completedFields++;
  if (profile?.state) completedFields++;
  if (profile?.skills && profile.skills.length > 0) completedFields++;
  if (profile?.experience !== undefined && profile?.experience !== null) completedFields++;
  if (profile?.languages && profile.languages.length > 0) completedFields++;
  if (profile?.bio) completedFields++;

  return Math.round((completedFields / totalFields) * 100);
}

export async function GET(request: Request) {
  const cacheHeaders = { 'Cache-Control': 'no-store, max-age=0, must-revalidate' };
  try {
    const session = await requireRole(request, 'worker');
    const workerId = session.user_id;

    // Fetch user details
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('full_name, phone, email, avatar_url')
      .eq('id', workerId)
      .single();

    if (userErr || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: cacheHeaders });
    }

    // Fetch workers details (dob, worker_id_code, kyc_status, rating, status, service_category_ids, selfie_url)
    const [workerRes, reviewsRes] = await Promise.all([
      supabaseAdmin
        .from('workers')
        .select('dob, worker_id_code, kyc_status, rating, status, service_category_ids, selfie_url')
        .eq('id', workerId)
        .single(),
      supabaseAdmin
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('worker_id', workerId)
    ]);

    const worker = workerRes.data;
    const reviewsCount = reviewsRes.count ?? 0;

    // Fetch profile details
    let { data: profile } = await supabaseAdmin
      .from('worker_profiles')
      .select('*')
      .eq('worker_id', workerId)
      .maybeSingle();

    // Auto-provision if missing
    if (!profile) {
      const { data: newProfile } = await supabaseAdmin
        .from('worker_profiles')
        .insert({ worker_id: workerId, city: 'Hyderabad', state: 'Telangana' })
        .select()
        .single();
      profile = newProfile || {};
    }

    // Resolve service category names
    let categoryNames: string[] = [];
    if (worker?.service_category_ids && worker.service_category_ids.length > 0) {
      const { data: catRows } = await supabaseAdmin
        .from('service_categories')
        .select('name')
        .in('id', worker.service_category_ids);
      categoryNames = (catRows || []).map((c: any) => c.name);
    }

    // Generate signed URL for selfie if present
    let selfieSignedUrl = null;
    if (worker?.selfie_url) {
      const { data: signData } = await supabaseAdmin.storage
        .from('kyc-docs')
        .createSignedUrl(worker.selfie_url, 3600);
      selfieSignedUrl = signData?.signedUrl || null;
    }

    return NextResponse.json({
      full_name: user.full_name,
      phone: user.phone,
      email: user.email,
      avatar_url: user.avatar_url,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      skills: profile.skills || [],
      experience: profile.experience || 0,
      languages: profile.languages || [],
      bio: profile.bio || '',
      profileCompletion: getCompletionPercentage(user, profile),
      dob: worker?.dob || '',
      worker_id_code: worker?.worker_id_code || '',
      kyc_status: worker?.kyc_status || 'PENDING',
      status: worker?.status || 'OFFLINE',
      rating: Number(worker?.rating ?? 5.0),
      reviews_count: reviewsCount,
      service_categories: categoryNames,
      service_category_ids: worker?.service_category_ids || [],
      selfie_url: selfieSignedUrl || worker?.selfie_url || null,
      photo_url: selfieSignedUrl || user.avatar_url || null
    }, { headers: cacheHeaders });
  } catch (error: any) {
    console.error('Error fetching worker profile:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500, headers: cacheHeaders }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireRole(request, 'worker');
    const workerId = session.user_id;
    const validation = await validateBody(request, workerProfileUpdateSchema);
    if (!validation.success) return validation.errorResponse;
    const body = validation.data;

    const {
      full_name,
      email,
      avatar_url,
      address,
      city,
      state,
      skills,
      experience,
      languages,
      bio,
      dob
    } = body;

    // 1. Update user fields
    const { error: userErr } = await supabaseAdmin
      .from('users')
      .update({
        full_name,
        email,
        ...(avatar_url !== undefined && { avatar_url }),
        updated_at: new Date().toISOString()
      })
      .eq('id', workerId);

    if (userErr) {
      if (userErr.code === '23505' || userErr.message?.includes('users_email_key')) {
        return NextResponse.json({ error: 'This email address is already registered to another account.' }, { status: 409 });
      }
      throw userErr;
    }

    // 2. Update worker fields (dob, worker_id_code)
    if (dob || full_name) {
      const updateData: any = {};
      if (dob) updateData.dob = dob;

      // Generate worker_id_code if not already set (format: VT{Trade}{1001})
      const { data: currentWorker } = await supabaseAdmin
        .from('workers')
        .select('worker_id_code, service_category_ids')
        .eq('id', workerId)
        .single();
      
      if (!currentWorker?.worker_id_code) {
        const { data: wp } = await supabaseAdmin
          .from('worker_profiles')
          .select('skills')
          .eq('worker_id', workerId)
          .maybeSingle();

        let categoryNames: string[] = [];
        if (currentWorker?.service_category_ids && currentWorker.service_category_ids.length > 0) {
          const { data: catRows } = await supabaseAdmin
            .from('service_categories')
            .select('name')
            .in('id', currentWorker.service_category_ids);
          categoryNames = (catRows || []).map((c: any) => c.name);
        }

        const candidateCode = await generateCaptainUniqueId(
          supabaseAdmin,
          wp?.skills || [],
          categoryNames
        );
        updateData.worker_id_code = candidateCode;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: workerErr } = await supabaseAdmin
          .from('workers')
          .update(updateData)
          .eq('id', workerId);
        if (workerErr) throw workerErr;
      }
    }

    // 3. Update profile fields
    const targetCity = city || 'Bangalore';
    const targetState = state || 'Karnataka';

    const { error: profileErr } = await supabaseAdmin
      .from('worker_profiles')
      .upsert({
        worker_id: workerId,
        address,
        city: targetCity,
        state: targetState,
        skills: skills || [],
        experience: Number(experience || 0),
        languages: languages || [],
        bio,
        updated_at: new Date().toISOString()
      });

    if (profileErr) throw profileErr;

    // Geocode coordinates and update the workers table
    try {
      const fullAddress = `${address || ''}, ${targetCity}, ${targetState}`;
      const geocodeResult = await geocodeAddress(fullAddress, targetCity, targetState);
      let resolvedLat: number | null = null;
      let resolvedLng: number | null = null;

      if (geocodeResult) {
        resolvedLat = geocodeResult.lat;
        resolvedLng = geocodeResult.lng;
      }

      if (resolvedLat !== null && resolvedLng !== null) {
        await supabaseAdmin
          .from('workers')
          .update({
            current_lat: resolvedLat,
            current_lng: resolvedLng
          })
          .eq('id', workerId);
      }
    } catch (geoErr) {
      console.error('Error auto-geocoding address on profile patch:', geoErr);
    }

    // 4. Recalculate completion percentage
    const { data: user } = await supabaseAdmin.from('users').select('*').eq('id', workerId).single();
    const { data: profile } = await supabaseAdmin.from('worker_profiles').select('*').eq('worker_id', workerId).single();

    return NextResponse.json({
      success: true,
      profileCompletion: getCompletionPercentage(user, profile)
    });
  } catch (error: any) {
    console.error('Error updating worker profile:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}

async function geocodeAddress(address: string, city?: string, state?: string): Promise<{ lat: number; lng: number } | null> {
  const queryNominatim = async (q: string) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'VoloHomeServices/1.0 (contact@volo.com)'
        }
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          return { lat, lng: lon };
        }
      }
    } catch (error) {
      console.error('Nominatim geocoding error:', error);
    }
    return null;
  };

  let coords = await queryNominatim(address);
  if (coords) return coords;

  if (city && state) {
    coords = await queryNominatim(`${city}, ${state}`);
    if (coords) return coords;
  }

  if (city) {
    coords = await queryNominatim(city);
    if (coords) return coords;
  }

  if (state) {
    coords = await queryNominatim(state);
    if (coords) return coords;
  }

  return null;
}

export async function DELETE(request: Request) {
  try {
    const session = await requireRole(request, 'worker');
    const workerId = session.user_id;

    // Fetch worker details
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, full_name, phone, role')
      .eq('id', workerId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    // Check if there is already a PENDING request
    const { data: existingReq } = await supabaseAdmin
      .from('account_deletion_requests')
      .select('id, status, created_at')
      .eq('user_id', workerId)
      .eq('status', 'PENDING')
      .maybeSingle();

    if (existingReq) {
      return NextResponse.json({
        success: true,
        pending: true,
        message: 'Your account deactivation request is already under review by the admin team. Your account will remain active until approved.'
      });
    }

    // Create deletion request with PENDING status
    const { data: newReq, error: insertErr } = await supabaseAdmin
      .from('account_deletion_requests')
      .insert({
        user_id: workerId,
        phone: user.phone,
        role: 'worker',
        reason: 'Worker requested account deactivation via profile settings',
        requested_via: 'APP',
        status: 'PENDING'
      })
      .select('id')
      .single();

    if (insertErr) throw insertErr;

    // Alert all admins via notifications
    try {
      const { data: admins } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        const notifInserts = admins.map((admin: any) => ({
          user_id: admin.id,
          type: 'ADMIN_BROADCAST',
          title: '⚠️ Worker Account Deactivation Request',
          body: `Worker/Captain ${user.full_name || user.phone} has requested account deactivation. Pending admin approval.`,
          data: { type: 'ACCOUNT_DELETION_REQUEST', requestId: newReq?.id, role: 'worker' }
        }));
        await supabaseAdmin.from('notifications').insert(notifInserts);
      }
    } catch (notifErr) {
      console.warn('Failed to notify admins of worker deactivation request:', notifErr);
    }

    // DO NOT deactivate the account here! Account remains active until admin approval.
    return NextResponse.json({
      success: true,
      pending: true,
      message: 'Your account deactivation request has been submitted to the admin team for review. Your account remains active until approved.'
    });
  } catch (error: any) {
    console.error('Error submitting worker deactivation request:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}

