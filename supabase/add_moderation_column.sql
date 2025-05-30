-- Add moderation functionality to farfessions table
-- This allows admin to hide submissions from the public feed

-- Add a column to track if a submission is hidden by admin
ALTER TABLE farfessions ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Add an index for better performance when filtering hidden submissions
CREATE INDEX IF NOT EXISTS idx_farfessions_is_hidden ON farfessions(is_hidden);

-- Add a column to track who hid the submission and when
ALTER TABLE farfessions ADD COLUMN IF NOT EXISTS hidden_by_fid BIGINT;
ALTER TABLE farfessions ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP WITH TIME ZONE;

-- Create a policy that allows admin to update the hidden status
CREATE POLICY "Admin can moderate farfessions" ON farfessions
  FOR UPDATE USING (true) WITH CHECK (true);

-- Note: The application logic will enforce that only admin FID 212074 can hide submissions 