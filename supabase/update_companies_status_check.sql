-- Migration: Allow 'inactive' and 'paused' in companies_status_check constraint
-- Run this in your Supabase SQL Editor

-- 1. Drop existing status check constraint if it exists
ALTER TABLE public.companies 
DROP CONSTRAINT IF EXISTS companies_status_check;

-- 2. Re-create constraint allowing 'active', 'inactive', 'paused', and 'blacklisted'
ALTER TABLE public.companies 
ADD CONSTRAINT companies_status_check 
CHECK (status IN ('active', 'inactive', 'paused', 'blacklisted'));
