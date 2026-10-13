import { z } from 'zod';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';
import { getActivePlatformFeeSetting } from '@/lib/pricing-engine';

const supabaseAdmin: any = supabaseAdminOriginal;

const updateFeeSchema = z.object({
  // Platform Fee fields
  enabled: z.boolean(),
  calculation_type: z.enum(['PERCENTAGE', 'FIXED']),
  percentage: z.number().min(0).max(100).nullable().optional(),
  fixed_amount: z.number().min(0).nullable().optional(),
  minimum_amount: z.number().min(0).default(0),
  maximum_amount: z.number().min(0).nullable().optional(),

  // GST / Tax fields
  gst_enabled: z.boolean().default(true),
  gst_calculation_type: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  gst_percentage: z.number().min(0).max(100).nullable().optional(),
  gst_fixed_amount: z.number().min(0).nullable().optional(),
  gst_minimum_amount: z.number().min(0).default(0),
  gst_maximum_amount: z.number().min(0).nullable().optional(),

  reason: z.string().max(500).optional(),
}).refine((data) => {
  if (data.calculation_type === 'PERCENTAGE') {
    return data.percentage !== null && data.percentage !== undefined && data.percentage >= 0 && data.percentage <= 100;
  }
  if (data.calculation_type === 'FIXED') {
    return data.fixed_amount !== null && data.fixed_amount !== undefined && data.fixed_amount >= 0;
  }
  return true;
}, {
  message: 'Valid percentage (0-100%) or fixed amount (>= 0) is required for Platform Fee.',
}).refine((data) => {
  if (data.maximum_amount && data.maximum_amount > 0) {
    return data.minimum_amount <= data.maximum_amount;
  }
  return true;
}, {
  message: 'Minimum Platform Fee cannot exceed maximum fee.',
}).refine((data) => {
  if (data.gst_enabled && data.gst_calculation_type === 'PERCENTAGE') {
    return data.gst_percentage !== null && data.gst_percentage !== undefined && data.gst_percentage >= 0 && data.gst_percentage <= 100;
  }
  if (data.gst_enabled && data.gst_calculation_type === 'FIXED') {
    return data.gst_fixed_amount !== null && data.gst_fixed_amount !== undefined && data.gst_fixed_amount >= 0;
  }
  return true;
}, {
  message: 'Valid percentage (0-100%) or fixed amount (>= 0) is required for GST.',
}).refine((data) => {
  if (data.gst_maximum_amount && data.gst_maximum_amount > 0) {
    return data.gst_minimum_amount <= data.gst_maximum_amount;
  }
  return true;
}, {
  message: 'Minimum GST cannot exceed maximum GST.',
});

// GET: Current active platform fee & GST config + audit log history
export async function GET(request: Request) {
  try {
    await requireRole(request, 'admin');

    const activeSetting = await getActivePlatformFeeSetting();

    const { data: auditLogs } = await supabaseAdmin
      .from('platform_fee_audit_logs')
      .select('*, changed_by_user:users!platform_fee_audit_logs_changed_by_fkey(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(25);

    return NextResponse.json({
      setting: activeSetting,
      audit_logs: auditLogs || [],
    });
  } catch (error: any) {
    console.error('Error fetching admin platform fee setting:', error.message || error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

// PATCH / PUT: Update platform fee & GST configuration and record audit record
export async function PATCH(request: Request) {
  try {
    const session = await requireRole(request, 'admin');
    const adminId = session.user_id;

    let bodyJson: any;
    try {
      bodyJson = await request.json();
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload.' }, { status: 400 });
    }

    const parseResult = updateFeeSchema.safeParse(bodyJson);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0]?.message || 'Validation error';
      return NextResponse.json({ error: firstIssue, details: parseResult.error.format() }, { status: 400 });
    }

    const validData = parseResult.data;
    const previousConfig = await getActivePlatformFeeSetting();

    // Determine audit action label
    let actionParts: string[] = [];
    if (previousConfig.enabled !== validData.enabled) {
      actionParts.push(validData.enabled ? 'FEE_ENABLED' : 'FEE_DISABLED');
    }
    if (previousConfig.percentage !== validData.percentage && validData.calculation_type === 'PERCENTAGE') {
      actionParts.push(`FEE_${validData.percentage}%`);
    }
    if (previousConfig.gst_enabled !== validData.gst_enabled) {
      actionParts.push(validData.gst_enabled ? 'GST_ENABLED' : 'GST_DISABLED');
    }
    if (previousConfig.gst_percentage !== validData.gst_percentage && validData.gst_calculation_type === 'PERCENTAGE') {
      actionParts.push(`GST_${validData.gst_percentage}%`);
    }
    const action = actionParts.length > 0 ? actionParts.join(';') : 'UPDATE_CHARGES_CONFIG';

    const newPercentage = validData.calculation_type === 'PERCENTAGE' ? Number(validData.percentage) : null;
    const newFixedAmount = validData.calculation_type === 'FIXED' ? Number(validData.fixed_amount) : null;
    const newMinAmount = Number(validData.minimum_amount || 0);
    const newMaxAmount = validData.maximum_amount && Number(validData.maximum_amount) > 0 ? Number(validData.maximum_amount) : null;

    const newGstPercentage = validData.gst_calculation_type === 'PERCENTAGE' ? Number(validData.gst_percentage) : null;
    const newGstFixedAmount = validData.gst_calculation_type === 'FIXED' ? Number(validData.gst_fixed_amount) : null;
    const newGstMinAmount = Number(validData.gst_minimum_amount || 0);
    const newGstMaxAmount = validData.gst_maximum_amount && Number(validData.gst_maximum_amount) > 0 ? Number(validData.gst_maximum_amount) : null;

    // Insert new versioned configuration record into platform_fee_settings
    const { data: newSetting, error: insertErr } = await supabaseAdmin
      .from('platform_fee_settings')
      .insert({
        enabled: validData.enabled,
        calculation_type: validData.calculation_type,
        percentage: newPercentage,
        fixed_amount: newFixedAmount,
        minimum_amount: newMinAmount,
        maximum_amount: newMaxAmount,
        gst_enabled: validData.gst_enabled,
        gst_calculation_type: validData.gst_calculation_type,
        gst_percentage: newGstPercentage,
        gst_fixed_amount: newGstFixedAmount,
        gst_minimum_amount: newGstMinAmount,
        gst_maximum_amount: newGstMaxAmount,
        created_by: adminId,
        updated_by: adminId,
        effective_from: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (insertErr || !newSetting) {
      console.error('[PricingEngine] Failed to save platform_fee_settings:', insertErr);
      return NextResponse.json({ error: 'Failed to update customer charges configuration in database.' }, { status: 500 });
    }

    // Record audit log
    await supabaseAdmin
      .from('platform_fee_audit_logs')
      .insert({
        setting_id: newSetting.id,
        action,
        previous_state: previousConfig,
        new_state: newSetting,
        reason: validData.reason?.trim() || null,
        changed_by: adminId,
      });

    return NextResponse.json({
      success: true,
      message: 'Customer charges and GST configuration updated successfully.',
      setting: {
        id: newSetting.id,
        enabled: Boolean(newSetting.enabled),
        calculation_type: newSetting.calculation_type,
        percentage: newSetting.percentage !== null ? Number(newSetting.percentage) : null,
        fixed_amount: newSetting.fixed_amount !== null ? Number(newSetting.fixed_amount) : null,
        minimum_amount: Number(newSetting.minimum_amount || 0),
        maximum_amount: newSetting.maximum_amount !== null ? Number(newSetting.maximum_amount) : null,
        gst_enabled: Boolean(newSetting.gst_enabled),
        gst_calculation_type: newSetting.gst_calculation_type,
        gst_percentage: newSetting.gst_percentage !== null ? Number(newSetting.gst_percentage) : null,
        gst_fixed_amount: newSetting.gst_fixed_amount !== null ? Number(newSetting.gst_fixed_amount) : null,
        gst_minimum_amount: Number(newSetting.gst_minimum_amount || 0),
        gst_maximum_amount: newSetting.gst_maximum_amount !== null ? Number(newSetting.gst_maximum_amount) : null,
        effective_from: newSetting.effective_from,
        created_at: newSetting.created_at,
        updated_at: newSetting.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error saving admin customer charges setting:', error.message || error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

export async function PUT(request: Request) {
  return PATCH(request);
}
