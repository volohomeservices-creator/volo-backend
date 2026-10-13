import Razorpay from 'razorpay';
import { ProviderNotConfiguredError } from './payout-errors';

import { PayoutProvider } from './payout-types';
export type { PayoutProvider };

export class RazorpayRoutePayoutProvider implements PayoutProvider {
  private getClient(): Razorpay | null {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    if (!keyId || !keySecret) return null;
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  private isMockMode(): boolean {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    return !keyId || !keySecret || keyId === '' || keySecret === '';
  }

  async createContact(workerId: string, name: string, email: string, phone: string): Promise<string> {
    if (this.isMockMode()) {
      console.log(`[Mock Payout Provider] Creating Route Linked Account for worker: ${workerId}`);
      return `acc_mock_${Math.random().toString(36).substring(2, 10)}`;
    }

    const rzp = this.getClient();
    if (!rzp) throw new ProviderNotConfiguredError('RAZORPAY_ROUTE');

    try {
      const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10) || '9999999999';
      const cleanEmail = email && email.includes('@') ? email : `worker.${workerId.slice(0, 8)}@voloapp.in`;
      const cleanName = (name || '').trim() || 'Service Professional';

      const account = await (rzp as any).accounts.create({
        email: cleanEmail,
        phone: cleanPhone,
        type: 'route',
        legal_business_name: cleanName,
        business_type: 'individual',
        contact_name: cleanName,
        profile: {
          category: 'services',
          subcategory: 'home_repair',
          addresses: {
            registered: {
              street1: 'Volo Network',
              city: 'Bengaluru',
              state: 'Karnataka',
              postal_code: '560001',
              country: 'IN'
            }
          }
        }
      });
      return account.id;
    } catch (err: any) {
      const desc = err.error?.description || err.message || 'Unknown error';
      console.error('[Razorpay Route] Failed to create linked account:', desc);
      if (desc.toLowerCase().includes('not enabled') || desc.toLowerCase().includes('route')) {
        throw new Error(`Razorpay Route feature is not enabled for your merchant account (${desc}). Please activate Route in your Razorpay dashboard or contact Razorpay support.`);
      }
      throw new Error(`Razorpay Route linked account creation failed: ${desc}`);
    }
  }

  async createFundAccount(contactId: string, bankAccountDetails: any): Promise<string> {
    if (this.isMockMode()) {
      console.log(`[Mock Payout Provider] Associating bank account with linked account: ${contactId}`);
      return `fa_mock_${Math.random().toString(36).substring(2, 10)}`;
    }
    // In Razorpay Route, the contactId (acc_...) is the Linked Account ID which receives transfers directly
    return contactId;
  }

  async createPayout(fundAccountId: string, amount: number, referenceId: string): Promise<{ providerPayoutId: string, status: string }> {
    if (this.isMockMode()) {
      console.log(`[Mock Payout Provider] Creating Route Transfer of ₹${amount} to account: ${fundAccountId}`);
      return {
        providerPayoutId: `trf_mock_${Math.random().toString(36).substring(2, 10)}`,
        status: 'processed'
      };
    }

    const rzp = this.getClient();
    if (!rzp) throw new ProviderNotConfiguredError('RAZORPAY_ROUTE');

    try {
      const amountInPaise = Math.round(Number(amount) * 100);
      const transfer = await (rzp as any).transfers.create({
        account: fundAccountId,
        amount: amountInPaise,
        currency: 'INR',
        notes: {
          payout_id: referenceId,
          platform: 'volo_marketplace'
        }
      });
      return {
        providerPayoutId: transfer.id,
        status: transfer.status || 'processed'
      };
    } catch (err: any) {
      console.error('[Razorpay Route] Transfer failed:', err);
      throw new Error(`Razorpay Route transfer failed: ${err.error?.description || err.message}`);
    }
  }

  async fetchPayoutStatus(providerPayoutId: string): Promise<{ status: string, utr: string | null, failureReason: string | null }> {
    if (this.isMockMode() || providerPayoutId.startsWith('trf_mock_') || providerPayoutId.startsWith('pout_mock_')) {
      return {
        status: 'processed',
        utr: `utr_mock_${Math.random().toString(36).substring(2, 10)}`,
        failureReason: null
      };
    }

    const rzp = this.getClient();
    if (!rzp) throw new ProviderNotConfiguredError('RAZORPAY_ROUTE');

    try {
      const transfer = await (rzp as any).transfers.fetch(providerPayoutId);
      return {
        status: transfer.status || 'processed',
        utr: transfer.recipient_settlement_id || transfer.id,
        failureReason: transfer.error || null
      };
    } catch (err: any) {
      return {
        status: 'failed',
        utr: null,
        failureReason: err.error?.description || err.message
      };
    }
  }

  async verifyBankAccount(bankAccountDetails: any): Promise<boolean> {
    const ifsc = (bankAccountDetails?.ifsc_code || '').trim().toUpperCase();
    const accountNo = (bankAccountDetails?.account_number || '').trim();
    const ifscValid = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
    const accountValid = /^\d{9,18}$/.test(accountNo);
    return ifscValid && accountValid;
  }
}

import { CashfreePayoutProvider } from './cashfree-payout-provider';
export { CashfreePayoutProvider };

export class DefaultPayoutProvider implements PayoutProvider {
  private activeProvider: PayoutProvider | null = null;

  private getProvider(): PayoutProvider {
    if (!this.activeProvider) {
      if (process.env.CASHFREE_CLIENT_ID) {
        this.activeProvider = new CashfreePayoutProvider();
      } else {
        this.activeProvider = new RazorpayRoutePayoutProvider();
      }
    }
    return this.activeProvider;
  }

  createContact(workerId: string, name: string, email: string, phone: string): Promise<string> {
    return this.getProvider().createContact(workerId, name, email, phone);
  }

  createFundAccount(contactId: string, bankAccountDetails: any): Promise<string> {
    return this.getProvider().createFundAccount(contactId, bankAccountDetails);
  }

  createPayout(fundAccountId: string, amount: number, referenceId: string): Promise<{ providerPayoutId: string; status: string; utr?: string | null; isLive?: boolean }> {
    return this.getProvider().createPayout(fundAccountId, amount, referenceId);
  }

  fetchPayoutStatus(providerPayoutId: string): Promise<{ status: string; utr: string | null; failureReason: string | null }> {
    return this.getProvider().fetchPayoutStatus(providerPayoutId);
  }

  verifyBankAccount(bankAccountDetails: any): Promise<boolean> {
    return this.getProvider().verifyBankAccount(bankAccountDetails);
  }
}


