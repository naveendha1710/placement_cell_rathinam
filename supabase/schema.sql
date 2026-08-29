-- Placement Management Portal Database Schema
-- Supabase Postgres SQL Script

-- Enable UUID extension if needed
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  role text not null check (role in ('super_admin','placement_coordinator','dept_coordinator','data_entry','report_viewer')),
  department_scope text,        -- null for non-dept-scoped roles
  status text default 'active' check (status in ('active','disabled')),
  created_by uuid references profiles(id),
  last_login timestamptz,
  created_at timestamptz default now()
);

-- 2. STUDENTS TABLE
create table if not exists students (
  student_id uuid primary key default gen_random_uuid(),
  roll_number text unique not null,
  name text not null,
  department text not null,
  gender text,
  residency text check (residency in ('day_scholar','hosteller')),
  sslc_percentage numeric,
  hsc_percentage numeric,
  ug_cgpa numeric,
  ug_percentage numeric,
  pg_cgpa numeric,
  pg_status text default 'not_applicable' check (pg_status in ('not_applicable','pursuing','completed')),
  ug_graduation_year int,
  pg_graduation_year int,
  github_url text, 
  linkedin_url text, 
  portfolio_url text,
  resume_file text,               -- Supabase Storage path
  video_intro_link text,
  photo_file text,
  email text unique not null,
  mobile_number text,
  backlogs_count int default 0,
  placement_status text default 'unplaced' check (placement_status in ('unplaced','placed','opted_out')),
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. COMPANIES TABLE
create table if not exists companies (
  company_id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  website_url text,
  contact_person_name text,       -- quick-view primary contact snapshot
  contact_person_mobile text,
  map_link text,
  employee_count int,
  star_rating int check (star_rating between 1 and 5),
  industry_domain text,
  status text default 'active' check (status in ('active','blacklisted')),
  approval_status text default 'draft' check (approval_status in ('draft','pending_approval','approved','rejected')),
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  rejection_reason text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- 4. COMPANY HR CONTACTS TABLE
create table if not exists company_hr_contacts (
  contact_id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(company_id) on delete cascade not null,
  name text not null,
  email text,
  mobile_number text,
  designation text,
  is_primary boolean default false,
  created_at timestamptz default now()
);

-- 5. OFFERS TABLE
create table if not exists offers (
  offer_id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(company_id) on delete cascade not null,
  jd_text text,
  jd_files text[],                -- Supabase Storage paths
  eligible_departments text[],
  ctc_lpa numeric,
  base_lpa numeric,
  eligibility_criteria jsonb,     -- {min_cgpa, max_backlogs, min_10th_12th_pct}
  drive_date date,
  job_location text,
  drive_mode text check (drive_mode in ('on_campus','virtual','pooled')),
  status text default 'drafted' check (status in ('drafted','scheduled','ongoing','completed','cancelled')),
  approval_status text default 'draft' check (approval_status in ('draft','pending_approval','approved','rejected')),
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  rejection_reason text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- 6. DRIVE APPLICATIONS TABLE (Student Registration Matrix)
create table if not exists drive_applications (
  application_id uuid primary key default gen_random_uuid(),
  offer_id uuid references offers(offer_id) on delete cascade not null,
  student_id uuid references students(student_id) on delete cascade not null,
  applied_at timestamptz default now(),
  match_score numeric,
  match_explanation text,
  matched_model text,
  matched_at timestamptz,
  round_wise_status jsonb default '{}',   -- e.g. {"resume_shortlist": "passed", "technical": "pending"}
  final_status text default 'applied' check (final_status in ('applied','shortlisted','interviewed','selected','rejected','no_show')),
  offer_accepted boolean default false,
  unique (offer_id, student_id)
);

-- 7. DOCUMENT EXTRACTIONS TABLE
create table if not exists document_extractions (
  extraction_id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('student_resume', 'job_description')),
  entity_id uuid not null,
  extracted_text text not null,
  status text default 'done' check (status in ('pending', 'processing', 'done', 'failed')),
  extracted_at timestamptz default now(),
  unique (entity_type, entity_id)
);

-- DISABLE ROW LEVEL SECURITY ON ALL TABLES (Per architecture spec)
alter table profiles disable row level security;
alter table students disable row level security;
alter table companies disable row level security;
alter table company_hr_contacts disable row level security;
alter table offers disable row level security;
alter table drive_applications disable row level security;
alter table document_extractions disable row level security;

-- SAFE MIGRATION CHECKS: Ensure columns exist if tables were created previously
alter table students add column if not exists roll_number text;
alter table students add column if not exists name text;
alter table students add column if not exists department text;
alter table students add column if not exists gender text;
alter table students add column if not exists residency text;
alter table students add column if not exists sslc_percentage numeric;
alter table students add column if not exists hsc_percentage numeric;
alter table students add column if not exists ug_cgpa numeric;
alter table students add column if not exists ug_percentage numeric;
alter table students add column if not exists pg_cgpa numeric;
alter table students add column if not exists pg_status text default 'not_applicable';
alter table students add column if not exists ug_graduation_year int;
alter table students add column if not exists pg_graduation_year int;
alter table students add column if not exists github_url text;
alter table students add column if not exists linkedin_url text;
alter table students add column if not exists portfolio_url text;
alter table students add column if not exists resume_file text;
alter table students add column if not exists video_intro_link text;
alter table students add column if not exists photo_file text;
alter table students add column if not exists email text;
alter table students add column if not exists mobile_number text;
alter table students add column if not exists backlogs_count int default 0;
alter table students add column if not exists placement_status text default 'unplaced';

alter table drive_applications add column if not exists match_score numeric;
alter table drive_applications add column if not exists match_explanation text;
alter table drive_applications add column if not exists matched_model text;
alter table drive_applications add column if not exists matched_at timestamptz;

-- STORAGE BUCKETS SETUP & PUBLIC RLS POLICIES
insert into storage.buckets (id, name, public) 
values ('student_files', 'student_files', true) 
on conflict (id) do update set public = true;

drop policy if exists "Allow Public Uploads student_files" on storage.objects;
drop policy if exists "Allow Public Reads student_files" on storage.objects;
drop policy if exists "Allow Public Updates student_files" on storage.objects;

create policy "Allow Public Uploads student_files" 
on storage.objects for insert 
with check (bucket_id = 'student_files');

create policy "Allow Public Reads student_files" 
on storage.objects for select 
using (bucket_id = 'student_files');

create policy "Allow Public Updates student_files" 
on storage.objects for update 
using (bucket_id = 'student_files');
