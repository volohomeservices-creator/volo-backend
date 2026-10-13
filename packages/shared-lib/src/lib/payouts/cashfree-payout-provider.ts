import { PayoutProvider } from './payout-types';
import { ProviderNotConfiguredError } from './payout-errors';
import { decryptData } from '../crypto';

export class CashfreePayoutProvider implements PayoutProvider {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;
  private environment: 'production' | 'sandbox';
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0; // Unix timestamp in seconds

  constructor() {
    this.clientId = process.env.CASHFREE_CLIENT_ID || '';
    this.clientSecret = process.env.CASHFREE_CLIENT_SECRET || '';
    const env = (process.env.CASHFREE_ENV || 'production').toLowerCase();
    this.environment = env === 'sandbox' || env === 'test' ? 'sandbox' : 'production';
    this.baseUrl = this.environment === 'production'
      ? 'https://payout-api.cashfree.com'
      : 'https://payout-gamma.cashfree.com';
  }

  public isLiveEnabled(): boolean {
    return process.env.CASHFREE_LIVE_PAYOUTS_ENABLED === 'true';
  }

  public getEnvironment(): string {
    return this.environment;
  }

  /**
   * Authorizes with Cashfree Payouts API and retrieves/caches a Bearer token.
   */
  async authorize(): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new ProviderNotConfiguredError('CASHFREE');
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    // Reuse cached token if valid for at least 5 more minutes (300 seconds buffer)
    if (this.cachedToken && this.tokenExpiry > nowSeconds + 300) {
      return this.cachedToken;
    }

    try {
      const response = await fetch(`${this.baseUrl}/payout/v1/authorize`, {
        method: 'POST',
        headers: {
          'X-Client-Id': this.clientId,
          'X-Client-Secret': this.clientSecret,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data || data.status !== 'SUCCESS') {
        const errorMsg = data?.message || `Cashfree authorization failed with status ${response.status}`;
        const subCode = data?.subCode || response.status;
        console.error(`[Cashfree Payouts] Auth failed (${subCode}): ${errorMsg}`);
        throw new Error(`Cashfree Auth Error [${subCode}]: ${errorMsg}`);
      }

      this.cachedToken = data.data.token;
      // Expiry is in seconds (or relative); handle both
      const expiry = Number(data.data.expiry);
      this.tokenExpiry = expiry > nowSeconds ? expiry : nowSeconds + 7200;
      return this.cachedToken!;
    } catch (err: any) {
      console.error('[Cashfree Payouts] Authorization network/auth exception:', err.message);
      throw err;
    }
  }

  /**
   * Retrieves the current Cashfree Payout wallet balance.
   */
  async getBalance(): Promise<{ balance: number; availableBalance: number; currency: string; isLive: boolean; raw?: any }> {
    const isLive = this.isLiveEnabled();
    const token = await this.authorize();

    const response = await fetch(`${this.baseUrl}/payout/v1/getBalance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data || data.status !== 'SUCCESS') {
      const msg = data?.message || `Failed to fetch Cashfree balance (${response.status})`;
      throw new Error(`Cashfree Balance Error: ${msg}`);
    }

    return {
      balance: parseFloat(data.data.balance || '0'),
      availableBalance: parseFloat(data.data.availableBalance || data.data.balance || '0'),
      currency: 'INR',
      isLive,
      raw: data.data,
    };
  }

  /**
   * Internal helper to generate a safe, deterministic Cashfree Beneficiary ID.
   */
  private generateBeneId(workerId: string): string {
    const clean = workerId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 30);
    return `volo_${clean}`;
  }

  /**
   * Creates contact / beneficiary reference on Cashfree.
   */
  async createContact(workerId: string, name: string, email: string, phone: string): Promise<string> {
    return this.generateBeneId(workerId);
  }

  /**
   * Registers worker bank account as a beneficiary on Cashfree Payouts.
   */
  async createFundAccount(contactId: string, bankAccountDetails: any): Promise<string> {
    const beneId = contactId.startsWith('volo_') ? contactId : this.generateBeneId(contactId);

    // If live payouts disabled, return the simulated/registered beneId safely
    if (!this.isLiveEnabled()) {
      return beneId;
    }

    const token = await this.authorize();

    // Decrypt account number if encrypted
    let rawAccount = bankAccountDetails?.account_number || '';
    if (!rawAccount && bankAccountDetails?.account_number_encrypted) {
      try {
        rawAccount = decryptData(bankAccountDetails.account_number_encrypted);
      } catch (e) {
        console.error('[Cashfree Payouts] Failed to decrypt account number for beneficiary registration');
      }
    }

    const cleanAccount = String(rawAccount).trim();
    const cleanIfsc = String(bankAccountDetails?.ifsc_code || '').trim().toUpperCase();
    const cleanName = String(bankAccountDetails?.account_holder_name || 'Volo Partner').trim();
    const cleanPhone = String(bankAccountDetails?.phone || '9999999999').replace(/\D/g, '').slice(-10) || '9999999999';
    const cleanEmail = (bankAccountDetails?.email && bankAccountDetails.email.includes('@'))
      ? bankAccountDetails.email
      : `${beneId}@volopartner.in`;

    const payload = {
      beneId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      bankAccount: cleanAccount,
      ifsc: cleanIfsc,
      address1: 'VOLO Marketplace Partner Network',
    };

    const response = await fetch(`${this.baseUrl}/payout/v1/addBeneficiary`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    // If already exists (subCode 409 or message contains "already exist"), treat as successful association
    if (data?.subCode === '409' || (data?.message && data.message.toLowerCase().includes('already exist'))) {
      return beneId;
    }

    if (!response.ok || !data || data.status !== 'SUCCESS') {
      const msg = data?.message || `Beneficiary registration failed with status ${response.status}`;
      console.warn(`[Cashfree Payouts] Add Beneficiary warning (${data?.subCode}): ${msg}`);
      // If error is benign or already registered, proceed with beneId
      if (data?.subCode === '400' && msg.toLowerCase().includes('exist')) {
        return beneId;
      }
      throw new Error(`Cashfree Beneficiary Error: ${msg}`);
    }

    return beneId;
  }

  /**
   * Executes a payout transfer to the registered beneficiary.
   */
  async createPayout(
    fundAccountId: string,
    amount: number,
    referenceId: string
  ): Promise<{ providerPayoutId: string; status: string; utr?: string | null; isLive: boolean }> {
    const isLive = this.isLiveEnabled();

    // Guard: If live payouts disabled, simulate transfer safely without moving real money
    if (!isLive) {
      console.log(`[Cashfree Payouts Simulation] Transfer guarded (CASHFREE_LIVE_PAYOUTS_ENABLED=false). Simulating payout for reference: ${referenceId}`);
      const simReference = `cf_sim_${referenceId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`;
      return {
        providerPayoutId: simReference,
        status: 'simulation_ready',
        isLive: false,
      };
    }

    const token = await this.authorize();
    const transferId = `trf_${referenceId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;
    const formattedAmount = Number(amount).toFixed(2);

    const payload = {
      beneId: fundAccountId,
      amount: formattedAmount,
      transferId,
      transferMode: 'banktransfer',
      remarks: 'VOLO Weekly Settlement',
    };

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/payout/v1/requestTransfer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (networkErr: any) {
      // CRITICAL: A timeout or network error does not prove that a transfer failed.
      // Throw an error preserving the transferId so the payout engine records outcome as UNCERTAIN.
      console.error(`[Cashfree Payouts] Network error requesting transfer ${transferId}:`, networkErr);
      const uncertainErr: any = new Error(`Network timeout contacting Cashfree. Transfer may be pending with ID: ${transferId}`);
      uncertainErr.isUncertain = true;
      uncertainErr.transferId = transferId;
      throw uncertainErr;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok || !data) {
      const msg = data?.message || `Cashfree transfer request failed with HTTP ${response.status}`;
      console.error(`[Cashfree Payouts] Transfer rejected:`, msg);
      throw new Error(`Cashfree Transfer Error: ${msg}`);
    }

    if (data.status === 'ERROR') {
      throw new Error(`Cashfree Transfer Error [${data.subCode}]: ${data.message}`);
    }

    // Map Cashfree response status
    const cfStatus = (data.data?.status || data.status || 'PENDING').toUpperCase();
    let mappedStatus = 'processing';
    if (cfStatus === 'SUCCESS') mappedStatus = 'processed';
    else if (cfStatus === 'FAILED') mappedStatus = 'failed';
    else if (cfStatus === 'REVERSED') mappedStatus = 'reversed';

    const providerRef = data.data?.referenceId || transferId;
    return {
      providerPayoutId: providerRef,
      status: mappedStatus,
      utr: data.data?.utr || null,
      isLive: true,
    };
  }

  /**
   * Fetches the authoritative status of a transfer from Cashfree.
   */
  async fetchPayoutStatus(
    providerPayoutId: string
  ): Promise<{ status: string; utr: string | null; failureReason: string | null; raw?: any }> {
    if (providerPayoutId.startsWith('cf_sim_')) {
      return {
        status: 'simulation_ready',
        utr: null,
        failureReason: null,
      };
    }

    const token = await this.authorize();

    // Query status by referenceId or transferId
    const queryParam = providerPayoutId.startsWith('trf_')
      ? `transferId=${encodeURIComponent(providerPayoutId)}`
      : `referenceId=${encodeURIComponent(providerPayoutId)}`;

    const response = await fetch(`${this.baseUrl}/payout/v1/getTransferStatus?${queryParam}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data || data.status !== 'SUCCESS') {
      const msg = data?.message || `Failed to fetch transfer status (${response.status})`;
      return {
        status: 'unknown',
        utr: null,
        failureReason: msg,
      };
    }

    const transferData = data.data?.transfer || data.data;
    const cfStatus = (transferData?.status || '').toUpperCase();
    let status = 'processing';
    if (cfStatus === 'SUCCESS') status = 'processed';
    else if (cfStatus === 'FAILED') status = 'failed';
    else if (cfStatus === 'REVERSED') status = 'reversed';
    else if (cfStatus === 'PENDING') status = 'processing';

    return {
      status,
      utr: transferData?.utr || null,
      failureReason: transferData?.reason || null,
      raw: transferData,
    };
  }

  /**
   * Server-side syntax and IFSC check for bank details.
   */
  async verifyBankAccount(bankAccountDetails: any): Promise<boolean> {
    const ifsc = (bankAccountDetails?.ifsc_code || '').trim().toUpperCase();
    let accountNo = (bankAccountDetails?.account_number || '').trim();

    if (!accountNo && bankAccountDetails?.account_number_encrypted) {
      try {
        accountNo = decryptData(bankAccountDetails.account_number_encrypted).trim();
      } catch {
        return false;
      }
    }

    const ifscValid = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
    const accountValid = /^\d{9,18}$/.test(accountNo);
    return ifscValid && accountValid;
  }
}
