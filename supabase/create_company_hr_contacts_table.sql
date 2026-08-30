-- Migration: Create company_hr_contacts table for HR Contact records
-- Run this script in your Supabase SQL Editor

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

-- Index for fast lookup by company_id
CREATE INDEX IF NOT EXISTS idx_company_hr_contacts_company_id ON public.company_hr_contacts(company_id);

-- Enable RLS & Policies
ALTER TABLE public.company_hr_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read for company_hr_contacts" ON public.company_hr_contacts;
CREATE POLICY "Allow authenticated read for company_hr_contacts"
ON public.company_hr_contacts FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated write for company_hr_contacts" ON public.company_hr_contacts;
CREATE POLICY "Allow authenticated write for company_hr_contacts"
ON public.company_hr_contacts FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
