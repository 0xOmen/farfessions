-- Remove the daily submission limit constraint that's interfering with like/dislike updates
-- This constraint was preventing updates to the farfessions table when updating like/dislike counts

-- Drop the check constraint that's causing issues with vote count updates
ALTER TABLE farfessions DROP CONSTRAINT IF EXISTS check_daily_submission_limit_constraint;

-- The daily submission limit should be enforced in application logic only,
-- not as a database constraint, since it interferes with legitimate updates
-- to the likes/dislikes columns.

-- Note: Daily submission limits are still enforced in the application code
-- in the submitFarfession function and canUserSubmitToday function. 