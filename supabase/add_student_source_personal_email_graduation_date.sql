-- Migration: Add missing columns (pg_percentage, source, personal_email, graduation_date) to students table in Supabase PostgreSQL
-- Run this script in your Supabase SQL Editor

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS pg_percentage numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS source text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS personal_email text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS graduation_date text DEFAULT NULL;
