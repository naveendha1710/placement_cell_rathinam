-- ==============================================================================
-- CREATE SUPABASE STORAGE BUCKET: jd-files
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Create jd-files storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('jd-files', 'jd-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Create Permissive Storage RLS Policies
DROP POLICY IF EXISTS "Public Read Access for jd-files" ON storage.objects;
CREATE POLICY "Public Read Access for jd-files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'jd-files');

DROP POLICY IF EXISTS "Public Upload Access for jd-files" ON storage.objects;
CREATE POLICY "Public Upload Access for jd-files"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'jd-files');

DROP POLICY IF EXISTS "Public Update/Delete for jd-files" ON storage.objects;
CREATE POLICY "Public Update/Delete for jd-files"
ON storage.objects FOR ALL
TO public
USING (bucket_id = 'jd-files')
WITH CHECK (bucket_id = 'jd-files');
