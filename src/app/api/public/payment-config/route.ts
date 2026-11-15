import { NextResponse } from 'next/server';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';
const supabaseAdmin: any = supabaseAdminOriginal;

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: settings, error } = await supabaseAdmin
      .from('platform_settings')
      .select('key, value');

    if (error) throw error;

    const map: Record<string, string> = {};
    (settings || []).forEach((s: any) => {
      map[s.key] = s.value;
    });

    return NextResponse.json({
      enable_cod_payment: map['enable_cod_payment'] !== 'false',
      enable_online_payment: map['enable_online_payment'] !== 'false',
      enable_wallet_payment: map['enable_wallet_payment'] !== 'false',
      min_customer_wallet_topup: Number(map['min_customer_wallet_topup'] || 100),
      max_customer_wallet_balance: Number(map['max_customer_wallet_balance'] || 10000),
      min_worker_wallet_topup: Number(map['min_worker_wallet_topup'] || 100),
      min_cod_wallet_balance: Number(map['min_cod_wallet_balance'] || 500),
      customer_cancellation_travel_fee: 0, // Late cancellation fee operations disabled across platform
      inspection_fee: Number(map['inspection_fee'] || 99),
      worker_noshow_penalty: Number(map['worker_noshow_penalty'] || 50),
      worker_noshow_apology_credit: Number(map['worker_noshow_apology_credit'] || 50)
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate'
      }
    });
  } catch (err: any) {
    return NextResponse.json({
      enable_cod_payment: true,
      enable_online_payment: true,
      enable_wallet_payment: true,
      min_customer_wallet_topup: 100,
      max_customer_wallet_balance: 10000,
      min_worker_wallet_topup: 100,
      min_cod_wallet_balance: 500,
      customer_cancellation_travel_fee: 0, // Late cancellation fee operations disabled across platform
      inspection_fee: 99,
      worker_noshow_penalty: 50,
      worker_noshow_apology_credit: 50
    });
  }
}
