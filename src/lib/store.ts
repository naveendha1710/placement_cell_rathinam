import { supabase, isMockMode } from './supabase';
import { 
  Profile, Student, Company, CompanyHrContact, Offer, DriveApplication, 
  ApprovalStatus, ApplicationFinalStatus 
} from '../types/database';
import { 
  INITIAL_PROFILES, INITIAL_STUDENTS, INITIAL_COMPANIES, 
  INITIAL_HR_CONTACTS, INITIAL_OFFERS, INITIAL_APPLICATIONS 
} from './mockSeed';

const STORAGE_KEYS = {
  PROFILES: 'pp_profiles_v1',
  STUDENTS: 'pp_students_v1',
  COMPANIES: 'pp_companies_v1',
  HR_CONTACTS: 'pp_hr_contacts_v1',
  OFFERS: 'pp_offers_v1',
  APPLICATIONS: 'pp_applications_v1',
};

// Helper for local storage persistence
function getStored<T>(key: string, defaultData: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (parsed.length > 0) return parsed as T;
      } else if (parsed && typeof parsed === 'object') {
        return parsed as T;
      }
    }
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e);
  }
  localStorage.setItem(key, JSON.stringify(defaultData));
  return defaultData;
}

function setStored<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error setting ${key} in localStorage`, e);
  }
}

export const DataStore = {
  // PROFILES
  async getProfiles(): Promise<Profile[]> {
    if (!isMockMode) {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && data) return data as Profile[];
    }
    return getStored<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
  },

  async saveProfile(profile: Omit<Profile, 'created_at'> & { created_at?: string }): Promise<Profile> {
    const newProfile: Profile = {
      ...profile,
      created_at: profile.created_at || new Date().toISOString(),
    };

    if (!isMockMode) {
      const { data, error } = await supabase.from('profiles').upsert(newProfile).select().single();
      if (!error && data) return data as Profile;
    }

    const profiles = getStored<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    const existingIndex = profiles.findIndex(p => p.id === newProfile.id);
    if (existingIndex >= 0) {
      profiles[existingIndex] = newProfile;
    } else {
      profiles.push(newProfile);
    }
    setStored(STORAGE_KEYS.PROFILES, profiles);
    return newProfile;
  },

  // STUDENTS
  async getStudents(): Promise<Student[]> {
    if (!isMockMode) {
      const { data, error } = await supabase.from('students').select('*').order('created_at', { ascending: false });
      if (!error && data) return data as Student[];
    }
    return getStored<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  },

  async saveStudent(studentData: Partial<Student> & { name: string; roll_number: string; email: string; department: string }): Promise<Student> {
    const now = new Date().toISOString();
    const student_id = studentData.student_id || crypto.randomUUID();
    const student: Student = {
      student_id,
      roll_number: studentData.roll_number,
      name: studentData.name,
      department: studentData.department,
      gender: studentData.gender || null,
      residency: studentData.residency || null,
      sslc_percentage: studentData.sslc_percentage ?? null,
      hsc_percentage: studentData.hsc_percentage ?? null,
      ug_cgpa: studentData.ug_cgpa ?? null,
      ug_percentage: studentData.ug_percentage ?? null,
      pg_cgpa: studentData.pg_cgpa ?? null,
      pg_status: studentData.pg_status || 'not_applicable',
      ug_graduation_year: studentData.ug_graduation_year ?? null,
      pg_graduation_year: studentData.pg_graduation_year ?? null,
      github_url: studentData.github_url || null,
      linkedin_url: studentData.linkedin_url || null,
      portfolio_url: studentData.portfolio_url || null,
      resume_file: studentData.resume_file || null,
      video_intro_link: studentData.video_intro_link || null,
      photo_file: studentData.photo_file || null,
      email: studentData.email,
      mobile_number: studentData.mobile_number || null,
      backlogs_count: studentData.backlogs_count || 0,
      placement_status: studentData.placement_status || 'unplaced',
      created_by: studentData.created_by || null,
      created_at: studentData.created_at || now,
      updated_at: now,
    };

    if (!isMockMode) {
      const { data, error } = await supabase.from('students').upsert(student).select().single();
      if (!error && data) return data as Student;
    }

    const students = getStored<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const idx = students.findIndex(s => s.student_id === student.student_id);
    if (idx >= 0) {
      students[idx] = student;
    } else {
      students.unshift(student);
    }
    setStored(STORAGE_KEYS.STUDENTS, students);
    return student;
  },

  async deleteStudent(student_id: string): Promise<boolean> {
    if (!isMockMode) {
      const { error } = await supabase.from('students').delete().eq('student_id', student_id);
      if (!error) return true;
    }
    const students = getStored<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const filtered = students.filter(s => s.student_id !== student_id);
    setStored(STORAGE_KEYS.STUDENTS, filtered);
    return true;
  },

  async bulkInsertStudents(newStudents: Array<Omit<Student, 'student_id' | 'created_at' | 'updated_at'>>): Promise<{ inserted: number; skipped: number; reasons: string[] }> {
    const existing = await this.getStudents();
    const existingRolls = new Set(existing.map(s => s.roll_number.toLowerCase().trim()));
    const existingEmails = new Set(existing.map(s => s.email.toLowerCase().trim()));

    const toInsert: Student[] = [];
    const reasons: string[] = [];
    let skipped = 0;

    for (const item of newStudents) {
      const roll = item.roll_number?.toLowerCase().trim();
      const email = item.email?.toLowerCase().trim();

      if (!roll || !item.name || !item.department || !email) {
        skipped++;
        reasons.push(`Row missing required fields (Roll: ${item.roll_number || 'N/A'}, Name: ${item.name || 'N/A'})`);
        continue;
      }

      if (existingRolls.has(roll)) {
        skipped++;
        reasons.push(`Duplicate roll number: ${item.roll_number}`);
        continue;
      }

      if (existingEmails.has(email)) {
        skipped++;
        reasons.push(`Duplicate email address: ${item.email}`);
        continue;
      }

      existingRolls.add(roll);
      existingEmails.add(email);

      const now = new Date().toISOString();
      toInsert.push({
        ...item,
        student_id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
      });
    }

    if (toInsert.length > 0) {
      if (!isMockMode) {
        await supabase.from('students').insert(toInsert);
      } else {
        const current = getStored<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
        setStored(STORAGE_KEYS.STUDENTS, [...toInsert, ...current]);
      }
    }

    return { inserted: toInsert.length, skipped, reasons };
  },

  // COMPANIES
  async getCompanies(): Promise<Company[]> {
    if (!isMockMode) {
      const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
      if (!error && data) return data as Company[];
    }
    return getStored<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
  },

  async saveCompany(companyData: Partial<Company> & { name: string }): Promise<Company> {
    const now = new Date().toISOString();
    const company_id = companyData.company_id || crypto.randomUUID();
    const company: Company = {
      company_id,
      name: companyData.name,
      address: companyData.address || null,
      website_url: companyData.website_url || null,
      contact_person_name: companyData.contact_person_name || null,
      contact_person_mobile: companyData.contact_person_mobile || null,
      map_link: companyData.map_link || null,
      employee_count: companyData.employee_count ?? null,
      star_rating: companyData.star_rating ?? 3,
      industry_domain: companyData.industry_domain || null,
      status: companyData.status || 'active',
      approval_status: companyData.approval_status || 'draft',
      approved_by: companyData.approved_by || null,
      approved_at: companyData.approved_at || null,
      rejection_reason: companyData.rejection_reason || null,
      created_by: companyData.created_by || null,
      created_at: companyData.created_at || now,
    };

    if (!isMockMode) {
      const { data, error } = await supabase.from('companies').upsert(company).select().single();
      if (!error && data) return data as Company;
    }

    const companies = getStored<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
    const idx = companies.findIndex(c => c.company_id === company.company_id);
    if (idx >= 0) {
      companies[idx] = company;
    } else {
      companies.unshift(company);
    }
    setStored(STORAGE_KEYS.COMPANIES, companies);
    return company;
  },

  async updateCompanyApproval(company_id: string, status: ApprovalStatus, approverId?: string, reason?: string): Promise<Company | null> {
    const now = new Date().toISOString();
    const isApproved = status === 'approved';
    const isRejected = status === 'rejected';

    const payload: any = {
      approval_status: status,
      approved_at: isApproved ? now : null,
      rejection_reason: isRejected ? (reason || 'Not specified') : null,
    };

    if (!isMockMode) {
      const { data, error } = await supabase
        .from('companies')
        .update(payload)
        .eq('company_id', company_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating company approval in Supabase:', error);
      } else if (data) {
        const companies = getStored<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
        const idx = companies.findIndex(c => c.company_id === company_id);
        if (idx >= 0) companies[idx] = data as Company;
        setStored(STORAGE_KEYS.COMPANIES, companies);
        return data as Company;
      }
    }

    const companies = getStored<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
    const target = companies.find(c => c.company_id === company_id);
    if (!target) return null;
    target.approval_status = status;
    target.approved_at = isApproved ? now : null;
    target.rejection_reason = isRejected ? (reason || 'Not specified') : null;
    setStored(STORAGE_KEYS.COMPANIES, companies);
    return target;
  },

  async deleteCompany(company_id: string): Promise<boolean> {
    if (!isMockMode) {
      const { error } = await supabase.from('companies').delete().eq('company_id', company_id);
      if (!error) return true;
    }
    const companies = getStored<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
    setStored(STORAGE_KEYS.COMPANIES, companies.filter(c => c.company_id !== company_id));
    return true;
  },

  async bulkInsertCompanies(newCompanies: Array<Omit<Company, 'company_id' | 'created_at'>>): Promise<{ inserted: number; skipped: number; reasons: string[] }> {
    const toInsert: Company[] = [];
    const reasons: string[] = [];
    let skipped = 0;

    for (const item of newCompanies) {
      if (!item.name) {
        skipped++;
        reasons.push('Row missing company name');
        continue;
      }

      toInsert.push({
        ...item,
        company_id: crypto.randomUUID(),
        status: item.status || 'active',
        approval_status: 'draft', // Excel imported companies land as draft per spec
        created_at: new Date().toISOString(),
      });
    }

    if (toInsert.length > 0) {
      if (!isMockMode) {
        await supabase.from('companies').insert(toInsert);
      } else {
        const current = getStored<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
        setStored(STORAGE_KEYS.COMPANIES, [...toInsert, ...current]);
      }
    }

    return { inserted: toInsert.length, skipped, reasons };
  },

  // HR CONTACTS
  async getHrContacts(company_id?: string): Promise<CompanyHrContact[]> {
    let contacts: CompanyHrContact[] = [];
    if (!isMockMode) {
      let query = supabase.from('company_hr_contacts').select('*');
      if (company_id) query = query.eq('company_id', company_id);
      const { data, error } = await query;
      if (!error && data) contacts = data as CompanyHrContact[];
    } else {
      const all = getStored<CompanyHrContact[]>(STORAGE_KEYS.HR_CONTACTS, INITIAL_HR_CONTACTS);
      contacts = company_id ? all.filter(c => c.company_id === company_id) : all;
    }
    return contacts;
  },

  async saveHrContact(contactData: Partial<CompanyHrContact> & { company_id: string; name: string }): Promise<CompanyHrContact> {
    const now = new Date().toISOString();
    const contact_id = contactData.contact_id || crypto.randomUUID();
    const contact: CompanyHrContact = {
      contact_id,
      company_id: contactData.company_id,
      name: contactData.name,
      email: contactData.email || null,
      mobile_number: contactData.mobile_number || null,
      designation: contactData.designation || null,
      is_primary: contactData.is_primary || false,
      created_at: contactData.created_at || now,
    };

    const contacts = getStored<CompanyHrContact[]>(STORAGE_KEYS.HR_CONTACTS, INITIAL_HR_CONTACTS);

    // If marked primary, ensure other contacts for the same company lose primary status
    if (contact.is_primary) {
      contacts.forEach(c => {
        if (c.company_id === contact.company_id) {
          c.is_primary = false;
        }
      });
      // Sync company quick view fields
      const companies = await this.getCompanies();
      const comp = companies.find(c => c.company_id === contact.company_id);
      if (comp) {
        comp.contact_person_name = contact.name;
        comp.contact_person_mobile = contact.mobile_number || null;
        await this.saveCompany(comp);
      }
    }

    const idx = contacts.findIndex(c => c.contact_id === contact.contact_id);
    if (idx >= 0) {
      contacts[idx] = contact;
    } else {
      contacts.push(contact);
    }

    if (!isMockMode) {
      await supabase.from('company_hr_contacts').upsert(contact);
    } else {
      setStored(STORAGE_KEYS.HR_CONTACTS, contacts);
    }

    return contact;
  },

  async deleteHrContact(contact_id: string): Promise<boolean> {
    if (!isMockMode) {
      await supabase.from('company_hr_contacts').delete().eq('contact_id', contact_id);
    }
    const contacts = getStored<CompanyHrContact[]>(STORAGE_KEYS.HR_CONTACTS, INITIAL_HR_CONTACTS);
    setStored(STORAGE_KEYS.HR_CONTACTS, contacts.filter(c => c.contact_id !== contact_id));
    return true;
  },

  // OFFERS
  async getOffers(): Promise<Offer[]> {
    let offers: Offer[] = [];
    if (!isMockMode) {
      const { data, error } = await supabase.from('offers').select('*, company:companies(*)').order('created_at', { ascending: false });
      if (!error && data) offers = data as Offer[];
    } else {
      const rawOffers = getStored<Offer[]>(STORAGE_KEYS.OFFERS, INITIAL_OFFERS);
      const companies = getStored<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
      offers = rawOffers.map(o => ({
        ...o,
        company: companies.find(c => c.company_id === o.company_id),
      }));
    }
    return offers;
  },

  async saveOffer(offerData: Partial<Offer> & { company_id: string }): Promise<Offer> {
    const now = new Date().toISOString();
    const offer_id = offerData.offer_id || crypto.randomUUID();
    const offer: Offer = {
      offer_id,
      company_id: offerData.company_id,
      jd_text: offerData.jd_text || null,
      jd_files: offerData.jd_files || [],
      eligible_departments: offerData.eligible_departments || [],
      ctc_lpa: offerData.ctc_lpa ?? null,
      base_lpa: offerData.base_lpa ?? null,
      eligibility_criteria: offerData.eligibility_criteria || {},
      drive_date: offerData.drive_date || null,
      job_location: offerData.job_location || null,
      drive_mode: offerData.drive_mode || 'on_campus',
      status: offerData.status || 'drafted',
      approval_status: offerData.approval_status || 'draft',
      approved_by: offerData.approved_by || null,
      approved_at: offerData.approved_at || null,
      rejection_reason: offerData.rejection_reason || null,
      created_by: offerData.created_by || null,
      created_at: offerData.created_at || now,
    };

    if (!isMockMode) {
      const { data, error } = await supabase.from('offers').upsert(offer).select().single();
      if (!error && data) return data as Offer;
    }

    const offers = getStored<Offer[]>(STORAGE_KEYS.OFFERS, INITIAL_OFFERS);
    const idx = offers.findIndex(o => o.offer_id === offer.offer_id);
    if (idx >= 0) {
      offers[idx] = offer;
    } else {
      offers.unshift(offer);
    }
    setStored(STORAGE_KEYS.OFFERS, offers);
    return offer;
  },

  async updateOfferApproval(offer_id: string, status: ApprovalStatus, approverId?: string, reason?: string): Promise<Offer | null> {
    const now = new Date().toISOString();
    const isApproved = status === 'approved';
    const isRejected = status === 'rejected';

    const payload: any = {
      approval_status: status,
      approved_at: isApproved ? now : null,
      rejection_reason: isRejected ? (reason || 'Not specified') : null,
    };

    if (!isMockMode) {
      const { data, error } = await supabase
        .from('offers')
        .update(payload)
        .eq('offer_id', offer_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating offer approval in Supabase:', error);
      } else if (data) {
        const offers = getStored<Offer[]>(STORAGE_KEYS.OFFERS, INITIAL_OFFERS);
        const idx = offers.findIndex(o => o.offer_id === offer_id);
        if (idx >= 0) offers[idx] = data as Offer;
        setStored(STORAGE_KEYS.OFFERS, offers);
        return data as Offer;
      }
    }

    const offers = getStored<Offer[]>(STORAGE_KEYS.OFFERS, INITIAL_OFFERS);
    const target = offers.find(o => o.offer_id === offer_id);
    if (!target) return null;
    target.approval_status = status;
    target.approved_at = isApproved ? now : null;
    target.rejection_reason = isRejected ? (reason || 'Not specified') : null;
    setStored(STORAGE_KEYS.OFFERS, offers);
    return target;
  },

  async deleteOffer(offer_id: string): Promise<boolean> {
    if (!isMockMode) {
      await supabase.from('offers').delete().eq('offer_id', offer_id);
    }
    const offers = getStored<Offer[]>(STORAGE_KEYS.OFFERS, INITIAL_OFFERS);
    setStored(STORAGE_KEYS.OFFERS, offers.filter(o => o.offer_id !== offer_id));
    return true;
  },

  // DRIVE APPLICATIONS (REGISTRATION MATRIX)
  async getApplications(offer_id?: string): Promise<DriveApplication[]> {
    let apps: DriveApplication[] = [];
    if (!isMockMode) {
      let query = supabase.from('drive_applications').select('*, student:students(*), offer:offers(*)');
      if (offer_id) query = query.eq('offer_id', offer_id);
      const { data, error } = await query;
      if (!error && data) apps = data as DriveApplication[];
    } else {
      const rawApps = getStored<DriveApplication[]>(STORAGE_KEYS.APPLICATIONS, INITIAL_APPLICATIONS);
      const students = getStored<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
      const offers = getStored<Offer[]>(STORAGE_KEYS.OFFERS, INITIAL_OFFERS);

      apps = rawApps
        .filter(a => !offer_id || a.offer_id === offer_id)
        .map(a => ({
          ...a,
          student: students.find(s => s.student_id === a.student_id),
          offer: offers.find(o => o.offer_id === a.offer_id),
        }));
    }
    return apps;
  },

  async registerStudentsForOffer(offer_id: string, studentIds: string[]): Promise<number> {
    const existing = await this.getApplications(offer_id);
    const existingStudentIds = new Set(existing.map(a => a.student_id));
    const now = new Date().toISOString();

    const newApps: DriveApplication[] = [];
    for (const sid of studentIds) {
      if (!existingStudentIds.has(sid)) {
        newApps.push({
          application_id: crypto.randomUUID(),
          offer_id,
          student_id: sid,
          applied_at: now,
          final_status: 'applied',
          offer_accepted: false,
          round_wise_status: {},
        });
      }
    }

    if (newApps.length > 0) {
      if (!isMockMode) {
        await supabase.from('drive_applications').insert(newApps);
      } else {
        const allApps = getStored<DriveApplication[]>(STORAGE_KEYS.APPLICATIONS, INITIAL_APPLICATIONS);
        setStored(STORAGE_KEYS.APPLICATIONS, [...newApps, ...allApps]);
      }
    }

    return newApps.length;
  },

  async updateApplicationStatus(application_id: string, final_status: ApplicationFinalStatus, offer_accepted?: boolean): Promise<boolean> {
    const apps = getStored<DriveApplication[]>(STORAGE_KEYS.APPLICATIONS, INITIAL_APPLICATIONS);
    const target = apps.find(a => a.application_id === application_id);
    if (!target) return false;

    target.final_status = final_status;
    if (offer_accepted !== undefined) {
      target.offer_accepted = offer_accepted;
    }

    // Auto-update student placement status if selected and offer accepted
    if (final_status === 'selected' && target.offer_accepted) {
      const students = await this.getStudents();
      const st = students.find(s => s.student_id === target.student_id);
      if (st) {
        st.placement_status = 'placed';
        await this.saveStudent(st);
      }
    }

    if (!isMockMode) {
      await supabase.from('drive_applications').update({ final_status, offer_accepted: target.offer_accepted }).eq('application_id', application_id);
    } else {
      setStored(STORAGE_KEYS.APPLICATIONS, apps);
    }

    return true;
  },

  // SUPABASE STORAGE FILE UPLOAD
  async uploadFile(bucket: string, filePath: string, file: File): Promise<string> {
    const cleanPath = filePath.replace(/[^a-zA-Z0-9_.-]/g, '_');
    if (!isMockMode) {
      const { data, error } = await supabase.storage.from(bucket).upload(cleanPath, file, { upsert: true });
      if (error) {
        console.error(`Storage upload error (${bucket}/${cleanPath}):`, error);
        throw error;
      }
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
      return publicUrlData?.publicUrl || cleanPath;
    }
    return `mock_storage/${bucket}/${cleanPath}`;
  }
};
