/*
  # Add thumbs up/down rating system

  1. New Columns
    - `user_preference` (text) - stores 'thumbs_up', 'thumbs_down', or null
    
  2. Changes
    - Add user_preference column to watchlist_items table
    - Add check constraint to ensure valid values
    
  3. Notes
    - This replaces the numerical personal_rating system
    - Will be used for advanced AI recommendations later
*/

-- Add user_preference column to store thumbs up/down
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'watchlist_items' AND column_name = 'user_preference'
  ) THEN
    ALTER TABLE watchlist_items ADD COLUMN user_preference text;
  END IF;
END $$;

-- Add check constraint for valid preference values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'watchlist_items_user_preference_check'
  ) THEN
    ALTER TABLE watchlist_items ADD CONSTRAINT watchlist_items_user_preference_check 
    CHECK (user_preference IN ('thumbs_up', 'thumbs_down'));
  END IF;
END $$;