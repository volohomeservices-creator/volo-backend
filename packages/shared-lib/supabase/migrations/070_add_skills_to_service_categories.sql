-- Migration 070: Add configurable skills array to service_categories for KYC worker skill checklist

ALTER TABLE service_categories
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';

-- Pre-populate standard skills for existing categories
UPDATE service_categories
SET skills = ARRAY[
  'Fan Repair & Fitting',
  'Switchboard & Sockets',
  'House Wiring',
  'Inverter Setup',
  'MCB & Fuse Box'
]
WHERE LOWER(name) LIKE '%electric%' OR LOWER(name) LIKE '%electrican%';

UPDATE service_categories
SET skills = ARRAY[
  'Deep Cleaning',
  'Bathroom Cleaning',
  'Kitchen Cleaning',
  'Sofa & Carpet Cleaning'
]
WHERE LOWER(name) LIKE '%clean%';

UPDATE service_categories
SET skills = ARRAY[
  'AC Filter Service',
  'Gas Refill',
  'PCB Repair',
  'Installation & Uninstallation'
]
WHERE LOWER(name) LIKE '%ac%';
