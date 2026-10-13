-- Migration 062: Reviews Approval Workflow & Reputation Moderation
-- Enables admin moderation to selectively publish verified customer reviews to public web and mobile app

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='reviews' AND column_name='is_approved'
  ) THEN
    ALTER TABLE reviews ADD COLUMN is_approved BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='reviews' AND column_name='is_featured'
  ) THEN
    ALTER TABLE reviews ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='reviews' AND column_name='approval_status'
  ) THEN
    ALTER TABLE reviews ADD COLUMN approval_status VARCHAR(20) DEFAULT 'PENDING';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='reviews' AND column_name='approved_at'
  ) THEN
    ALTER TABLE reviews ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
END $$;
