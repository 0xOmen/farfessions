-- Migration to allow admin FID (212074) to vote multiple times per farfession
-- while maintaining single vote constraint for other users

-- First, drop the existing unique constraint
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_farfession_id_user_fid_key;

-- Create a partial unique index that excludes the admin FID (212074)
-- This allows the admin to vote multiple times while restricting others to one vote per farfession
CREATE UNIQUE INDEX votes_single_vote_per_user_per_farfession 
ON votes (farfession_id, user_fid) 
WHERE user_fid != 212074;

-- Add a comment to document this special case
COMMENT ON INDEX votes_single_vote_per_user_per_farfession IS 
'Ensures one vote per user per farfession, except for admin FID 212074 who can vote multiple times'; 