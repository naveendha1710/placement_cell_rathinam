# Placement Portal — Requirements & Data Model (v0.2 — hackathon build)

Scope note: stack and architecture are now finalized for the hackathon build (Section 0). Several decisions below intentionally trade production hardening for build speed — disabled RLS, a streamlined excel importer, zero seed data. Where that trade-off matters, it's flagged inline rather than buried.

---

## 0. Tech stack & architecture (finalized)

- **Frontend:** React + TypeScript + Vite + npm.
- **UI:** shadcn/ui, strictly — no mixing in other component libraries. Monochrome palette (Zinc/Slate): black, white, subtle grays, clean borders, no color accents beyond status badges.
- **Backend:** Supabase (Postgres + Storage).
- **Hosting:** Cloudflare Pages (frontend), Supabase-hosted backend.
- **Row-Level Security:** explicitly **disabled** on every table for this build:
  ```sql
  ALTER TABLE students DISABLE ROW LEVEL SECURITY;
  ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
  ALTER TABLE offers DISABLE ROW LEVEL SECURITY;
  ALTER TABLE drive_applications DISABLE ROW LEVEL SECURITY;
  ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
  ```
  All access control (who sees/edits what) is enforced in the frontend, not the database — fine for a hackathon demo with a trusted, small user list; not appropriate for handling real student data unsupervised. Flagged once here rather than repeated at every section.
- **Data policy:** zero pre-populated/mock data. Every table starts empty; all data enters through the real forms, the excel importer, or JD/resume upload during testing and the demo itself.

---

## 1. Roles & access levels (User management)

Your flow says "User created (with access level)" but doesn't define the levels. Suggested starting set — adjust names to match your institution's titles:

| Role | Typical user | Can do |
|---|---|---|
| Super admin | Placement head / TPO | Everything, including final approval of companies & offers, user management, all reports |
| Placement coordinator | Placement office staff | Add companies, add offers, upload excels, manage drives — submissions go to pending approval |
| Department coordinator | Faculty coordinator per dept | Same as above but scoped to their department's students only |
| Data entry / executive | Interns, junior staff | Add/edit students & companies, no delete, no approval rights |
| Report viewer | Director, HODs, management | Read-only access to dashboard & reports, no edit rights |

Confirmed: no student login. Students are registered and managed entirely by staff (manual entry or excel upload) — there's no student-facing role in this system.

**Simplified for the hackathon build:** `role` and `department_scope` are still stored on every user and shown as badges in the UI — the interface still *looks and behaves* like a permissioned system — but they're not enforced by the database (RLS is off, Section 0), and there's no server-side maker-checker lock stopping one person from both submitting and approving the same record. The approval workflow itself (Section 4) still requires an explicit click in the UI; it just isn't backed by a hard permission check yet.

---

## 2. Sidebar / modules

Your list — Dashboard, Students, Companies, User Management, Reports — plus what I'd suggest adding once the core is stable:

- **Placement dashboard** — live counters (students placed/unplaced, active drives, pending approvals), quick links
- **Students**
- **Companies** *(offers/drives can live as a tab inside Companies, per your flow, or as a separate "Drives" module if the list gets long — your call)*
- **User management**
- **Reports**
- *(suggested)* **Notifications** — approval requests, drive reminders, deadline alerts
- *(suggested)* **Audit log** — who did what, when (important for an official record like placements)
- *(suggested)* **Settings** — eligibility rule defaults, email templates, excel templates

---

## 3. Data model

### 3.1 Student

| Field | Type | Notes |
|---|---|---|
| `student_id` | PK | internal, auto |
| `roll_number` | string, unique | |
| `name` | string | |
| `department` | enum/FK | |
| `gender` | enum | |
| `residency` | enum: day_scholar / hosteller | your "Days scholler or holstel" |
| `sslc_percentage` | decimal | |
| `hsc_percentage` | decimal | |
| `ug_cgpa` | decimal | primary UG metric |
| `ug_percentage` | decimal, nullable | only populated for departments/institutions that grade UG by percentage instead of CGPA |
| `pg_cgpa` | decimal, nullable | |
| `pg_status` | enum: not_applicable / pursuing / completed | needed since PG grad year is conditional |
| `ug_graduation_year` | int | |
| `pg_graduation_year` | int, nullable | |
| `github_url`, `linkedin_url`, `portfolio_url` | string | |
| `resume_link` / `resume_file` | string / file ref | see architecture note below |
| `video_intro_link` | string | |
| `photo_link` / `photo_file` | string / file ref | |
| `email` | string, unique | |
| `mobile_number` | string | |
| *(suggested)* `resume_extracted_text` | text | feeds feature 2/3 |
| *(suggested)* `skills_tags` | array | derived from resume, used for matching & filtering |
| *(suggested)* `backlogs_count` | int | common eligibility cutoff for drives |
| *(suggested)* `placement_status` | enum: unplaced / placed / opted_out | drives whether they still show up in new drive lists |
| `created_by`, `created_at`, `updated_at` | audit | |

### 3.2 Company

| Field | Type | Notes |
|---|---|---|
| `company_id` | PK | |
| `name`, `address`, `website_url` | string | |
| `contact_person_name`, `contact_person_mobile` | string | your "Contact, name, mobile" |
| `map_link` | string | |
| `employee_count` | int | |
| `star_rating` | int (1–5) or tier enum | your "star level" — decide if this is a manual rating or a tier label like Dream/Super-Dream, common in campus placements |
| *(suggested)* `industry_domain` | string | useful for filtering/reports |
| *(suggested)* `hr_emails` | array | more than one contact is common |
| *(suggested)* `status` | enum: active / blacklisted | |
| `approval_status` | enum: pending / approved / rejected | |
| `approved_by`, `approved_at`, `rejection_reason` | | |
| `created_by`, `created_at` | audit | |

### 3.3 Offer / Drive

This is the entity behind "Add offer from company."

| Field | Type | Notes |
|---|---|---|
| `offer_id` | PK | |
| `company_id` | FK | |
| `jd_text` | text | extracted from uploaded doc — feature 4 |
| `jd_files` | file refs | original upload, kept alongside extracted text |
| `eligible_departments` | array | |
| `ctc_lpa` | decimal | total cost to company, per annum, in lakhs |
| `base_lpa` | decimal | fixed/base component, per annum, in lakhs |
| *(suggested)* `eligibility_criteria` | json: min_cgpa, max_backlogs, min_10th_12th_pct | so student selection can auto-filter instead of manual |
| `status` | enum: cold / warm / hot / drive_completed | see suggestion below on splitting this |
| *(suggested)* `drive_date`, `job_location`, `drive_mode` (on-campus/virtual/pooled) | | |
| *(suggested)* `rounds` | json | e.g. resume shortlist → test → interview → HR |
| `approval_status`, `approved_by`, `approved_at`, `rejection_reason` | | mirrors company approval |
| `created_by`, `created_at` | audit | |

**Suggestion:** `cold/warm/hot` is a *lead temperature* (how likely this company is to actually run a drive), while `drive_completed` is a *lifecycle stage* (the drive happened). Those are two different axes and conflating them into one status field means you lose one when the other changes — e.g. a "hot" company whose drive just completed has nowhere to go. Consider splitting into `lead_temperature` (cold/warm/hot, relevant pre-drive) and `drive_status` (planning/scheduled/ongoing/completed/cancelled).

### 3.4 Drive application (new entity — needed for your "generate form shared to students" step)

This is the join between a student and an offer, and it's where feature 2 (resume-to-JD match) attaches.

| Field | Type | Notes |
|---|---|---|
| `application_id` | PK | |
| `offer_id`, `student_id` | FK | |
| `applied_at` | timestamp | |
| *(suggested)* `match_score` | decimal 0–100 | from resume-JD comparison |
| *(suggested)* `match_explanation` | text | short rationale, matched/missing skills |
| `round_wise_status` | json | e.g. `{resume_shortlist: "passed", technical: "pending"}` |
| `final_status` | enum: applied / shortlisted / interviewed / selected / rejected / no_show | |
| `offer_accepted` | bool | |

**Single-offer policy:** kept configurable rather than hardcoded, since this may change. Add an `enforce_single_offer_policy` toggle (e.g. in Settings) — when on, a student with `offer_accepted = true` on any application is auto-excluded from new eligible-student lists; when off, students can apply/accept across multiple drives. Switching the toggle shouldn't retroactively edit past applications, just change what's allowed going forward.

### 3.5 User

Using Supabase Auth rather than a custom password column — a `profiles` table extends `auth.users`:

`id` (uuid, FK → `auth.users.id`), `name`, `email`, `role`, `department_scope`, `status`, `last_login`, `created_by`.

With RLS off, any authenticated client can currently read/write any profile — fine for a small, trusted staff list during the hackathon; would need RLS re-enabled (e.g. `id = auth.uid()` for self-edits, role-gated for admin actions) before this handles real staff accounts long-term.

---

## 4. Approval workflow — kept active, not auto-approved

State machine for both **Company** and **Offer** (identical pattern, reused):

`draft → pending_approval → approved` or `rejected (with reason) → back to draft for edit → resubmit`

This stays a required, explicit action in the UI — nothing flips to `approved` automatically, regardless of who submitted it. With RLS off, the gate isn't a database permission — it's a straightforward application rule: only records where `approval_status = 'approved'` are ever queried into the "select students & generate application form" step. An admin still has to click Approve.

(Notification triggers on submit/approve/reject were cut from scope earlier in this doc — the status change itself, visible in the UI, is the only signal for now.)

---

## 5. Feature specs (your list, expanded)

### 1 & 2. Excel upload (students & companies) — streamlined
- Provide a downloadable template matching the field list above.
- Parse client-side with `xlsx` or `papaparse` — no server round-trip needed to read the file.
- Validate per row inline (required fields present, `roll_number`/`email` uniqueness, department matches your whitelist) and insert valid rows directly into the Supabase tables.
- Show a simple pass/fail count after import (e.g. "42 inserted, 3 skipped — missing email") rather than a full pre-commit diff or a rollback-capable transaction log — rows that fail validation are just skipped, not staged for review. Good enough for a live demo; a real dry-run/rollback engine is worth adding before this handles a real cohort's data unsupervised.

### 3. Resume extraction → 4. JD extraction
- Parse uploaded PDF into plain text on upload (store both the original file and the extracted text — don't extract on-the-fly every time you need it).
- **Resolved** (Section 8): resumes and photos are hosted directly in **Supabase Storage** — that direct file access is what makes server-side text extraction straightforward. Video intros stay as external links and are never parsed.
- Pull the relevant details out of that text (skills, education, experience) and feed them straight into the single-pass matching prompt below, rather than maintaining a separate structured `skills_tags` pipeline.

### 5. Resume-to-JD matching — single-pass LLM, no embeddings pipeline
Simplified for the hackathon: no `pgvector`, no separate embedding step. One direct call per student per offer — send the extracted resume text and JD text to the model in a single prompt and ask for structured JSON back:

```json
{
  "match_score": 0-100,
  "match_explanation": "one or two sentences",
  "matched_skills": ["..."],
  "missing_skills": ["..."]
}
```

That JSON maps straight onto `match_score` and `match_explanation` on `drive_application` (Section 3.4). Trade-off worth knowing: this is one model call per student, so it scales worse than an embeddings pre-filter once a drive has hundreds of applicants — fine for a hackathon-sized cohort, worth revisiting (batching, or a cheap pre-filter) if a real drive's applicant pool gets large.

Still **decision support, not an auto-filter** — a coordinator sees and approves the final shortlist; nothing gets silently excluded by score.

### 6 & 7. Approval from higher-level users
Covered in Section 4. One addition: consider whether edits to an *already-approved* offer (say, CTC changes) should re-trigger approval, or only new submissions do. Silent edits to an approved offer are a common way these systems get abused.

---

## 6. Reports (fleshing out the sidebar item)

- Department-wise and gender-wise placement %
- Day-scholar vs. hosteller placement comparison
- Highest / average / median CTC, overall and per department
- Company-wise funnel: applied → shortlisted → interviewed → selected
- Unplaced students list (for targeted follow-up)
- Drive calendar / upcoming drives
- Approval turnaround time (how long companies/offers sit pending — useful for process health)
- Export to Excel/PDF for all of the above

---

## 7. Suggestions (your "feature 7")

**Worth having early:**
- Eligibility auto-filter on `min_cgpa` / `max_backlogs` / `min_10th_12th_pct` so "select students by department" doesn't mean manually checking each one
- One-offer policy engine — many campuses cap students to one offer, or restrict "dream tier" access after a student is already placed; decide if/when you need this
- Duplicate-offer/duplicate-company detection on upload

**Reasonable to defer:**
- Company relationship history (past visits, hiring trend, average CTC over years) — valuable once you have 2+ years of data
- Feedback capture from students/companies post-drive
- Bulk email/SMS to shortlisted students
- Data retention/consent policy for resumes & videos, given they're personal data tied to identifiable students

---

## 8. Decisions & open questions

Resolved:

1. **CTC vs LPA** — split into `ctc_lpa` (total cost to company) and `base_lpa` (fixed component). Done in Section 3.3.
2. **UG "%"** — `ug_cgpa` is primary; added an optional `ug_percentage` field for departments/institutions that grade by percentage instead. Done in Section 3.1.
3. **Student login** — confirmed there is none. Students are registered/managed entirely by staff; no student-facing role. Done in Section 1.
4. **One offer per student** — kept configurable via an `enforce_single_offer_policy` toggle rather than hardcoded either way, so it can change later without a schema rework. Done in Section 3.4.
5. **Links vs. hosted files** — resumes and photos are hosted directly in **Supabase Storage** (needed for server-side extraction); video intros stay as external links (YouTube/Drive) to conserve storage and egress. Done in Section 0 and Section 5.

No items currently open.

---

## 9. Implementation roadmap (hackathon build)

Rough build order — each phase produces something demoable, so the project is never in a broken state for long:

1. **Scaffold & schema** — Vite + React + TS project, shadcn/ui installed with the Zinc theme; Supabase project created, all five tables (`students`, `companies`, `offers`, `drive_applications`, `profiles`) created with RLS disabled, storage buckets created for resumes/photos/JD files.
2. **Core CRUD — Students & Companies** — forms and list/table views for both, using shadcn/ui `Table`, `Form`, `Dialog` components. Role badges shown per Section 1, not yet enforced.
3. **Approval workflow UI** — pending/approved/rejected states on Companies and Offers, with an explicit Approve/Reject action and a reason field on reject (Section 4).
4. **Excel bulk import** — client-side `xlsx`/`papaparse` importer for Students and Companies, per the streamlined flow in Section 5.
5. **File uploads** — resume PDF and photo upload to Supabase Storage on the student form; JD file upload on the offer form, with text extraction running server-side (Supabase Edge Function) on upload.
6. **Resume-to-JD matching** — single-pass LLM call wired into the "select eligible students" screen for an approved offer, surfacing `match_score`/`match_explanation` per student so a coordinator can sort and shortlist.
7. **Reports & dashboard** — the metrics in Section 6, built off the same tables now that real data exists (zero mock data means this phase is where the dashboard actually starts looking populated).
8. **Deploy** — push to Cloudflare Pages, point at the live Supabase project, walk the full cycle end-to-end (company → offer → approval → student selection → drive → completed) before the demo.

---

*This is now the working spec for the hackathon build. Production hardening (RLS policies, maker-checker locks, import rollback, notification triggers) is intentionally deferred — Section 0 flags where.*
