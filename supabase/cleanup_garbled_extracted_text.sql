-- ==============================================================================
-- CLEANUP MIGRATION: NULL OUT GARBLED & NON-PRINTABLE EXTRACTED TEXT
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Clean garbled/binary/dummy resume_extracted_text from students table
UPDATE public.students
SET resume_extracted_text = NULL
WHERE resume_extracted_text IS NOT NULL
  AND (
    resume_extracted_text LIKE '%\u0000%'
    OR resume_extracted_text LIKE '<!DOCTYPE%'
    OR resume_extracted_text LIKE '%<html%'
    OR resume_extracted_text LIKE '%window[''ppConfig'']%'
    OR resume_extracted_text LIKE 'Candidate Resume Document%'
    OR resume_extracted_text LIKE 'Extracted Document Contents%'
    OR length(regexp_replace(resume_extracted_text, '[^a-zA-Z0-9]', '', 'g')) < 15
  );

-- 2. Clean garbled/binary/dummy jd_text from offers table
UPDATE public.offers
SET jd_text = NULL
WHERE jd_text IS NOT NULL
  AND (
    jd_text LIKE '%\u0000%'
    OR jd_text LIKE '<!DOCTYPE%'
    OR jd_text LIKE '%<html%'
    OR jd_text LIKE '%window[''ppConfig'']%'
    OR jd_text LIKE 'Extracted Document Contents%'
    OR length(regexp_replace(jd_text, '[^a-zA-Z0-9]', '', 'g')) < 15
  );

-- 3. Clean garbled/binary/dummy jd_text from offer_job_roles table
UPDATE public.offer_job_roles
SET jd_text = NULL
WHERE jd_text IS NOT NULL
  AND (
    jd_text LIKE '%\u0000%'
    OR jd_text LIKE '<!DOCTYPE%'
    OR jd_text LIKE '%<html%'
    OR jd_text LIKE '%window[''ppConfig'']%'
    OR jd_text LIKE 'Extracted Document Contents%'
    OR length(regexp_replace(jd_text, '[^a-zA-Z0-9]', '', 'g')) < 15
  );
