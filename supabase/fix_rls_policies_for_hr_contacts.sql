-- Migration: Fix 401 Unauthorized RLS policies for company_hr_contacts & relational tables
-- Run this script in your Supabase SQL Editor

-- 1. Fix public.company_hr_contacts RLS
ALTER TABLE public.company_hr_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read for company_hr_contacts" ON public.company_hr_contacts;
DROP POLICY IF EXISTS "Allow authenticated write for company_hr_contacts" ON public.company_hr_contacts;
DROP POLICY IF EXISTS "Allow all for company_hr_contacts" ON public.company_hr_contacts;
DROP POLICY IF EXISTS "Allow select for company_hr_contacts" ON public.company_hr_contacts;
DROP POLICY IF EXISTS "Allow insert/update/delete for company_hr_contacts" ON public.company_hr_contacts;

CREATE POLICY "Allow select for company_hr_contacts"
ON public.company_hr_contacts FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow insert/update/delete for company_hr_contacts"
ON public.company_hr_contacts FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 2. Fix public.offer_stage_history RLS
ALTER TABLE public.offer_stage_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read for offer_stage_history" ON public.offer_stage_history;
DROP POLICY IF EXISTS "Allow authenticated insert for offer_stage_history" ON public.offer_stage_history;
DROP POLICY IF EXISTS "Allow select for offer_stage_history" ON public.offer_stage_history;
DROP POLICY IF EXISTS "Allow insert for offer_stage_history" ON public.offer_stage_history;

CREATE POLICY "Allow select for offer_stage_history"
ON public.offer_stage_history FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow insert for offer_stage_history"
ON public.offer_stage_history FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 3. Fix public.offer_job_roles RLS
ALTER TABLE public.offer_job_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read for offer_job_roles" ON public.offer_job_roles;
DROP POLICY IF EXISTS "Allow authenticated write for offer_job_roles" ON public.offer_job_roles;
DROP POLICY IF EXISTS "Allow select for offer_job_roles" ON public.offer_job_roles;
DROP POLICY IF EXISTS "Allow insert/update/delete for offer_job_roles" ON public.offer_job_roles;

CREATE POLICY "Allow select for offer_job_roles"
ON public.offer_job_roles FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow insert/update/delete for offer_job_roles"
ON public.offer_job_roles FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
