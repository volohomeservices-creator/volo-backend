import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { CashfreePayoutProvider } from '@/lib/payouts/cashfree-payout-provider';

export async function GET(request: Request) {
  try {
    const session = await requireRole(request, 'admin');
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to check balance' }, { status: 500 });
  }
}
