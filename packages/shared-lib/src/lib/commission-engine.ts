import 'server-only';
import { supabaseAdmin } from './supabase-server';

export async function calculateCommission(
  bookingAmount: number,
  serviceCategoryId: string | null
): Promise<number> {
  let commissionPercent = 15.0; // Default fallback

  // 1. Check if category specific commission exists
  if (serviceCategoryId) {
    const { data: rule } = await supabaseAdmin
      .from('commission_rules')
      .select('commission_percent')
      .eq('service_category_id', serviceCategoryId)
      .eq('is_active', true)
      .single();

    if (rule && rule.commission_percent) {
      commissionPercent = Number(rule.commission_percent);
      const commissionAmount = (bookingAmount * commissionPercent) / 100;
      return Number(commissionAmount.toFixed(2));
    }
  }

  // 2. Check platform_settings for global commission_rate set by Admin in Settings
  try {
    const { data: setting } = await supabaseAdmin
      .from('platform_settings')
      .select('value')
      .eq('key', 'commission_rate')
      .single();

    if (setting && setting.value) {
      const parsed = parseFloat(setting.value);
      if (!isNaN(parsed) && parsed >= 0) {
        commissionPercent = parsed;
      }
    }
  } catch (_) {
    // fallback to default
  }

  const commissionAmount = (bookingAmount * commissionPercent) / 100;
  return Number(commissionAmount.toFixed(2));
}
