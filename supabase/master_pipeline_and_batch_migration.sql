-- ==============================================================================
-- MASTER SQL MIGRATION SCRIPT FOR OFFER PIPELINE, MULTI-ROLE & STUDENT BATCHES
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Add Student Batch column (T, O, S, A, X) and randomly populate existing students per-row
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS batch text CHECK (batch IN ('T', 'O', 'S', 'A', 'X'));

UPDATE public.students
SET batch = CASE floor(random() * 5)::int
  WHEN 0 THEN 'T'
  WHEN 1 THEN 'O'
  WHEN 2 THEN 'S'
  WHEN 3 THEN 'A'
  ELSE 'X'
END
WHERE batch IS NULL;

-- 2. Drop obsolete 'status' column from public.offers table
ALTER TABLE public.offers
DROP COLUMN IF EXISTS status;

-- 3. Add 4-Stage Offer Pipeline fields, Multi-Role JSONB, updated_at, and Creator User tracking
ALTER TABLE public.offers
ADD COLUMN IF NOT EXISTS remarks text,
ADD COLUMN IF NOT EXISTS tentative_drive_date text,
ADD COLUMN IF NOT EXISTS contact_person_name text,
ADD COLUMN IF NOT EXISTS expected_openings integer,
ADD COLUMN IF NOT EXISTS job_roles jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 4. Create separate relational table public.offer_stage_history for timestamped audit logs
CREATE TABLE IF NOT EXISTS public.offer_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(offer_id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('cold', 'warm', 'hot', 'drive_completed', 'drive_closed')),
  timestamp timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by offer_id ordered by timestamp
CREATE INDEX IF NOT EXISTS idx_offer_stage_history_offer_id ON public.offer_stage_history(offer_id, timestamp ASC);

-- Enable RLS & Permissive Policies for offer_stage_history
ALTER TABLE public.offer_stage_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for offer_stage_history" ON public.offer_stage_history;
CREATE POLICY "Allow select for offer_stage_history" ON public.offer_stage_history FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for offer_stage_history" ON public.offer_stage_history;
CREATE POLICY "Allow insert for offer_stage_history" ON public.offer_stage_history FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. Create separate relational table public.offer_job_roles for Multi-Role Positions
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
  extraction_id uuid, -- Link to document_extractions table if AI extracted
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookup by offer_id
CREATE INDEX IF NOT EXISTS idx_offer_job_roles_offer_id ON public.offer_job_roles(offer_id);

-- Enable RLS & Permissive Policies for offer_job_roles
ALTER TABLE public.offer_job_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for offer_job_roles" ON public.offer_job_roles;
CREATE POLICY "Allow select for offer_job_roles" ON public.offer_job_roles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert/update/delete for offer_job_roles" ON public.offer_job_roles;
CREATE POLICY "Allow insert/update/delete for offer_job_roles" ON public.offer_job_roles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. Create public.company_hr_contacts table
CREATE TABLE IF NOT EXISTS public.company_hr_contacts (
  contact_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(company_id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  mobile_number text,
  designation text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_hr_contacts_company_id ON public.company_hr_contacts(company_id);

-- Enable RLS & Permissive Policies for company_hr_contacts
ALTER TABLE public.company_hr_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for company_hr_contacts" ON public.company_hr_contacts;
CREATE POLICY "Allow select for company_hr_contacts" ON public.company_hr_contacts FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert/update/delete for company_hr_contacts" ON public.company_hr_contacts;
CREATE POLICY "Allow insert/update/delete for company_hr_contacts" ON public.company_hr_contacts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
