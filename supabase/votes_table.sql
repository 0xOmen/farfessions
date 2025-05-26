-- Create the votes table to track user votes on farfessions
CREATE TABLE IF NOT EXISTS votes (
  id SERIAL PRIMARY KEY,
  farfession_id INTEGER NOT NULL REFERENCES farfessions(id) ON DELETE CASCADE,
  user_fid BIGINT NOT NULL,
  vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Ensure a user can only vote once per farfession
  UNIQUE(farfession_id, user_fid)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_votes_farfession_id ON votes(farfession_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_fid ON votes(user_fid);
CREATE INDEX IF NOT EXISTS idx_votes_farfession_user ON votes(farfession_id, user_fid);

-- Add Row Level Security (RLS) policies
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to read votes
CREATE POLICY "Anyone can read votes" ON votes
  FOR SELECT USING (true);

-- Create a policy that allows anyone to insert votes (for development)
CREATE POLICY "Anyone can insert votes" ON votes
  FOR INSERT WITH CHECK (true);

-- Create a policy that allows anyone to update votes (for changing vote type)
CREATE POLICY "Anyone can update votes" ON votes
  FOR UPDATE USING (true);

-- Create a policy that allows anyone to delete votes (for removing votes)
CREATE POLICY "Anyone can delete votes" ON votes
  FOR DELETE USING (true); 