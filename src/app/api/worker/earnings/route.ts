import { z } from 'zod';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { startOfDay, startOfWeek, startOfMonth, format, parseISO, isWithinInterval } from 'date-fns';

export async function GET(request: Request) {
  const cacheHeaders = { 'Cache-Control': 'no-store, max-age=0, must-revalidate' };
  try {
    const session = await requireRole(request, 'worker');
    const workerId = session.user_id;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week'; // today, week, month, custom
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';

    // Fetch all completed bookings for the worker
    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select('id, total_amount, completed_at')
      .eq('worker_id', workerId)
      .eq('status', 'COMPLETED');

    if (error) throw error;

    const now = new Date();
    let startDate = startOfWeek(now, { weekStartsOn: 1 }); // Default to week

    if (period === 'today') {
      startDate = startOfDay(now);
    } else if (period === 'month') {
      startDate = startOfMonth(now);
    } else if (period === 'custom' && dateFrom) {
      startDate = parseISO(dateFrom);
    }

    const endDate = (period === 'custom' && dateTo) ? parseISO(dateTo) : now;

    // Filter bookings by date range
    const filteredBookings = (bookings || []).filter((b: any) => {
      if (!b.completed_at) return false;
      const completedDate = parseISO(b.completed_at);
      return isWithinInterval(completedDate, { start: startDate, end: endDate });
    });

    // Compute metrics
    let totalGross = 0;
    let completedJobsCount = filteredBookings.length;

    filteredBookings.forEach((b: any) => {
      totalGross += Number(b.total_amount);
    });

    const totalEarnings = Number((totalGross * 0.85).toFixed(2));
    const commissionDeducted = Number((totalGross * 0.15).toFixed(2));
    const averagePerJob = completedJobsCount > 0 ? Number((totalEarnings / completedJobsCount).toFixed(2)) : 0;

    // Build chart data
    const chartMap: Record<string, number> = {};

    if (period === 'today') {
      // Group by hours (e.g. 09:00, 10:00, etc.)
      filteredBookings.forEach((b: any) => {
        const hour = format(parseISO(b.completed_at), 'hh a');
        chartMap[hour] = (chartMap[hour] || 0) + Number((b.total_amount * 0.85).toFixed(2));
      });
    } else if (period === 'week') {
      // Group by days of week (Mon, Tue, etc.)
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      days.forEach(d => { chartMap[d] = 0; });
      filteredBookings.forEach((b: any) => {
        const dayName = format(parseISO(b.completed_at), 'eee');
        chartMap[dayName] = (chartMap[dayName] || 0) + Number((b.total_amount * 0.85).toFixed(2));
      });
    } else {
      // Group by date (e.g. Jun 08, Jun 09)
      filteredBookings.forEach((b: any) => {
        const dayStr = format(parseISO(b.completed_at), 'MMM dd');
        chartMap[dayStr] = (chartMap[dayStr] || 0) + Number((b.total_amount * 0.85).toFixed(2));
      });
    }

    const chartData = Object.entries(chartMap).map(([label, value]) => ({
      label,
      value: Number(value.toFixed(2))
    }));

    // Compute all period totals for summary chips
    const startOfToday = startOfDay(now);
    const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
    const startOfThisMonth = startOfMonth(now);

    let todayGross = 0;
    let weekGross = 0;
    let monthGross = 0;
    let allTimeGross = 0;

    (bookings || []).forEach((b: any) => {
      const amt = Number(b.total_amount || 0);
      allTimeGross += amt;
      if (b.completed_at) {
        const d = parseISO(b.completed_at);
        if (d >= startOfToday) todayGross += amt;
        if (d >= startOfThisWeek) weekGross += amt;
        if (d >= startOfThisMonth) monthGross += amt;
      }
    });

    const todayEarnings = Number((todayGross * 0.85).toFixed(2));
    const weekEarnings = Number((weekGross * 0.85).toFixed(2));
    const monthEarnings = Number((monthGross * 0.85).toFixed(2));
    const allTimeEarnings = Number((allTimeGross * 0.85).toFixed(2));

    // Fetch actual database wallet balance for the worker
    let { data: wallet } = await supabaseAdmin
      .from('worker_wallets')
      .select('*')
      .eq('worker_id', workerId)
      .maybeSingle();

    if (!wallet) {
      // Auto-create wallet if it doesn't exist yet
      const { data: newWallet } = await supabaseAdmin
        .from('worker_wallets')
        .insert({ worker_id: workerId, balance: 0.00, minimum_balance: -500.00 })
        .select('*')
        .single();
      wallet = newWallet;
    }

    // Fetch last 20 wallet transactions or fallback to completed bookings
    const { data: txns } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: recentCompletedBookings } = await supabaseAdmin
      .from('bookings')
      .select('id, total_amount, completed_at, service_items(name)')
      .eq('worker_id', workerId)
      .eq('status', 'COMPLETED')
      .order('completed_at', { ascending: false })
      .limit(10);

    const bookingTxns = (recentCompletedBookings || []).map((b: any) => ({
      id: b.id,
      title: b.service_items?.name || 'Completed Service',
      amount: Number((b.total_amount * 0.85).toFixed(2)),
      created_at: b.completed_at,
      status: 'Paid',
      type: 'SERVICE_PAYOUT'
    }));

    const finalTransactions = txns && txns.length > 0 ? txns : bookingTxns;

    return NextResponse.json({
      summary: {
        total: totalEarnings,
        today: todayEarnings,
        week: weekEarnings,
        month: monthEarnings,
        allTime: allTimeEarnings,
        jobsCount: completedJobsCount,
        average: averagePerJob,
        decay: false,
        commission: commissionDeducted
      },
      chartData,
      earnings: {
        balance: wallet ? Number(wallet.balance) : 0,
        minimum_balance: wallet ? Math.abs(Number(wallet.minimum_balance)) : 500
      },
      transactions: finalTransactions
    }, { headers: cacheHeaders });
  } catch (error: any) {
    console.error('Error fetching worker earnings:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500, headers: cacheHeaders }
    );
  }
}

export async function POST(request: Request) {
  return NextResponse.json(
    { 
      error: 'Direct commission top-up is disabled. Please create a Razorpay order via POST /api/worker/wallet-topup and verify via POST /api/worker/wallet-topup/verify.' 
    },
    { status: 400 }
  );
}

