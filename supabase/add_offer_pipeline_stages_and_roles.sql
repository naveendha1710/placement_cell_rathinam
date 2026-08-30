-- Migration: Add 4-Stage Offer Pipeline tracking and Multi-Role support (JSONB)
-- Run this script in your Supabase SQL Editor

ALTER TABLE public.offers
ADD COLUMN IF NOT EXISTS remarks text,
ADD COLUMN IF NOT EXISTS tentative_drive_date text,
ADD COLUMN IF NOT EXISTS contact_person_name text,
ADD COLUMN IF NOT EXISTS expected_openings integer,
ADD COLUMN IF NOT EXISTS job_roles jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
