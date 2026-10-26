-- 074_single_bank_account_per_worker.sql
-- Enforce strictly one bank account per worker and clean up legacy duplicates

-- 1. Remove duplicate bank accounts for each worker, keeping the verified or latest primary record
DELETE FROM worker_bank_accounts wba
WHERE wba.id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY worker_id 
             ORDER BY is_verified DESC, is_primary DESC, created_at DESC
           ) as rn
    FROM worker_bank_accounts
  ) sub
  WHERE sub.rn > 1
);

-- 2. Ensure all remaining accounts have is_primary = true
UPDATE worker_bank_accounts SET is_primary = true WHERE is_primary = false;

-- 3. Drop partial index if exists
DROP INDEX IF EXISTS idx_worker_bank_accounts_primary_worker;

-- 4. Enforce unique constraint on worker_id so a worker can never have duplicate accounts
ALTER TABLE worker_bank_accounts
DROP CONSTRAINT IF EXISTS worker_bank_accounts_worker_id_unique;

ALTER TABLE worker_bank_accounts
ADD CONSTRAINT worker_bank_accounts_worker_id_unique UNIQUE (worker_id);
