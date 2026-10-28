-- 076_referral_rules_order_thresholds.sql
-- Add min_referrer_bookings to referral_settings
-- Allows admin to configure:
-- 1. Minimum completed orders required by the referrer (customer & worker)
-- 2. Minimum completed orders required by the referee before bonuses are deposited

ALTER TABLE referral_settings 
ADD COLUMN IF NOT EXISTS min_referrer_bookings INTEGER NOT NULL DEFAULT 1;

-- Set default for customer: 1 order for referrer, 1 order for referee
UPDATE referral_settings 
SET min_referrer_bookings = 1, min_bookings_to_qualify = 1 
WHERE role = 'customer';

-- Set default for worker: 1 order for referrer, min_bookings_to_qualify for referee
UPDATE referral_settings 
SET min_referrer_bookings = 1 
WHERE role = 'worker' AND (min_referrer_bookings IS NULL OR min_referrer_bookings = 0);
