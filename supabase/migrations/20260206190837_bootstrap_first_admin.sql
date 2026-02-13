-- Migration: Bootstrap first user with admin role
-- Description: Ensures the first user in the system has 'admin' role to enable user creation
-- Created: 2026-02-06

-- This migration assigns 'admin' role to the first user created in the system
-- This solves the "Invalid JWT" error when trying to create new users
-- because the create-user Edge Function requires the caller to have 'admin' or 'rh' role

DO $$
DECLARE
  first_user_id uuid;
  first_user_email text;
BEGIN
  -- Find the first user in auth.users (oldest by creation date)
  SELECT id, email INTO first_user_id, first_user_email
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1;

  -- If a user exists, ensure they have admin role
  IF first_user_id IS NOT NULL THEN
    -- Insert admin role (ignore if already exists)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (first_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role assigned to user: % (%)', first_user_email, first_user_id;
  ELSE
    RAISE NOTICE 'No users found in auth.users - migration skipped';
  END IF;
END $$;
