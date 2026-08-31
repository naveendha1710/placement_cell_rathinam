-- ==============================================================================
-- MIGRATION: LINK-BASED RESUME/JD & AI SKILL MATCHING COLUMNS
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Add link & extracted text fields to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS resume_link text,
ADD COLUMN IF NOT EXISTS resume_extracted_text text;

-- 2. Add link field to offers & offer_job_roles tables
ALTER TABLE public.offers
ADD COLUMN IF NOT EXISTS jd_link text;

ALTER TABLE public.offer_job_roles
ADD COLUMN IF NOT EXISTS jd_link text;

-- 3. Add matched_skills & missing_skills columns to drive_applications table
ALTER TABLE public.drive_applications
ADD COLUMN IF NOT EXISTS matched_skills jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS missing_skills jsonb DEFAULT '[]'::jsonb;
