import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import {
  calculateCustomerCompletion,
  calculateWorkerCompletion,
  CUSTOMER_GUIDES,
  WORKER_GUIDES,
  getUserGuidanceProgress,
  updateUserGuidanceProgress,
} from '@/lib/guidance-engine';
import { GuidanceRole, GuidanceApiResponse } from '@volo/shared-types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireSession(request);
    const userId = session.user_id;
    const role: GuidanceRole = session.role === 'worker' ? 'worker' : 'customer';

    const [progress, completion] = await Promise.all([
      getUserGuidanceProgress(userId, role),
      role === 'worker' ? calculateWorkerCompletion(userId) : calculateCustomerCompletion(userId),
    ]);

    const guides = role === 'worker' ? WORKER_GUIDES : CUSTOMER_GUIDES;

    const response: GuidanceApiResponse = {
      progress,
      completion,
      guides,
    };

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    });
  } catch (error: any) {
    console.error('Error fetching guidance state:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Unauthorized or internal error' },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request);
    const userId = session.user_id;
    const role: GuidanceRole = session.role === 'worker' ? 'worker' : 'customer';

    const body = await request.json().catch(() => ({}));
    const { completed_guides, dismissed_guides, current_flow, current_step } = body;

    const updatedProgress = await updateUserGuidanceProgress(userId, role, {
      completed_guides: Array.isArray(completed_guides) ? completed_guides : undefined,
      dismissed_guides: Array.isArray(dismissed_guides) ? dismissed_guides : undefined,
      current_flow,
      current_step,
    });

    const completion =
      role === 'worker' ? await calculateWorkerCompletion(userId) : await calculateCustomerCompletion(userId);
    const guides = role === 'worker' ? WORKER_GUIDES : CUSTOMER_GUIDES;

    const response: GuidanceApiResponse = {
      progress: updatedProgress,
      completion,
      guides,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error updating guidance state:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Unauthorized or internal error' },
      { status: error.status || 500 }
    );
  }
}
