-- Migration 075: Disable late cancellation fee charges across the platform
UPDATE platform_settings
SET value = '0', description = 'Travel compensation fee for late customer cancellation (₹) [DISABLED]'
WHERE key = 'customer_cancellation_travel_fee';
