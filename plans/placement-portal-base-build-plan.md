# Placement Portal — Base Build Plan (for Antigravity agent)

Scope for this pass: **Login → Sidebar (Dashboard, Students, Companies, User Management) → DB → role-based CRUD (frontend-enforced, RLS off) → Excel import (students + companies) → Company→Offer approval workflow**. Everything else from the full spec (resume/JD matching, reports, notifications) is deliberately **out of scope** for this build — noted at the end so nothing gets silently lost.

*Note: "v1" and "v2" refer to the two uploaded copies of the same requirements doc, not different revisions — they're identical, both v0.2. Referred to here just to distinguish which decisions came from that original spec vs. this build plan.*

---

## 0. Tech stack (locked — carried over from v1/v2, unchanged)

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + TypeScript + Vite + npm | Fast dev server, standard tooling, TS catches schema-mismatch bugs early against Supabase types |
| UI kit | shadcn/ui, **strictly** — no mixing in other component libraries | One design system only, so the agent doesn't drift into inconsistent components across screens; keeps bundle lean |
| Theme | Monochrome (Zinc/Slate): black, white, grays, clean borders, no color accents beyond status badges | Matches the original spec's visual direction — status badges (pending/approved/rejected, placed/unplaced) are the only place color carries meaning |
| Backend | Supabase (Postgres + Storage) | One managed service covers DB, auth, file storage, and (later) Edge Functions for JD/resume extraction — avoids standing up separate infra for a base build |
| Auth | Supabase Auth (`auth.users` + `profiles` extension table) | No custom password column to manage; session handling and email/password login come built-in |
| Hosting | Cloudflare Pages (frontend) + Supabase-hosted backend | Static frontend deploy, zero-ops backend — matches the "get to a demoable state fast" goal |
| Excel import | `xlsx` or `papaparse`, client-side | No server round-trip needed just to read a spreadsheet before validating/inserting rows |

**Constraint to hold the agent to:** don't substitute any of these (e.g. no swapping in Firebase, MUI, or a custom Express backend) — the whole plan (RLS-off access model, Storage-hosted files, Edge Function extraction later) assumes this exact stack. If the agent proposes a different library "for convenience," that's a flag to stop and check against this table.

---

## 0.1 What "minimal" means here — cuts from the full spec

To keep this a clean base you can extend later, trim the v0.2 spec down to:

| Kept | Cut for now (add later) |
|---|---|
| `students`, `companies`, `company_hr_contacts`, `offers`, `drive_applications`, `profiles` tables (6-table model) | Department-scoped nuance in the frontend role checks (start with role-only, add dept scope next pass) |
| 5 roles, stored on `profiles` and enforced **in the frontend** (RLS off) | JD/resume upload, extraction, LLM matching |
| CRUD forms + table views for Students/Companies/Offers, plus a registration screen for `drive_applications` | Reports module, audit log, notifications, Settings |
| Excel import for Students + Companies | Approval-triggered eligibility auto-filter (manual selection for now) |
| Dashboard with basic counters | Auto re-triggering approval on edits to an already-approved offer |
| **Company → Offer approval workflow** (draft→pending→approved/rejected, company must be approved before an offer can attach to it) | |
| **Multiple HR contacts per company** (`company_hr_contacts` child table, one marked primary) | |

Per the original spec's architecture section: **RLS stays OFF**, same as v1/v2. Role/`department_scope` are stored on `profiles` and shown as badges — the UI looks and behaves like a permissioned system — but access control (who sees/edits what) is enforced entirely in the frontend, not the database. Fine for a small, trusted staff list on a base build; would need RLS re-enabled before this handles real staff/student data unsupervised — flagged once here rather than repeated at every section.

---

## 1. Database schema (this pass)

```sql
-- profiles: extends auth.users
create table profiles (
  id uuid primary key references auth.users(id),
  name text not null,
  email text unique not null,
  role text not null check (role in ('super_admin','placement_coordinator','dept_coordinator','data_entry','report_viewer')),
  department_scope text,        -- null for non-dept-scoped roles
  status text default 'active' check (status in ('active','disabled')),
  created_by uuid references profiles(id),
  last_login timestamptz,
  created_at timestamptz default now()
);

-- students
create table students (
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
  github_url text, linkedin_url text, portfolio_url text,
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

-- companies
create table companies (
  company_id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  website_url text,
  contact_person_name text,       -- quick-view primary contact, kept in sync with the is_primary row below
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

-- company_hr_contacts: a company can have multiple HR contacts (your "star level"/contact suggestion, expanded)
create table company_hr_contacts (
  contact_id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(company_id) on delete cascade not null,
  name text not null,
  email text,
  mobile_number text,
  designation text,
  is_primary boolean default false,   -- exactly one per company should be true; UI enforces this on save
  created_at timestamptz default now()
);
create table offers (
  offer_id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(company_id) not null,   -- must reference an approved company (enforced in the Add Offer form, Section 5)
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

-- drive_applications: the registration matrix — student applies to an offer
create table drive_applications (
  application_id uuid primary key default gen_random_uuid(),
  offer_id uuid references offers(offer_id) not null,
  student_id uuid references students(student_id) not null,
  applied_at timestamptz default now(),
  match_score numeric,
  match_explanation text,
  round_wise_status jsonb default '{}',   -- {resume_shortlist: "passed", technical: "pending"}
  final_status text default 'applied' check (final_status in ('applied','shortlisted','interviewed','selected','rejected','no_show')),
  offer_accepted boolean default false,
  unique (offer_id, student_id)           -- a student registers once per offer
);
```

**Access control (RLS off, per original spec):**
```sql
alter table students disable row level security;
alter table companies disable row level security;
alter table company_hr_contacts disable row level security;
alter table offers disable row level security;
alter table drive_applications disable row level security;
alter table profiles disable row level security;
```
Role/`department_scope` are read from the logged-in user's `profiles` row on the client, and every screen enforces its own rule in the frontend:
- `super_admin`, `placement_coordinator`: full read/write on students, companies, company_hr_contacts, offers, drive_applications.
- `dept_coordinator`: same, but student/drive_application lists filtered client-side to `department = profile.department_scope`.
- `data_entry`: insert/update on students, companies, company_hr_contacts, offers, delete buttons hidden; can register a student (create drive_applications) but not edit `final_status`/`offer_accepted`.
- `report_viewer`: forms/delete controls hidden everywhere, read-only screens only.
- `profiles`: only `super_admin` sees User Management; everyone else can view/edit their own row.

Since there's no DB-level gate, any authenticated client can technically read/write any row — acceptable for a small, trusted staff list on a base build, same trade-off the original spec called out. Not appropriate once this handles real student/staff data unsupervised; re-enabling RLS with policies matching the list above is a drop-in upgrade later, no schema change needed.

**Approval workflow (Company → Offer, in this order):**

State machine, same shape for both tables, reused: `draft → pending_approval → approved` or `rejected (with reason) → back to draft → resubmit`.

- **Company first.** A company is created as `draft`, submitted (`pending_approval`), then a `super_admin` (or `placement_coordinator`, per Section 1's role list) clicks Approve/Reject. Only `approved` companies are selectable when creating an Offer — this is the "company added first" ordering you flagged.
- **Offer under an approved company.** The Add Offer form only lists companies where `approval_status = 'approved'` in its company picker — an offer literally cannot be attached to a company that hasn't cleared approval yet. The offer then goes through its own identical `draft → pending_approval → approved/rejected` cycle before it's usable in the registration matrix (Section 5).
- **Gate point:** only offers with `approval_status = 'approved'` (on top of an approved company) are eligible for the "register students" screen — same rule the original spec used for its "select students & generate application form" step.
- This is a **frontend-enforced** gate, same as everything else in Section 1 (RLS is off) — the company picker and registration screen both filter by `approval_status = 'approved'` client-side. No DB constraint blocks an offer from pointing at an unapproved company; the UI just never offers that option.
- Editing an *already-approved* offer (e.g. a CTC change) does **not** auto re-trigger approval in this base build — kept simple on purpose. Flag this if you want silent edits to approved offers to force resubmission; it's a one-line addition to the edit-save handler later.

---

## 2. App shell

- **Login:** Supabase Auth email/password. No self-signup — accounts are created by `super_admin` from User Management. After login, fetch the `profiles` row for role/name to drive UI.
- **Sidebar (role-aware — hide links the role can't use; with RLS off, this frontend check IS the gate, so keep it consistent with the per-screen rules in Section 1, not just cosmetic):**
  - Dashboard
  - Students
  - Companies *(Offers/Drives as a tab inside a company, or its own sidebar entry — your call, same as v0.2)*
  - User Management *(super_admin only)*
- Route guard: redirect to login if no session; redirect away from User Management if role isn't `super_admin`.

---

## 3. Dashboard (minimal)

Just counters, no charts yet:
- Total students / placed / unplaced
- Total companies (active)
- Total offers / active drives
- Total users

## 4. Students & Companies modules

Each gets:
- Table view (search + column sort; filter by department for Students)
- Add/Edit form matching the schema above
- Delete (hidden for `data_entry` and `report_viewer`)
- **Excel import** button → template download → client-side parse (`xlsx` or `papaparse`) → per-row validation (required fields, `roll_number`/`email` uniqueness for students; nothing unique-constrained for companies besides letting duplicates be flagged, not blocked) → insert valid rows → show "`N` inserted, `M` skipped" summary with skip reasons.

Companies additionally get an **approval status badge** (draft/pending/approved/rejected) on the table view, and Submit / Approve / Reject actions per the workflow in Section 1 (Approve/Reject visible only to roles allowed to approve — `super_admin`, `placement_coordinator`). Excel-imported companies land as `draft`, same as manually created ones — the importer doesn't bypass approval.

**HR contacts (multiple per company):** on the company detail view, an "HR Contacts" sub-table — add/edit/delete rows (name, email, mobile, designation), mark one as primary. Marking a contact primary copies its name/mobile into `companies.contact_person_name`/`contact_person_mobile` for quick display in the main Companies table, so the list view doesn't need a join just to show one contact. Delete on a contact hidden for `data_entry`/`report_viewer`, same as everywhere else.

## 5. Offers & registration matrix (`drive_applications`)

- **Offers:** table view under a company (or its own tab) — list of offers for that company; Add/Edit form matching the schema above; delete hidden for `data_entry`/`report_viewer`. The company picker on the Add Offer form only shows companies with `approval_status = 'approved'` (Section 1's workflow — company must clear approval before an offer can be attached to it).
- Offers carry the same **Submit / Approve / Reject** actions and status badge as Companies, using the identical state machine.
- **Registration matrix:** on an offer's detail page, a "Register students" screen — only reachable once the offer itself is `approved`. Pick students (filter by `eligible_departments`), insert `drive_applications` rows. A simple table per offer showing registered students + `final_status`, with inline status update (dropdown) for roles allowed to edit it.
- No auto-eligibility filtering or LLM matching yet — selection is manual, `match_score`/`match_explanation` fields exist in the schema but stay empty until that feature is built.

## 6. User Management (super_admin only)


- Table of `profiles`: name, email, role, department_scope, status
- Create user (creates `auth.users` + `profiles` row — invite-by-email is fine for base build, avoids storing a temp password)
- Edit role / department_scope / status (disable instead of delete, so audit trail isn't broken later)

---

## 7. Suggested build order (hand to the agent as sequential prompts)

1. **Scaffold** — Vite + React + TS, shadcn/ui with Zinc theme, Supabase client wired up, `.env` for keys.
2. **Schema** — run the SQL above as a migration (all 6 tables), storage buckets for resumes/photos/JD files, RLS left disabled per Section 1.
3. **Auth** — login page, session handling, `profiles` fetch on login, protected route wrapper.
4. **Sidebar + Dashboard shell** — layout, role-aware nav, dashboard counters wired to real counts.
5. **Students CRUD** — table, form, delete, role-gated buttons (frontend checks, per Section 1's per-role rules).
6. **Companies CRUD + approval workflow + HR contacts** — same pattern as Students, plus Submit/Approve/Reject actions and status badge (Section 1), plus the HR Contacts sub-table on the company detail view (add/edit/delete, mark primary).
7. **Excel import** — shared importer component parameterized by table (students/companies), template + validation + summary; imported companies land as `draft`.
8. **Offers CRUD + approval + registration matrix** — offers table/form under Companies (company picker filtered to `approved` only), same Submit/Approve/Reject flow, then the "register students" screen (gated on offer being `approved`) writing to `drive_applications`, plus inline `final_status` updates.
9. **User Management** — table, create/edit user, role/status controls, `super_admin`-only route.
10. **Pass:** log in as each of the 5 roles once and confirm every screen's frontend role check actually hides/blocks what it should, and that the Company→Offer approval gating holds (can't create an offer under an unapproved company, can't register students on an unapproved offer) — since there's no DB backstop, this pass is the only thing enforcing both.

---

## 8. Explicitly deferred (from the full v0.2 spec)

- RLS / DB-level access control (currently frontend-only, as in v1/v2 — see Section 1)
- Re-triggering approval automatically on edits to an already-approved offer (e.g. CTC change) — currently a manual resubmit only, per Section 1
- Resume/JD upload + text extraction + LLM matching (`match_score`/`match_explanation` fields exist but stay unpopulated)
- Auto eligibility-filter on `eligibility_criteria` (selection is manual for now)
- Reports module, audit log, notifications, Settings
- Department-scoped nuance beyond the basic frontend checks above (e.g. dept_coordinator restrictions on companies/offers)

These slot in as later phases on top of this base without schema rework — the schema already carries the fields they need.
