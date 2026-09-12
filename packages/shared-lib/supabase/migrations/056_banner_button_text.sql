-- ==============================================================================
-- Migration: 056_banner_button_text.sql
-- Description: Multi-platform (Mobile App & Web Application) Banner CTA & Placement Schema
-- ==============================================================================

-- 1. Ensure columns exist on mobile_banners
ALTER TABLE mobile_banners 
ADD COLUMN IF NOT EXISTS button_text TEXT,
ADD COLUMN IF NOT EXISTS placement TEXT DEFAULT 'MOBILE',
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Dynamically assign dynamic CTA Button Text across Mobile & Web platforms
UPDATE mobile_banners 
SET button_text = CASE 
  -- Worker & Technician Partner Banners (Mobile Worker App & Web Partner Dashboard)
  WHEN UPPER(placement) IN ('WORKER', 'PARTNER') THEN 'Explore Opportunity'
  
  -- Promotional Discount & Coupon Banners (Mobile Carousel & Web Hero)
  WHEN discount_label ILIKE '%OFF%' 
    OR discount_label ILIKE '%FLAT%' 
    OR discount_label ILIKE '%₹%' 
    OR discount_label ILIKE '%SAVE%' 
    OR discount_label ILIKE '%DISCOUNT%' 
    OR discount_label ILIKE '%PROMO%' THEN 'Claim Offer'
    
  -- Specific Service Category Bookings (Mobile Deep Link & Web Services)
  WHEN action_url ILIKE '%/customer/services%' 
    OR action_url ILIKE '%category%' 
    OR action_url ILIKE '%services%' THEN 'Book Now'
    
  -- Mobile App Download / App Launch Banners
  WHEN action_url ILIKE '%play.google%' 
    OR action_url ILIKE '%apps.apple%' 
    OR action_url ILIKE '%app%' THEN 'Install App'
    
  -- Universal Brand Fallback
  ELSE 'Explore Services'
END
WHERE button_text IS NULL OR button_text = '';
