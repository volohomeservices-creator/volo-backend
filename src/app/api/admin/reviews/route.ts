import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';

const supabaseAdmin: any = supabaseAdminOriginal;

export async function GET(request: Request) {
  try {
    await requireRole(request, 'admin');
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const status = searchParams.get('status')?.toUpperCase() || 'ALL'; // ALL, PENDING, APPROVED, REJECTED, FEATURED
    const search = (searchParams.get('search') || '').trim();
    const workerId = searchParams.get('worker_id');
    
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('reviews')
      .select(`
        id,
        rating,
        review_text,
        is_hidden,
        is_approved,
        is_featured,
        approval_status,
        would_recommend,
        created_at,
        approved_at,
        booking_id,
        bookings (
          id, 
          service_items (name)
        ),
        customer:users!reviews_customer_id_fkey (id, full_name, phone),
        worker:workers!reviews_worker_id_fkey (id, user:users!workers_id_fkey (full_name, phone))
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Status filter
    if (status === 'PENDING') {
      query = query.or('approval_status.eq.PENDING,is_approved.is.false').eq('is_hidden', false);
    } else if (status === 'APPROVED') {
      query = query.eq('is_approved', true).eq('is_hidden', false);
    } else if (status === 'REJECTED') {
      query = query.eq('approval_status', 'REJECTED');
    } else if (status === 'FEATURED') {
      query = query.eq('is_featured', true);
    } else if (status === 'HIDDEN') {
      query = query.eq('is_hidden', true);
    }

    if (workerId) {
      query = query.eq('worker_id', workerId);
    }

    query = query.range(offset, offset + limit - 1);

    const [{ data, error, count }, { data: allStats, error: statsErr }] = await Promise.all([
      query,
      supabaseAdmin
        .from('reviews')
        .select('id, rating, is_approved, is_featured, is_hidden, approval_status')
    ]);

    if (error) throw error;

    const formattedReviews = (data || []).map((row: any) => ({
      id: row.id,
      rating: Number(row.rating) || 5,
      comment: row.review_text || '',
      review_text: row.review_text || '',
      is_hidden: !!row.is_hidden,
      is_approved: !!row.is_approved,
      is_featured: !!row.is_featured,
      approval_status: row.approval_status || (row.is_approved ? 'APPROVED' : 'PENDING'),
      would_recommend: row.would_recommend ?? true,
      created_at: row.created_at,
      approved_at: row.approved_at,
      booking_id: row.booking_id,
      service_name: row.bookings?.service_items?.name || 'General Home Service',
      customer_name: row.customer?.full_name || 'Customer',
      customer_phone: row.customer?.phone || '',
      worker_name: row.worker?.user?.full_name || 'Service Partner',
      worker_phone: row.worker?.user?.phone || '',
      worker_id: row.worker?.id,
    }));

    // Filter by client search if provided
    let finalReviews = formattedReviews;
    if (search) {
      const lower = search.toLowerCase();
      finalReviews = formattedReviews.filter((r: any) => 
        r.customer_name.toLowerCase().includes(lower) ||
        r.worker_name.toLowerCase().includes(lower) ||
        r.service_name.toLowerCase().includes(lower) ||
        r.comment.toLowerCase().includes(lower) ||
        r.customer_phone.includes(lower)
      );
    }

    // Aggregate summary statistics
    const statsList = allStats || [];
    const totalReviews = statsList.length;
    const avgRating = totalReviews > 0
      ? (statsList.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0) / totalReviews).toFixed(1)
      : '5.0';
    const pendingCount = statsList.filter((r: any) => (r.approval_status === 'PENDING' || !r.is_approved) && !r.is_hidden && r.approval_status !== 'REJECTED').length;
    const approvedCount = statsList.filter((r: any) => r.is_approved && !r.is_hidden).length;
    const rejectedCount = statsList.filter((r: any) => r.approval_status === 'REJECTED').length;
    const featuredCount = statsList.filter((r: any) => r.is_featured).length;

    return NextResponse.json({
      reviews: finalReviews,
      total: count || 0,
      page,
      limit,
      stats: {
        total_reviews: totalReviews,
        avg_rating: parseFloat(avgRating),
        pending_count: pendingCount,
        approved_count: approvedCount,
        rejected_count: rejectedCount,
        featured_count: featuredCount,
      }
    });
  } catch (error: any) {
    console.error('Error fetching admin reviews:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
