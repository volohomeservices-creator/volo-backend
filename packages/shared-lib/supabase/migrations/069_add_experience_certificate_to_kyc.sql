-- Migration 069: Add Experience / Certificates to Technician KYC

-- 1. Add certificate columns to workers table
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS certificate_url TEXT,
  ADD COLUMN IF NOT EXISTS experience_years INT DEFAULT 0;

-- 2. Add certificate verification status to worker_kyc table
ALTER TABLE worker_kyc
  ADD COLUMN IF NOT EXISTS certificate_status kyc_status NOT NULL DEFAULT 'PENDING';

-- 3. Update existing worker_kyc records to default 'PENDING' if null
UPDATE worker_kyc
SET certificate_status = 'PENDING'
WHERE certificate_status IS NULL;

-- 4. Informative comments
COMMENT ON COLUMN workers.certificate_url IS 'Public / storage URL for technician experience certificates or trade diploma documents';
COMMENT ON COLUMN workers.experience_years IS 'Years of professional trade experience specified by the technician';
COMMENT ON COLUMN worker_kyc.certificate_status IS 'KYC review status for technician experience / trade certificates document';
