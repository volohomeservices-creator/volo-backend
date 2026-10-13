import { z } from 'zod';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';

const supabaseAdmin: any = supabaseAdminOriginal;

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, 'admin');
    const { id } = await props.params;
    const { data: body, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;
    const { action } = body;

    const updateData: Record<string, any> = {};

    switch (action) {
      case 'APPROVE':
        updateData.is_approved = true;
        updateData.approval_status = 'APPROVED';
        updateData.approved_at = new Date().toISOString();
        updateData.is_hidden = false;
        break;
      case 'REJECT':
        updateData.is_approved = false;
        updateData.approval_status = 'REJECTED';
        updateData.is_featured = false;
        break;
      case 'FEATURE':
        updateData.is_featured = true;
        updateData.is_approved = true;
        updateData.approval_status = 'APPROVED';
        updateData.is_hidden = false;
        break;
      case 'UNFEATURE':
        updateData.is_featured = false;
        break;
      case 'HIDE':
        updateData.is_hidden = true;
        break;
      case 'UNHIDE':
        updateData.is_hidden = false;
        break;
      default:
        return NextResponse.json({ error: 'Invalid moderation action.' }, { status: 400 });
    }

    const { data: updatedReview, error } = await supabaseAdmin
      .from('reviews')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Review ${action.toLowerCase()}d successfully.`,
      review: updatedReview
    });
  } catch (error: any) {
    console.error('Error updating review:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, 'admin');
    const { id } = await props.params;

    // Fetch review before deleting to check worker for rating recalculation
    const { data: review } = await supabaseAdmin
      .from('reviews')
      .select('worker_id')
      .eq('id', id)
      .single();

    const { error } = await supabaseAdmin
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Recalculate worker rating if worker_id was present
    if (review?.worker_id) {
      const { data: remainingReviews } = await supabaseAdmin
        .from('reviews')
        .select('rating')
        .eq('worker_id', review.worker_id);

      const count = remainingReviews?.length || 0;
      const newAvg = count > 0
        ? remainingReviews.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / count
        : 5.0;

      await supabaseAdmin
        .from('workers')
        .update({ rating: parseFloat(newAvg.toFixed(2)) })
        .eq('id', review.worker_id);
    }

    return NextResponse.json({ success: true, message: 'Review deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
