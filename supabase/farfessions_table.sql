-- Create the farfessions table
CREATE TABLE IF NOT EXISTS farfessions (
  id SERIAL PRIMARY KEY,
  user_fid BIGINT,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_farfessions_user_fid ON farfessions(user_fid);
CREATE INDEX IF NOT EXISTS idx_farfessions_created_at ON farfessions(created_at);

-- Create a function to increment likes
CREATE OR REPLACE FUNCTION increment_likes(row_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  current_likes INTEGER;
BEGIN
  SELECT likes INTO current_likes FROM farfessions WHERE id = row_id;
  RETURN current_likes + 1;
END;
$$ LANGUAGE plpgsql;

-- Create a function to increment dislikes
CREATE OR REPLACE FUNCTION increment_dislikes(row_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  current_dislikes INTEGER;
BEGIN
  SELECT dislikes INTO current_dislikes FROM farfessions WHERE id = row_id;
  RETURN current_dislikes + 1;
END;
$$ LANGUAGE plpgsql;

-- Add Row Level Security (RLS) policies
ALTER TABLE farfessions ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to read farfessions
CREATE POLICY "Anyone can read farfessions" ON farfessions
  FOR SELECT USING (true);

-- Create a policy that allows anyone to insert farfessions (for development)
CREATE POLICY "Anyone can insert farfessions" ON farfessions
  FOR INSERT WITH CHECK (true);

-- Create a policy that allows anyone to update farfessions (for likes/dislikes)
CREATE POLICY "Anyone can update farfessions" ON farfessions
  FOR UPDATE USING (true); 