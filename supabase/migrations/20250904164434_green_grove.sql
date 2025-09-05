/*
  # Media Server Integration Schema

  1. New Tables
    - `media_server_configs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `server_type` (text, 'radarr' or 'sonarr')
      - `server_url` (text, server URL)
      - `api_key_encrypted` (text, encrypted API key)
      - `is_active` (boolean, connection status)
      - `last_connected` (timestamp, last successful connection)
      - `created_at` (timestamp, when config was created)

    - `media_server_movies`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `tmdb_id` (integer, TMDB movie ID)
      - `server_type` (text, 'radarr' or 'sonarr')
      - `server_movie_id` (integer, ID in media server)
      - `status` (text, download status)
      - `quality_profile` (text, quality setting)
      - `monitored` (boolean, if monitored in server)
      - `last_updated` (timestamp, last status check)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own media server configurations
    - API keys are stored encrypted for security

  3. Features
    - Track multiple media servers per user
    - Monitor download status of movies
    - Sync with Radarr/Sonarr instances
*/

-- Create media_server_configs table
CREATE TABLE IF NOT EXISTS media_server_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  server_type text NOT NULL CHECK (server_type IN ('radarr', 'sonarr')),
  server_url text NOT NULL,
  api_key_encrypted text NOT NULL,
  server_name text DEFAULT '',
  is_active boolean DEFAULT true,
  last_connected timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- One active server per type per user
  UNIQUE(user_id, server_type, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Create media_server_movies table
CREATE TABLE IF NOT EXISTS media_server_movies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tmdb_id integer NOT NULL,
  server_type text NOT NULL CHECK (server_type IN ('radarr', 'sonarr')),
  server_movie_id integer,
  status text DEFAULT 'wanted' CHECK (status IN ('wanted', 'downloading', 'downloaded', 'failed')),
  quality_profile text DEFAULT '',
  monitored boolean DEFAULT true,
  file_path text,
  file_size_bytes bigint,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  -- Prevent duplicate entries
  UNIQUE(user_id, tmdb_id, server_type)
);

-- Enable Row Level Security
ALTER TABLE media_server_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_server_movies ENABLE ROW LEVEL SECURITY;

-- Policies for media_server_configs
CREATE POLICY "Users can manage own media server configs"
  ON media_server_configs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for media_server_movies
CREATE POLICY "Users can manage own media server movies"
  ON media_server_movies
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_media_configs_user_type ON media_server_configs(user_id, server_type);
CREATE INDEX IF NOT EXISTS idx_media_configs_active ON media_server_configs(user_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_media_movies_user_id ON media_server_movies(user_id);
CREATE INDEX IF NOT EXISTS idx_media_movies_tmdb_id ON media_server_movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_media_movies_status ON media_server_movies(user_id, status);
CREATE INDEX IF NOT EXISTS idx_media_movies_updated ON media_server_movies(last_updated DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_media_server_configs_updated_at
  BEFORE UPDATE ON media_server_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();