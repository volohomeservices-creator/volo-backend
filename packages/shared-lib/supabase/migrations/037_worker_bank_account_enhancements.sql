-- Migration 037: Worker Bank Account Details & Single Primary Account Enforcement
ALTER TABLE worker_bank_accounts
ADD COLUMN IF NOT EXISTS branch TEXT,
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'Savings',
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT TRUE;

-- Drop legacy unique constraint on worker_id if present to allow historical inactive bank records
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'worker_bank_accounts_worker_id_key'
  ) THEN
    ALTER TABLE worker_bank_accounts DROP CONSTRAINT worker_bank_accounts_worker_id_key;
  END IF;
END $$;

-- Enforce maximum ONE primary verified bank account per worker
CREATE UNIQUE INDEX IF NOT EXISTS idx_worker_bank_accounts_primary_worker
ON worker_bank_accounts(worker_id)
WHERE (is_primary = TRUE);
