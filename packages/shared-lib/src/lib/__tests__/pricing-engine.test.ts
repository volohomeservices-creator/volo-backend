import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockChain, mockFn } = vi.hoisted(() => {
  const chain: any = {};
  const fn = vi.fn().mockImplementation(() => chain);
  chain.select = fn;
  chain.order = fn;
  chain.limit = fn;
  chain.maybeSingle = vi.fn();
  return { mockChain: chain, mockFn: fn };
});

vi.mock('../supabase-server', () => {
  return {
    supabaseAdmin: {
      from: () => mockFn(),
    },
  };
});

import { calculateCustomerCharges, getActivePlatformFeeSetting } from '../pricing-engine';

describe('Pricing Engine - calculateCustomerCharges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Platform fee disabled -> 0 platform fee, hidden, total = service + tax', async () => {
    const result = await calculateCustomerCharges({
      serviceAmount: 500,
      configOverride: {
        id: 'cfg-disabled',
        enabled: false,
        calculation_type: 'PERCENTAGE',
        percentage: 10,
        fixed_amount: null,
        minimum_amount: 0,
        maximum_amount: 0,
        gst_enabled: true,
        gst_calculation_type: 'PERCENTAGE',
        gst_percentage: 5,
        gst_fixed_amount: null,
        gst_minimum_amount: 0,
        gst_maximum_amount: 0,
        effective_from: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    expect(result.platformFeeEnabled).toBe(false);
    expect(result.platformFee).toBe(0);
    expect(result.taxAmount).toBe(25); // 5% GST
    expect(result.totalAmount).toBe(525); // 500 + 0 + 25
  });

  it('2. Platform fee 5% percentage mode', async () => {
    const result = await calculateCustomerCharges({
      serviceAmount: 500,
      configOverride: {
        id: 'cfg-5pct',
        enabled: true,
        calculation_type: 'PERCENTAGE',
        percentage: 5,
        fixed_amount: null,
        minimum_amount: 0,
        maximum_amount: 0,
        gst_enabled: true,
        gst_calculation_type: 'PERCENTAGE',
        gst_percentage: 5,
        gst_fixed_amount: null,
        gst_minimum_amount: 0,
        gst_maximum_amount: 0,
        effective_from: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    expect(result.platformFeeEnabled).toBe(true);
    expect(result.platformFee).toBe(25);
    expect(result.platformFeeLabel).toBe('Platform Fee (5%)');
    expect(result.taxAmount).toBe(25);
    expect(result.totalAmount).toBe(550); // 500 + 25 + 25
  });

  it('3. Platform fee 10% percentage mode', async () => {
    const result = await calculateCustomerCharges({
      serviceAmount: 500,
      configOverride: {
        id: 'cfg-10pct',
        enabled: true,
        calculation_type: 'PERCENTAGE',
        percentage: 10,
        fixed_amount: null,
        minimum_amount: 0,
        maximum_amount: 0,
        gst_enabled: true,
        gst_calculation_type: 'PERCENTAGE',
        gst_percentage: 5,
        gst_fixed_amount: null,
        gst_minimum_amount: 0,
        gst_maximum_amount: 0,
        effective_from: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    expect(result.platformFeeEnabled).toBe(true);
    expect(result.platformFee).toBe(50);
    expect(result.platformFeeLabel).toBe('Platform Fee (10%)');
    expect(result.taxAmount).toBe(25);
    expect(result.totalAmount).toBe(575); // 500 + 50 + 25
  });

  it('4. Platform fee fixed ₹50 mode', async () => {
    const result = await calculateCustomerCharges({
      serviceAmount: 500,
      configOverride: {
        id: 'cfg-fixed50',
        enabled: true,
        calculation_type: 'FIXED',
        percentage: null,
        fixed_amount: 50,
        minimum_amount: 0,
        maximum_amount: 0,
        gst_enabled: true,
        gst_calculation_type: 'PERCENTAGE',
        gst_percentage: 5,
        gst_fixed_amount: null,
        gst_minimum_amount: 0,
        gst_maximum_amount: 0,
        effective_from: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    expect(result.platformFeeEnabled).toBe(true);
    expect(result.platformFee).toBe(50);
    expect(result.platformFeeLabel).toBe('Platform Fee');
    expect(result.taxAmount).toBe(25);
    expect(result.totalAmount).toBe(575);
  });

  it('5. Minimum fee constraint applies when calculated fee is lower', async () => {
    const result = await calculateCustomerCharges({
      serviceAmount: 100,
      configOverride: {
        id: 'cfg-min25',
        enabled: true,
        calculation_type: 'PERCENTAGE',
        percentage: 10,
        fixed_amount: null,
        minimum_amount: 25,
        maximum_amount: 0,
        gst_enabled: true,
        gst_calculation_type: 'PERCENTAGE',
        gst_percentage: 5,
        gst_fixed_amount: null,
        gst_minimum_amount: 0,
        gst_maximum_amount: 0,
        effective_from: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    expect(result.platformFee).toBe(25);
    expect(result.taxAmount).toBe(5);
    expect(result.totalAmount).toBe(130);
  });

  it('6. Maximum fee cap applies when calculated fee exceeds cap', async () => {
    const result = await calculateCustomerCharges({
      serviceAmount: 1000,
      configOverride: {
        id: 'cfg-max60',
        enabled: true,
        calculation_type: 'PERCENTAGE',
        percentage: 10,
        fixed_amount: null,
        minimum_amount: 0,
        maximum_amount: 60,
        gst_enabled: true,
        gst_calculation_type: 'PERCENTAGE',
        gst_percentage: 5,
        gst_fixed_amount: null,
        gst_minimum_amount: 0,
        gst_maximum_amount: 0,
        effective_from: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    expect(result.platformFee).toBe(60);
    expect(result.taxAmount).toBe(50);
    expect(result.totalAmount).toBe(1110);
  });

  it('7. Minimum and Maximum bounds combined', async () => {
    const resLow = await calculateCustomerCharges({
      serviceAmount: 150,
      configOverride: {
        id: 'cfg-bounds',
        enabled: true,
        calculation_type: 'PERCENTAGE',
        percentage: 10,
        fixed_amount: null,
        minimum_amount: 30,
        maximum_amount: 80,
        gst_enabled: true,
        gst_calculation_type: 'PERCENTAGE',
        gst_percentage: 5,
        gst_fixed_amount: null,
        gst_minimum_amount: 0,
        gst_maximum_amount: 0,
        effective_from: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
    expect(resLow.platformFee).toBe(30);

    const resHigh = await calculateCustomerCharges({
      serviceAmount: 1500,
      configOverride: {
        id: 'cfg-bounds',
        enabled: true,
        calculation_type: 'PERCENTAGE',
        percentage: 10,
        fixed_amount: null,
        minimum_amount: 30,
        maximum_amount: 80,
        gst_enabled: true,
        gst_calculation_type: 'PERCENTAGE',
        gst_percentage: 5,
        gst_fixed_amount: null,
        gst_minimum_amount: 0,
        gst_maximum_amount: 0,
        effective_from: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
    expect(resHigh.platformFee).toBe(80);
  });

  it('8. Edge cases: ₹0 service and high value service with round precision', async () => {
    const zeroRes = await calculateCustomerCharges({
      serviceAmount: 0,
      configOverride: {
        id: 'cfg-10pct',
        enabled: true,
        calculation_type: 'PERCENTAGE',
        percentage: 10,
        fixed_amount: null,
        minimum_amount: 0,
        maximum_amount: 0,
        gst_enabled: true,
        gst_calculation_type: 'PERCENTAGE',
        gst_percentage: 5,
        gst_fixed_amount: null,
        gst_minimum_amount: 0,
        gst_maximum_amount: 0,
        effective_from: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
    expect(zeroRes.platformFee).toBe(0);
    expect(zeroRes.taxAmount).toBe(0);
    expect(zeroRes.totalAmount).toBe(0);

    const largeRes = await calculateCustomerCharges({
      serviceAmount: 10000,
      configOverride: {
        id: 'cfg-10pct',
        enabled: true,
        calculation_type: 'PERCENTAGE',
        percentage: 10,
        fixed_amount: null,
        minimum_amount: 0,
        maximum_amount: 0,
        gst_enabled: true,
        gst_calculation_type: 'PERCENTAGE',
        gst_percentage: 5,
        gst_fixed_amount: null,
        gst_minimum_amount: 0,
        gst_maximum_amount: 0,
        effective_from: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
    expect(largeRes.serviceAmount).toBe(10000);
    expect(largeRes.platformFee).toBe(1000);
    expect(largeRes.taxAmount).toBe(500);
    expect(largeRes.totalAmount).toBe(11500);
  });

  it('9. GST disabled -> 0 tax, hidden, total = service + platformFee', async () => {
    const result = await calculateCustomerCharges({
      serviceAmount: 500,
      configOverride: {
        id: 'cfg-tax-disabled',
        enabled: true,
        calculation_type: 'PERCENTAGE',
        percentage: 10,
        fixed_amount: null,
        minimum_amount: 0,
        maximum_amount: 0,
        gst_enabled: false,
        gst_calculation_type: 'PERCENTAGE',
        gst_percentage: 5,
        gst_fixed_amount: null,
        gst_minimum_amount: 0,
        gst_maximum_amount: 0,
        effective_from: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    expect(result.taxEnabled).toBe(false);
    expect(result.taxAmount).toBe(0);
    expect(result.platformFee).toBe(50);
    expect(result.totalAmount).toBe(550); // 500 + 50 + 0
  });

  it('10. GST custom 18% percentage mode', async () => {
    const result = await calculateCustomerCharges({
      serviceAmount: 500,
      configOverride: {
        id: 'cfg-gst-18',
        enabled: true,
        calculation_type: 'PERCENTAGE',
        percentage: 10,
        fixed_amount: null,
        minimum_amount: 0,
        maximum_amount: 0,
        gst_enabled: true,
        gst_calculation_type: 'PERCENTAGE',
        gst_percentage: 18,
        gst_fixed_amount: null,
        gst_minimum_amount: 0,
        gst_maximum_amount: 0,
        effective_from: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    expect(result.taxEnabled).toBe(true);
    expect(result.taxAmount).toBe(90); // 500 * 18% = 90
    expect(result.taxLabel).toBe('GST (18%)');
    expect(result.platformFee).toBe(50); // 500 * 10% = 50
    expect(result.totalAmount).toBe(640); // 500 + 50 + 90
  });

  it('11. GST fixed amount mode', async () => {
    const result = await calculateCustomerCharges({
      serviceAmount: 500,
      configOverride: {
        id: 'cfg-gst-fixed',
        enabled: true,
        calculation_type: 'PERCENTAGE',
        percentage: 10,
        fixed_amount: null,
        minimum_amount: 0,
        maximum_amount: 0,
        gst_enabled: true,
        gst_calculation_type: 'FIXED',
        gst_percentage: null,
        gst_fixed_amount: 35,
        gst_minimum_amount: 0,
        gst_maximum_amount: 0,
        effective_from: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    expect(result.taxEnabled).toBe(true);
    expect(result.taxAmount).toBe(35);
    expect(result.taxLabel).toBe('GST / Taxes');
    expect(result.totalAmount).toBe(585); // 500 + 50 + 35
  });

  it('12. Both platform fee and GST disabled -> total = serviceAmount', async () => {
    const result = await calculateCustomerCharges({
      serviceAmount: 500,
      configOverride: {
        id: 'cfg-all-disabled',
        enabled: false,
        calculation_type: 'PERCENTAGE',
        percentage: 10,
        fixed_amount: null,
        minimum_amount: 0,
        maximum_amount: 0,
        gst_enabled: false,
        gst_calculation_type: 'PERCENTAGE',
        gst_percentage: 5,
        gst_fixed_amount: null,
        gst_minimum_amount: 0,
        gst_maximum_amount: 0,
        effective_from: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    expect(result.platformFee).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.totalAmount).toBe(500);
  });
});
