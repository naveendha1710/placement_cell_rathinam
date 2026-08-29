-- ====================================================================
-- RATHINAM PLACEMENT CELL — DUMMY SEED DATA SQL SCRIPT (CORRECTED HEX UUIDs)
-- ====================================================================

-- 1. INSERT DUMMY STUDENTS (3-Digit Registration Numbers: 101, 102, 103, 104, 105)
INSERT INTO students (
  student_id, roll_number, name, department, gender, residency, 
  sslc_percentage, hsc_percentage, ug_cgpa, ug_percentage, pg_status, 
  ug_graduation_year, email, mobile_number, backlogs_count, placement_status
) VALUES
(
  'a1111111-1111-1111-1111-111111111101', '101', 'Aarav Sharma', 'Computer Science', 'Male', 'day_scholar',
  92.5, 89.0, 8.75, 87.5, 'not_applicable', 2026, 'aarav.101@rathinam.edu.in', '+91 9876543101', 0, 'unplaced'
),
(
  'a1111111-1111-1111-1111-111111111102', '102', 'Ananya Patel', 'Information Technology', 'Female', 'hosteller',
  94.0, 91.5, 9.10, 91.0, 'not_applicable', 2026, 'ananya.102@rathinam.edu.in', '+91 9876543102', 0, 'unplaced'
),
(
  'a1111111-1111-1111-1111-111111111103', '103', 'Rohan Verma', 'Electronics & Communication', 'Male', 'day_scholar',
  85.0, 82.0, 7.80, 78.0, 'not_applicable', 2026, 'rohan.103@rathinam.edu.in', '+91 9876543103', 1, 'unplaced'
),
(
  'a1111111-1111-1111-1111-111111111104', '104', 'Kavya Nair', 'Computer Science', 'Female', 'hosteller',
  96.5, 95.0, 9.45, 94.5, 'not_applicable', 2026, 'kavya.104@rathinam.edu.in', '+91 9876543104', 0, 'placed'
),
(
  'a1111111-1111-1111-1111-111111111105', '105', 'Vikram Das', 'Mechanical Engineering', 'Male', 'day_scholar',
  78.0, 76.5, 7.20, 72.0, 'not_applicable', 2026, 'vikram.105@rathinam.edu.in', '+91 9876543105', 0, 'unplaced'
)
ON CONFLICT (roll_number) DO UPDATE SET 
  name = EXCLUDED.name,
  email = EXCLUDED.email;


-- 2. INSERT DUMMY APPROVED COMPANIES
INSERT INTO companies (
  company_id, name, industry_domain, website_url, address, employee_count, 
  star_rating, status, approval_status, contact_person_name, contact_person_mobile
) VALUES
(
  'c1111111-1111-1111-1111-111111111101', 'Zoho Corporation', 'SaaS & Enterprise Software', 
  'https://zoho.com', 'Estancia IT Park, Guduvanchery, Chennai', 12000, 
  5, 'active', 'approved', 'Suresh Kumar', '+91 9876500001'
),
(
  'c1111111-1111-1111-1111-111111111102', 'TCS Digital', 'IT Services & Consulting', 
  'https://tcs.com', 'Siruseri IT Park, Chennai', 500000, 
  4, 'active', 'approved', 'Priya Raman', '+91 9876500002'
),
(
  'c1111111-1111-1111-1111-111111111103', 'Freshworks', 'CRM & Customer Support Software', 
  'https://freshworks.com', 'Global Infocity, Perungudi, Chennai', 4500, 
  5, 'active', 'approved', 'Rajesh Kannan', '+91 9876500003'
)
ON CONFLICT (company_id) DO UPDATE SET 
  approval_status = 'approved';


-- 3. INSERT DUMMY HR CONTACTS (Using valid hex UUID prefix 'b')
INSERT INTO company_hr_contacts (
  contact_id, company_id, name, email, mobile_number, designation, is_primary
) VALUES
(
  'b1111111-1111-1111-1111-111111111101', 'c1111111-1111-1111-1111-111111111101', 
  'Suresh Kumar', 'suresh@zoho.com', '+91 9876500001', 'Talent Acquisition Lead', true
),
(
  'b1111111-1111-1111-1111-111111111102', 'c1111111-1111-1111-1111-111111111102', 
  'Priya Raman', 'priya.r@tcs.com', '+91 9876500002', 'Campus Hiring Manager', true
),
(
  'b1111111-1111-1111-1111-111111111103', 'c1111111-1111-1111-1111-111111111103', 
  'Rajesh Kannan', 'rajesh.k@freshworks.com', '+91 9876500003', 'HR Business Partner', true
)
ON CONFLICT (contact_id) DO NOTHING;


-- 4. INSERT DUMMY APPROVED JOB OFFERS (Using valid hex UUID prefix 'd')
INSERT INTO offers (
  offer_id, company_id, jd_text, eligible_departments, ctc_lpa, base_lpa, 
  eligibility_criteria, drive_date, job_location, drive_mode, status, approval_status
) VALUES
(
  'd1111111-1111-1111-1111-111111111101', 'c1111111-1111-1111-1111-111111111101',
  'Software Development Engineer (SDE-1) Role.\nKey Skills: Java, Python, React, Data Structures & Algorithms.',
  ARRAY['Computer Science', 'Information Technology', 'Electronics & Communication'],
  8.5, 7.5, '{"min_cgpa": 7.5, "max_backlogs": 0, "min_10th_pct": 75, "min_12th_pct": 75}'::jsonb,
  CURRENT_DATE + INTERVAL '7 days', 'Chennai / Tenkasi', 'on_campus', 'scheduled', 'approved'
),
(
  'd1111111-1111-1111-1111-111111111102', 'c1111111-1111-1111-1111-111111111102',
  'Digital Software Engineer Role.\nKey Skills: Full Stack, Cloud, Microservices, SQL.',
  ARRAY['Computer Science', 'Information Technology', 'Electronics & Communication', 'Mechanical Engineering'],
  7.0, 6.2, '{"min_cgpa": 7.0, "max_backlogs": 1, "min_10th_pct": 70, "min_12th_pct": 70}'::jsonb,
  CURRENT_DATE + INTERVAL '12 days', 'Chennai / Bangalore', 'virtual', 'scheduled', 'approved'
),
(
  'd1111111-1111-1111-1111-111111111103', 'c1111111-1111-1111-1111-111111111103',
  'Product Development Engineer Role.\nKey Skills: JavaScript, Node.js, Systems Architecture.',
  ARRAY['Computer Science', 'Information Technology'],
  10.0, 8.5, '{"min_cgpa": 8.0, "max_backlogs": 0, "min_10th_pct": 80, "min_12th_pct": 80}'::jsonb,
  CURRENT_DATE + INTERVAL '15 days', 'Chennai / Hybrid', 'on_campus', 'scheduled', 'approved'
)
ON CONFLICT (offer_id) DO UPDATE SET 
  approval_status = 'approved';


-- 5. INSERT DUMMY DRIVE APPLICATIONS & MATCH SCORES (Using valid hex UUID prefix 'e')
INSERT INTO drive_applications (
  application_id, offer_id, student_id, applied_at, match_score, matched_model, matched_at, final_status, offer_accepted
) VALUES
(
  'e1111111-1111-1111-1111-111111111101', 'd1111111-1111-1111-1111-111111111101',
  'a1111111-1111-1111-1111-111111111101', now(), 85, 'antigravity-llm-v1', now(), 'applied', false
),
(
  'e1111111-1111-1111-1111-111111111102', 'd1111111-1111-1111-1111-111111111101',
  'a1111111-1111-1111-1111-111111111102', now(), 92, 'antigravity-llm-v1', now(), 'shortlisted', false
)
ON CONFLICT (offer_id, student_id) DO NOTHING;


-- 6. INSERT DUMMY DOCUMENT EXTRACTIONS (Using valid hex UUID prefix 'f')
INSERT INTO document_extractions (
  extraction_id, entity_type, entity_id, extracted_text, status, extracted_at
) VALUES
(
  'f1111111-1111-1111-1111-111111111101', 'student_resume',
  'a1111111-1111-1111-1111-111111111101',
  'Candidate Aarav Sharma, Computer Science, CGPA: 8.75. Experienced in Java, React, Python, Data Structures & SQL.',
  'done', now()
),
(
  'f1111111-1111-1111-1111-111111111102', 'student_resume',
  'a1111111-1111-1111-1111-111111111102',
  'Candidate Ananya Patel, Information Technology, CGPA: 9.10. Skilled in Full Stack Web Development, Node.js, Cloud & Systems Architecture.',
  'done', now()
)
ON CONFLICT (entity_type, entity_id) DO NOTHING;
