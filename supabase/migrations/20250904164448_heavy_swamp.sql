/*
  # User Preferences and Settings Schema

  1. New Tables
    - `user_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `theme` (text, UI theme preference)
      - `default_view` (text, default watchlist view)
      - `auto_add_to_radarr` (boolean, automatically add to media server)
      - `notification_settings` (jsonb, notification preferences)
      - `ai_recommendations_enabled` (boolean, enable AI features)
      - `import_preferences` (jsonb, CSV import settings)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `user_stats`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `total_movies` (integer, total movies in watchlist)
      - `movies_watched` (integer, movies marked as watched)
      - `average_rating` (decimal, average personal rating)
      - `favorite_genres` (text array, most common genres)
      - `total_runtime_minutes` (integer, total runtime of watched movies)
      - `last_calculated` (timestamp, when stats were last updated)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own preferences and stats
    - Automatic stats calculation via triggers

  3. Features
    - Customizable user experience
    - Automatic statistics tracking
    - Preference-based recommendations
*/

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  theme text DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'auto')),
  default_view text DEFAULT 'grid' CHECK (default_view IN ('grid', 'list')),
  auto_add_to_radarr boolean DEFAULT false,
  notification_settings jsonb DEFAULT '{
    "email_notifications": true,
    "new_releases": true,
    "download_complete": true,
    "recommendations": false
  }'::jsonb,
  ai_recommendations_enabled boolean DEFAULT true,
  import_preferences jsonb DEFAULT '{
    "auto_search_missing": true,
    "skip_duplicates": true,
    "default_quality": "1080p"
  }'::jsonb,
  language text DEFAULT 'en',
  timezone text DEFAULT 'UTC',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_stats table
CREATE TABLE IF NOT EXISTS user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_movies integer DEFAULT 0,
  movies_watched integer DEFAULT 0,
  movies_unwatched integer DEFAULT 0,
  average_rating decimal(3,2),
  average_tmdb_rating decimal(3,2),
  favorite_genres text[] DEFAULT '{}',
  total_runtime_minutes integer DEFAULT 0,
  most_watched_year integer,
  oldest_movie_year integer,
  newest_movie_year integer,
  last_calculated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Policies for user_preferences
CREATE POLICY "Users can manage own preferences"
  ON user_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for user_stats
CREATE POLICY "Users can view own stats"
  ON user_stats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can update user stats"
  ON user_stats
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to calculate user statistics
CREATE OR REPLACE FUNCTION calculate_user_stats(target_user_id uuid)
RETURNS void AS $$
DECLARE
  stats_record RECORD;
BEGIN
  -- Calculate comprehensive stats
  SELECT 
    COUNT(*) as total_movies,
    COUNT(*) FILTER (WHERE watched = true) as movies_watched,
    COUNT(*) FILTER (WHERE watched = false) as movies_unwatched,
    AVG(personal_rating) FILTER (WHERE personal_rating IS NOT NULL) as avg_personal_rating,
    AVG(rating) FILTER (WHERE rating IS NOT NULL) as avg_tmdb_rating,
    array_agg(DISTINCT unnest(genres)) FILTER (WHERE genres IS NOT NULL AND array_length(genres, 1) > 0) as all_genres,
    MIN(EXTRACT(YEAR FROM release_date)) as oldest_year,
    MAX(EXTRACT(YEAR FROM release_date)) as newest_year
  INTO stats_record
  FROM watchlist_items 
  WHERE user_id = target_user_id;

  -- Insert or update user stats
  INSERT INTO user_stats (
    user_id, 
    total_movies, 
    movies_watched, 
    movies_unwatched,
    average_rating, 
    average_tmdb_rating,
    favorite_genres,
    oldest_movie_year,
    newest_movie_year,
    last_calculated
  ) VALUES (
    target_user_id,
    COALESCE(stats_record.total_movies, 0),
    COALESCE(stats_record.movies_watched, 0),
    COALESCE(stats_record.movies_unwatched, 0),
    stats_record.avg_personal_rating,
    stats_record.avg_tmdb_rating,
    COALESCE(stats_record.all_genres, '{}'),
    stats_record.oldest_year,
    stats_record.newest_year,
    now()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_movies = EXCLUDED.total_movies,
    movies_watched = EXCLUDED.movies_watched,
    movies_unwatched = EXCLUDED.movies_unwatched,
    average_rating = EXCLUDED.average_rating,
    average_tmdb_rating = EXCLUDED.average_tmdb_rating,
    favorite_genres = EXCLUDED.favorite_genres,
    oldest_movie_year = EXCLUDED.oldest_movie_year,
    newest_movie_year = EXCLUDED.newest_movie_year,
    last_calculated = EXCLUDED.last_calculated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically update stats when watchlist changes
CREATE OR REPLACE FUNCTION update_user_stats_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stats for the affected user
  PERFORM calculate_user_stats(COALESCE(NEW.user_id, OLD.user_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats when watchlist items change
CREATE TRIGGER watchlist_stats_update
  AFTER INSERT OR UPDATE OR DELETE ON watchlist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_trigger();

-- Function to create default preferences for new users
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences when user signs up
CREATE TRIGGER create_user_preferences_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_preferences();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();