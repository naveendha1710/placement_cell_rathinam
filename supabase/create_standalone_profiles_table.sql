-- Standalone Profiles & User Table (Independent from auth.users)
-- Run this script in Supabase SQL Editor (https://app.supabase.com -> SQL Editor)

-- 1. Remove Foreign Key Constraint to auth.users if present
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Create public.profiles table if not exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL CHECK (role IN ('super_admin','placement_coordinator','dept_coordinator','data_entry','report_viewer')),
  department_scope TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_by UUID REFERENCES public.profiles(id),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add password_hash column if not already existing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 4. Disable Row Level Security (Portal manages role-based boundaries on frontend)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
