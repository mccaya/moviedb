/*
  # Fix Watchlist Schema Issues

  1. Schema Updates
    - Ensure proper column types for genres (text[] vs jsonb)
    - Fix any function conflicts
    - Update RLS policies
    - Add missing indexes

  2. Functions
    - Remove problematic aggregate functions
    - Ensure proper trigger functions exist
    - Fix any set-returning function issues

  3. Security
    - Update RLS policies for proper access
    - Ensure user authentication works correctly
*/

-- First, let's check if we need to update the genres column type
-- The error suggests there might be a conflict between text[] and jsonb

-- Drop any problematic functions that might be causing aggregate issues
DROP FUNCTION IF EXISTS update_user_stats_trigger() CASCADE;

-- Recreate the user stats trigger function without problematic aggregates
CREATE OR REPLACE FUNCTION update_user_stats_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Simple trigger that doesn't use complex aggregates
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    -- We'll handle stats updates separately to avoid aggregate function issues
    RETURN COALESCE(NEW, OLD);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Ensure the watchlist_items table has the correct structure
DO $$
BEGIN
  -- Check if we need to modify the genres column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'watchlist_items' 
    AND column_name = 'genres' 
    AND data_type != 'ARRAY'
  ) THEN
    -- Convert genres to text array if it's not already
    ALTER TABLE watchlist_items ALTER COLUMN genres TYPE text[] USING genres::text[];
  END IF;
END $$;

-- Ensure proper default values
ALTER TABLE watchlist_items ALTER COLUMN genres SET DEFAULT '{}';
ALTER TABLE watchlist_items ALTER COLUMN watched SET DEFAULT false;
ALTER TABLE watchlist_items ALTER COLUMN added_at SET DEFAULT now();

-- Recreate the trigger without the problematic function
DROP TRIGGER IF EXISTS watchlist_stats_update ON watchlist_items;
CREATE TRIGGER watchlist_stats_update
  AFTER INSERT OR DELETE OR UPDATE ON watchlist_items
  FOR EACH ROW EXECUTE FUNCTION update_user_stats_trigger();

-- Ensure RLS is properly configured
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate them
DROP POLICY IF EXISTS "Users can manage own watchlist items" ON watchlist_items;
DROP POLICY IF EXISTS "Users can view and update their own watchlist" ON watchlist_items;
DROP POLICY IF EXISTS "Users can insert their own watchlist items" ON watchlist_items;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view own watchlist items" ON watchlist_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist items" ON watchlist_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist items" ON watchlist_items
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist items" ON watchlist_items
  FOR DELETE USING (auth.uid() = user_id);

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_tmdb_id ON watchlist_items(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_added_at ON watchlist_items(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_watched ON watchlist_items(user_id, watched);

-- Create a simple function to get user stats without problematic aggregates
CREATE OR REPLACE FUNCTION get_user_watchlist_stats(user_uuid UUID)
RETURNS TABLE(
  total_movies INTEGER,
  movies_watched INTEGER,
  movies_unwatched INTEGER,
  avg_rating NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_movies,
    COUNT(*) FILTER (WHERE watched = true)::INTEGER as movies_watched,
    COUNT(*) FILTER (WHERE watched = false)::INTEGER as movies_unwatched,
    AVG(personal_rating) as avg_rating
  FROM watchlist_items 
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_watchlist_stats(UUID) TO authenticated;