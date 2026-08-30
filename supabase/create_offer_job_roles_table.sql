-- Migration: Create separate relational table public.offer_job_roles for Multi-Role Positions
-- Run this script in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.offer_job_roles (
  role_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(offer_id) ON DELETE CASCADE,
  role_title text NOT NULL,
  ctc_lpa numeric,
  base_lpa numeric,
  vacancies integer DEFAULT 1,
  eligible_departments text[],
  allowed_batches text[],
  min_cgpa numeric,
  max_backlogs integer,
  jd_text text,
  jd_files text[],
  extraction_id uuid, -- Reference to document_extractions table if AI extracted
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookup by offer_id
CREATE INDEX IF NOT EXISTS idx_offer_job_roles_offer_id ON public.offer_job_roles(offer_id);

-- Enable RLS & Policies
ALTER TABLE public.offer_job_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read for offer_job_roles" ON public.offer_job_roles;
CREATE POLICY "Allow authenticated read for offer_job_roles"
ON public.offer_job_roles FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated write for offer_job_roles" ON public.offer_job_roles;
CREATE POLICY "Allow authenticated write for offer_job_roles"
ON public.offer_job_roles FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
