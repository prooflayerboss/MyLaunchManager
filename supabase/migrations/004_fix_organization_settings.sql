-- Fix organization_settings RLS and add unique constraint
-- Run this in Supabase SQL Editor

-- Update RLS policy to properly support INSERT operations
DROP POLICY IF EXISTS "Users manage own settings" ON organization_settings;

CREATE POLICY "Users manage own settings" ON organization_settings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add unique constraint on user_id to prevent duplicates
-- First clean up any duplicates (keeps oldest)
DELETE FROM organization_settings a
USING organization_settings b
WHERE a.user_id = b.user_id
  AND a.created_at > b.created_at;

-- Add the constraint
ALTER TABLE organization_settings
ADD CONSTRAINT organization_settings_user_id_unique UNIQUE (user_id);
