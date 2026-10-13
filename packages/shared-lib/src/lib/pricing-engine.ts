import 'server-only';
import { supabaseAdmin } from './supabase-server';

export interface PlatformFeeSetting {
  id: string;
  enabled: boolean;
  calculation_type: 'PERCENTAGE' | 'FIXED';
  percentage: number | null;
  fixed_amount: number | null;
  minimum_amount: number;
  maximum_amount: number | null;
  gst_enabled: boolean;
  gst_calculation_type: 'PERCENTAGE' | 'FIXED';
  gst_percentage: number | null;
  gst_fixed_amount: number | null;
  gst_minimum_amount: number;
  gst_maximum_amount: number | null;
  effective_from: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface CustomerPricingInput {
  serviceAmount: number;
  serviceId?: string | null;
  categoryId?: string | null;
  configOverride?: Partial<PlatformFeeSetting>;
}

export interface CustomerPricingBreakdown {
  serviceAmount: number;
  platformFee: number;
  platformFeeLabel: string;
  platformFeeEnabled: boolean;
  platformFeeType: 'PERCENTAGE' | 'FIXED';
  platformFeePercentage: number | null;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  taxLabel: string;
  taxEnabled: boolean;
  taxType: 'PERCENTAGE' | 'FIXED';
  taxPercentage: number | null;
  totalAmount: number;
  currency: string;
  pricingConfigVersion: string | null;
}

/**
 * Fetch the active platform fee & GST configuration from DB.
 * Returns default 10% platform fee and 5% GST fallback if table is empty or error occurs.
 */
export async function getActivePlatformFeeSetting(): Promise<PlatformFeeSetting> {
  try {
    const { data, error } = await supabaseAdmin
      .from('platform_fee_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.warn('[PricingEngine] Failed to load platform_fee_settings, falling back to default:', error?.message);
      return {
        id: 'default-fallback',
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
      };
    }

    return {
      id: data.id,
      enabled: Boolean(data.enabled),
      calculation_type: data.calculation_type,
      percentage: data.percentage !== null ? Number(data.percentage) : null,
      fixed_amount: data.fixed_amount !== null ? Number(data.fixed_amount) : null,
      minimum_amount: Number(data.minimum_amount || 0),
      maximum_amount: data.maximum_amount !== null ? Number(data.maximum_amount) : null,
      gst_enabled: data.gst_enabled !== false,
      gst_calculation_type: data.gst_calculation_type || 'PERCENTAGE',
      gst_percentage: data.gst_percentage !== null ? Number(data.gst_percentage) : 5,
      gst_fixed_amount: data.gst_fixed_amount !== null ? Number(data.gst_fixed_amount) : null,
      gst_minimum_amount: Number(data.gst_minimum_amount || 0),
      gst_maximum_amount: data.gst_maximum_amount !== null ? Number(data.gst_maximum_amount) : null,
      effective_from: data.effective_from,
      created_at: data.created_at,
      updated_at: data.updated_at,
      created_by: data.created_by,
      updated_by: data.updated_by,
    };
  } catch (err: any) {
    console.error('[PricingEngine] Exception fetching settings:', err);
    return {
      id: 'default-fallback',
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
    };
  }
}

/**
 * Authoritative customer charges calculation engine.
 * Single source of truth for checkout, bookings, Razorpay order creation, and admin preview.
 */
export async function calculateCustomerCharges(
  input: CustomerPricingInput
): Promise<CustomerPricingBreakdown> {
  const serviceAmt = Math.max(0, Math.round(Number(input.serviceAmount || 0) * 100) / 100);

  // Use provided override (for Admin preview / unit tests) or load authoritative DB config
  const activeConfig = (input.configOverride && input.configOverride.calculation_type && input.configOverride.enabled !== undefined)
    ? (input.configOverride as PlatformFeeSetting)
    : input.configOverride
    ? ({
        ...(await getActivePlatformFeeSetting()),
        ...input.configOverride,
      } as PlatformFeeSetting)
    : await getActivePlatformFeeSetting();

  // 1. Platform Fee Calculation
  let platformFee = 0;
  let platformFeeLabel = '';
  const isEnabled = Boolean(activeConfig.enabled);

  if (isEnabled) {
    if (activeConfig.calculation_type === 'PERCENTAGE') {
      const pct = Math.max(0, Math.min(100, Number(activeConfig.percentage || 0)));
      platformFee = Math.round(((serviceAmt * pct) / 100) * 100) / 100;
      platformFeeLabel = `Platform Fee (${pct}%)`;
    } else {
      platformFee = Math.max(0, Math.round(Number(activeConfig.fixed_amount || 0) * 100) / 100);
      platformFeeLabel = 'Platform Fee';
    }

    const minFee = Number(activeConfig.minimum_amount || 0);
    if (minFee > 0 && platformFee < minFee) {
      platformFee = minFee;
    }

    const maxFee = Number(activeConfig.maximum_amount || 0);
    if (maxFee > 0 && platformFee > maxFee) {
      platformFee = maxFee;
    }
  }

  platformFee = Math.max(0, Math.round(platformFee * 100) / 100);

  // 2. GST / Tax Calculation (Admin Configurable)
  let taxAmount = 0;
  let taxLabel = '';
  const isGstEnabled = activeConfig.gst_enabled !== false;
  const gstCalcType = activeConfig.gst_calculation_type || 'PERCENTAGE';
  const gstPercentage = activeConfig.gst_percentage !== null ? Number(activeConfig.gst_percentage) : 5;
  const taxableAmount = serviceAmt;

  if (isGstEnabled) {
    if (gstCalcType === 'PERCENTAGE') {
      const pct = Math.max(0, Math.min(100, gstPercentage));
      taxAmount = Math.round(((taxableAmount * pct) / 100) * 100) / 100;
      taxLabel = `GST (${pct}%)`;
    } else {
      taxAmount = Math.max(0, Math.round(Number(activeConfig.gst_fixed_amount || 0) * 100) / 100);
      taxLabel = 'GST / Taxes';
    }

    const minTax = Number(activeConfig.gst_minimum_amount || 0);
    if (minTax > 0 && taxAmount < minTax) {
      taxAmount = minTax;
    }

    const maxTax = Number(activeConfig.gst_maximum_amount || 0);
    if (maxTax > 0 && taxAmount > maxTax) {
      taxAmount = maxTax;
    }
  }

  taxAmount = Math.max(0, Math.round(taxAmount * 100) / 100);

  // 3. Authoritative Grand Total
  const totalAmount = Math.round((serviceAmt + platformFee + taxAmount) * 100) / 100;

  return {
    serviceAmount: serviceAmt,
    platformFee,
    platformFeeLabel,
    platformFeeEnabled: isEnabled,
    platformFeeType: activeConfig.calculation_type,
    platformFeePercentage: activeConfig.calculation_type === 'PERCENTAGE' ? activeConfig.percentage : null,
    taxableAmount,
    taxRate: (isGstEnabled && gstCalcType === 'PERCENTAGE') ? (gstPercentage / 100) : 0,
    taxAmount,
    taxLabel,
    taxEnabled: isGstEnabled,
    taxType: gstCalcType,
    taxPercentage: isGstEnabled && gstCalcType === 'PERCENTAGE' ? gstPercentage : null,
    totalAmount,
    currency: 'INR',
    pricingConfigVersion: activeConfig.id,
  };
}
