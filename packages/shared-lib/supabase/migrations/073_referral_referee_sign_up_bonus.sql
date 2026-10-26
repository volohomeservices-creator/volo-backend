-- 073_referral_referee_sign_up_bonus.sql
-- Add referee reward tracking to referrals table so both referrer and referee incentives are accounted for

ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS referee_reward_amount NUMERIC DEFAULT 0;

ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS referee_rewarded_at TIMESTAMPTZ;

-- Backfill referee_reward_amount from referral_settings for existing referrals
UPDATE referrals r
SET referee_reward_amount = COALESCE(s.referee_reward, CASE WHEN r.role = 'worker' THEN 100 ELSE 50 END)
FROM referral_settings s
WHERE s.role = r.role AND (r.referee_reward_amount IS NULL OR r.referee_reward_amount = 0);
