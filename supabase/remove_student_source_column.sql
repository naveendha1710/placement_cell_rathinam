-- ==============================================================================
-- MIGRATION: REMOVE SOURCE COLUMN FROM STUDENTS TABLE
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

ALTER TABLE public.students
DROP COLUMN IF EXISTS source;
