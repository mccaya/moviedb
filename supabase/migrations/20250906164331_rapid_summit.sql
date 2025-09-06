/*
  # Add signup webhook trigger

  1. New Functions
    - `handle_new_user_signup()` - Trigger function to call edge function when user signs up
    
  2. New Triggers  
    - `on_auth_user_created` - Calls webhook function when new user is inserted into auth.users
    
  3. Security
    - Function runs with security definer to access auth schema
    - Only triggers on INSERT operations for new users
*/

-- Function to handle new user signups and call webhook
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url text;
  webhook_payload jsonb;
  http_response record;
BEGIN
  -- Only process if this is a new user signup (not an update)
  IF TG_OP = 'INSERT' THEN
    -- Prepare the payload for the edge function
    webhook_payload := jsonb_build_object(
      'email', NEW.email,
      'user_id', NEW.id::text,
      'created_at', NEW.created_at::text
    );
    
    -- Call the edge function asynchronously using pg_net (if available)
    -- Note: This requires the pg_net extension to be enabled in Supabase
    BEGIN
      -- Get the Supabase URL from environment or construct it
      -- In production, you would set this as a database setting
      webhook_url := current_setting('app.supabase_url', true) || '/functions/v1/signup-webhook';
      
      -- If the setting is not available, construct a default URL
      IF webhook_url IS NULL OR webhook_url = '/functions/v1/signup-webhook' THEN
        -- This will need to be configured with your actual Supabase project URL
        webhook_url := 'https://your-project-ref.supabase.co/functions/v1/signup-webhook';
      END IF;
      
      -- Make HTTP request to edge function
      -- Note: This uses pg_net extension which may not be available in all Supabase instances
      -- Alternative: Use a simpler approach with database notifications
      
      -- For now, we'll use a notification approach that can be picked up by a background service
      PERFORM pg_notify('user_signup', webhook_payload::text);
      
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't fail the user creation
      RAISE WARNING 'Failed to send signup webhook: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table for new signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_signup();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT SELECT ON auth.users TO postgres;