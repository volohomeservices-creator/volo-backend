import { describe, it, expect, vi } from 'vitest';
import { DefaultPayoutProvider, RazorpayRoutePayoutProvider } from '../payouts/payout-provider';

describe('Razorpay Route Payout Provider', () => {
  const provider = new DefaultPayoutProvider();

  it('correctly validates Indian IFSC and bank account numbers', async () => {
    // Valid cases
    expect(await provider.verifyBankAccount({
      ifsc_code: 'HDFC0001234',
      account_number: '123456789012'
    })).toBe(true);

    expect(await provider.verifyBankAccount({
      ifsc_code: 'SBIN0000456',
      account_number: '987654321'
    })).toBe(true);

    // Invalid IFSC
    expect(await provider.verifyBankAccount({
      ifsc_code: 'INVALID_IFSC',
      account_number: '123456789012'
    })).toBe(false);

    // Invalid account number (too short)
    expect(await provider.verifyBankAccount({
      ifsc_code: 'HDFC0001234',
      account_number: '123'
    })).toBe(false);
  });

  it('creates Route contact in mock/test mode without requiring RAZORPAYX_ACCOUNT_NUMBER', async () => {
    const contactId = await provider.createContact('worker-uuid-1', 'Ramesh Kumar', 'ramesh@example.com', '9876543210');
    expect(contactId).toBeDefined();
    expect(typeof contactId).toBe('string');
  });

  it('creates Route payout transfer in mock/test mode', async () => {
    const payoutResult = await provider.createPayout('acc_test_123', 850, 'payout-ref-1');
    expect(payoutResult).toBeDefined();
    expect(payoutResult.providerPayoutId).toBeDefined();
    expect(payoutResult.status).toBe('processed');
  });

  it('fetches payout transfer status in mock/test mode', async () => {
    const status = await provider.fetchPayoutStatus('trf_mock_test123');
    expect(status.status).toBe('processed');
    expect(status.utr).toBeDefined();
  });
});
