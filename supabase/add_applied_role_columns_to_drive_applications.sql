-- ==============================================================================
-- ADD APPLIED ROLE COLUMNS TO PUBLIC.DRIVE_APPLICATIONS TABLE IN SUPABASE
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

ALTER TABLE public.drive_applications
ADD COLUMN IF NOT EXISTS applied_role_id text,
ADD COLUMN IF NOT EXISTS applied_role_title text;
