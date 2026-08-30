export type UserRole = 
  | 'super_admin'
  | 'placement_coordinator'
  | 'dept_coordinator'
  | 'data_entry'
  | 'report_viewer';

export type UserStatus = 'active' | 'disabled';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department_scope: string | null;
  status: UserStatus;
  created_by?: string | null;
  last_login?: string | null;
  created_at: string;
}

export type PlacementStatus = 'yet_to_be_placed' | 'placed' | 'opted_out';
export type PGStatus = 'not_applicable' | 'pursuing' | 'completed';
export type ResidencyType = 'day_scholar' | 'hosteller';
export type StudentBatch = 'T' | 'O' | 'S' | 'A' | 'X';

export interface Student {
  student_id: string;
  roll_number: string;
  name: string;
  department: string;
  gender?: string | null;
  residency?: ResidencyType | null;
  batch?: StudentBatch | null;
  source?: string | null;
  sslc_percentage?: number | null;
  hsc_percentage?: number | null;
  ug_cgpa?: number | null;
  ug_percentage?: number | null;
  pg_cgpa?: number | null;
  pg_percentage?: number | null;
  pg_status?: PGStatus;
  ug_graduation_year?: number | null;
  pg_graduation_year?: number | null;
  graduation_date?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
  resume_file?: string | null;
  video_intro_link?: string | null;
  photo_file?: string | null;
  email: string;
  personal_email?: string | null;
  mobile_number?: string | null;
  backlogs_count: number;
  placement_status: PlacementStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type ApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';
export type CompanyStatus = 'active' | 'blacklisted' | 'paused' | 'inactive';

export interface Company {
  company_id: string;
  name: string;
  address?: string | null;
  website_url?: string | null;
  contact_person_name?: string | null;
  contact_person_mobile?: string | null;
  map_link?: string | null;
  employee_count?: number | null;
  star_rating?: number | null;
  industry_domain?: string | null;
  status: CompanyStatus;
  approval_status: ApprovalStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface CompanyHrContact {
  contact_id: string;
  company_id: string;
  name: string;
  email?: string | null;
  mobile_number?: string | null;
  designation?: string | null;
  is_primary: boolean;
  created_at: string;
}

export type DriveMode = 'on_campus' | 'virtual' | 'pooled';
export type OfferStatus = 'cold' | 'warm' | 'hot' | 'drive_completed' | 'drive_closed';

export interface EligibilityCriteria {
  min_cgpa?: number;
  max_backlogs?: number;
  min_10th_pct?: number;
  min_12th_pct?: number;
  allowed_batches?: StudentBatch[];
}

export interface JobRole {
  role_id: string;
  offer_id?: string;
  role_title: string;
  ctc_lpa?: number | null;
  base_lpa?: number | null;
  eligible_departments?: string[] | null;
  eligibility_criteria?: EligibilityCriteria | null;
  jd_text?: string | null;
  jd_files?: string[] | null;
  vacancies?: number | null;
  extraction_id?: string | null;
}

export interface StageHistoryEntry {
  id: string;
  offer_id?: string;
  stage: OfferStatus;
  timestamp: string;
  updated_by_id: string;
  updated_by_name?: string;
  notes?: string | null;
}

export interface Offer {
  offer_id: string;
  company_id: string;
  offer_status: OfferStatus; // 'cold' | 'warm' | 'hot' | 'drive_completed'
  approval_status: ApprovalStatus;
  
  // Cold & Warm Stage Tracking
  remarks?: string | null;
  tentative_drive_date?: string | null;
  contact_person_name?: string | null;
  expected_openings?: number | null;
  
  // Hot Stage Details
  drive_date?: string | null;
  job_location?: string | null;
  drive_mode?: DriveMode | null;
  
  // Multi-Role Support & Audit Trail History
  job_roles?: JobRole[] | null;
  stage_history?: StageHistoryEntry[] | null;
  
  // Backward-compatibility fallbacks
  jd_text?: string | null;
  jd_files?: string[] | null;
  eligible_departments?: string[] | null;
  ctc_lpa?: number | null;
  base_lpa?: number | null;
  eligibility_criteria?: EligibilityCriteria | null;

  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  created_by?: string | null;
  creator_profile?: Profile | null;
  created_at: string;
  updated_at?: string;

  // Joined metadata
  company?: Company;
}

export type ApplicationFinalStatus = 
  | 'applied' 
  | 'shortlisted' 
  | 'interviewed' 
  | 'selected' 
  | 'rejected' 
  | 'no_show';

export interface DriveApplication {
  application_id: string;
  offer_id: string;
  student_id: string;
  applied_role_id?: string | null;
  applied_role_title?: string | null;
  applied_at: string;
  match_score?: number | null;
  match_explanation?: string | null;
  matched_model?: string | null;
  matched_at?: string | null;
  round_wise_status?: Record<string, string> | null;
  final_status: ApplicationFinalStatus;
  offer_accepted: boolean;

  // Joined metadata
  student?: Student;
  offer?: Offer;
}

export interface DocumentExtraction {
  extraction_id: string;
  entity_type: 'student_resume' | 'job_description';
  entity_id: string;
  extracted_text: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  extracted_at: string;
}
