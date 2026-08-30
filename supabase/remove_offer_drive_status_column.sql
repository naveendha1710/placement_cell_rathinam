-- Migration: Remove status column from offers table completely
-- Run this script in your Supabase SQL Editor

-- 1. Drop status column from offers table
ALTER TABLE public.offers 
DROP COLUMN IF EXISTS status;

-- 2. Drop the custom enum type if it exists
DROP TYPE IF EXISTS public.offer_drive_status CASCADE;
