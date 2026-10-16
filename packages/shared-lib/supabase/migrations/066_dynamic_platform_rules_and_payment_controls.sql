-- Migration 066: Dynamic Platform Rules, Wallet Limits & Payment Controls
-- Configurable platform-wide settings stored in platform_settings table

INSERT INTO platform_settings (key, value, description)
VALUES 
  ('enable_cod_payment', 'true', 'Enable Cash on Delivery payment option'),
  ('enable_online_payment', 'true', 'Enable Online Payment (UPI / Cards / Netbanking)'),
  ('enable_wallet_payment', 'true', 'Enable Volo Wallet payment option'),
  ('min_customer_wallet_topup', '100', 'Minimum top-up amount for customer wallet (₹)'),
  ('max_customer_wallet_balance', '10000', 'Maximum customer wallet balance limit (₹)'),
  ('min_worker_wallet_topup', '100', 'Minimum top-up amount for worker wallet (₹)'),
  ('customer_cancellation_travel_fee', '50', 'Travel compensation fee for late customer cancellation (₹)'),
  ('inspection_fee', '99', 'Inspection / diagnosis fee if job cannot be completed (₹)'),
  ('worker_noshow_penalty', '50', 'Penalty deducted from worker on no-show (₹)'),
  ('worker_noshow_apology_credit', '50', 'Apology credit given to customer on partner no-show (₹)')
ON CONFLICT (key) DO UPDATE 
SET description = EXCLUDED.description;
