/*
  # Movie Watchlist Database Schema

  1. New Tables
    - `watchlist_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `tmdb_id` (integer, TMDB movie ID)
      - `title` (text, movie title)
      - `poster_path` (text, poster image path)
      - `overview` (text, movie description)
      - `release_date` (date, movie release date)
      - `rating` (decimal, TMDB rating)
      - `genres` (text array, movie genres)
      - `watched` (boolean, watch status)
      - `personal_rating` (integer, user's personal rating 1-10)
      - `added_at` (timestamp, when added to watchlist)
      - Unique constraint on (user_id, tmdb_id) to prevent duplicates

  2. Security
    - Enable RLS on `watchlist_items` table
    - Add policy for authenticated users to manage their own watchlist items
    - Users can only see and modify their own data

  3. Indexes
    - Index on user_id for fast watchlist queries
    - Index on tmdb_id for duplicate checking
    - Index on added_at for sorting by date added
*/

-- Create watchlist_items table
CREATE TABLE IF NOT EXISTS watchlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tmdb_id integer NOT NULL,
  title text NOT NULL,
  poster_path text,
  overview text,
  release_date date,
  rating decimal(3,1),
  genres text[] DEFAULT '{}',
  watched boolean DEFAULT false,
  personal_rating integer CHECK (personal_rating >= 1 AND personal_rating <= 10),
  added_at timestamptz DEFAULT now(),
  
  -- Prevent duplicate movies in same user's watchlist
  UNIQUE(user_id, tmdb_id)
);

-- Enable Row Level Security
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own watchlist
CREATE POLICY "Users can manage own watchlist items"
  ON watchlist_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_tmdb_id ON watchlist_items(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_added_at ON watchlist_items(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_watched ON watchlist_items(user_id, watched);
CREATE INDEX IF NOT EXISTS idx_watchlist_rating ON watchlist_items(user_id, personal_rating DESC) WHERE personal_rating IS NOT NULL;