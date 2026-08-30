import { supabase, isMockMode } from './supabase';
import { 
  Profile, Student, Company, CompanyHrContact, Offer, DriveApplication, 
  ApprovalStatus, ApplicationFinalStatus, DocumentExtraction 
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

  async saveProfile(profile: Omit<Profile, 'created_at'> & { created_at?: string; password?: string }): Promise<Profile> {
    const profileId = profile.id && profile.id.length > 10 ? profile.id : crypto.randomUUID();
    const newProfile: Profile = {
      ...profile,
      id: profileId,
      created_at: profile.created_at || new Date().toISOString(),
    };

    if (!isMockMode) {
      try {
        // Check if profile with email already exists in Supabase to reuse ID
        const { data: existingProf } = await supabase.from('profiles').select('id').eq('email', newProfile.email).maybeSingle();
        if (existingProf?.id) {
          newProfile.id = existingProf.id;
        }

        const profilePayload: any = { ...newProfile };
        if (profile.password) {
          profilePayload.password_hash = profile.password;
        }
        delete profilePayload.password;

        const { data, error } = await supabase.from('profiles').upsert(profilePayload).select().single();
        if (error) {
          console.error('Error upserting profile in Supabase:', error);
        } else if (data) {
          delete (data as any).password;
          delete (data as any).password_hash;
          const profiles = getStored<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
          const existingIndex = profiles.findIndex(p => p.id === data.id || p.email === data.email);
          if (existingIndex >= 0) {
            profiles[existingIndex] = data as Profile;
          } else {
            profiles.push(data as Profile);
          }
          setStored(STORAGE_KEYS.PROFILES, profiles);
          return data as Profile;
        }
      } catch (err) {
        console.error('Supabase profile save exception:', err);
      }
    }

    delete (newProfile as any).password;
    delete (newProfile as any).password_hash;
    const profiles = getStored<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    const existingIndex = profiles.findIndex(p => p.id === newProfile.id || p.email === newProfile.email);
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
      source: studentData.source || null,
      sslc_percentage: studentData.sslc_percentage ?? null,
      hsc_percentage: studentData.hsc_percentage ?? null,
      ug_cgpa: studentData.ug_cgpa ?? null,
      ug_percentage: studentData.ug_percentage ?? null,
      pg_cgpa: studentData.pg_cgpa ?? null,
      pg_percentage: studentData.pg_percentage ?? null,
      pg_status: studentData.pg_status || 'not_applicable',
      ug_graduation_year: studentData.ug_graduation_year ?? null,
      pg_graduation_year: studentData.pg_graduation_year ?? null,
      graduation_date: studentData.graduation_date || null,
      github_url: studentData.github_url || null,
      linkedin_url: studentData.linkedin_url || null,
      portfolio_url: studentData.portfolio_url || null,
      resume_file: studentData.resume_file || null,
      video_intro_link: studentData.video_intro_link || null,
      photo_file: studentData.photo_file || null,
      email: studentData.email,
      personal_email: studentData.personal_email || null,
      mobile_number: studentData.mobile_number || null,
      backlogs_count: studentData.backlogs_count || 0,
      placement_status: studentData.placement_status || 'yet_to_be_placed',
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

  async bulkInsertStudents(newStudents: Array<Omit<Student, 'student_id' | 'created_at' | 'updated_at'>>, deptScope?: string | null): Promise<{ inserted: number; skipped: number; reasons: string[] }> {
    const existing = await this.getStudents();
    const existingRolls = new Set(existing.map(s => s.roll_number.toLowerCase().trim()));
    const existingEmails = new Set(existing.map(s => s.email.toLowerCase().trim()));

    const toInsert: Student[] = [];
    const reasons: string[] = [];
    let skipped = 0;

    for (const rawItem of newStudents) {
      const item = rawItem as any;
      const roll = (item['roll_number'] || item['Roll Number'] || item['Roll'] || item['roll'] || '').toString().trim();
      const name = (item['name'] || item['Name'] || item['Student Name'] || item['Full Name'] || '').toString().trim();
      const department = (item['department'] || item['Department'] || item['Dept'] || '').toString().trim();
      const email = (item['email'] || item['Email'] || item['Email Address'] || '').toString().trim();

      if (!roll || !name || !department || !email) {
        skipped++;
        reasons.push(`Row missing required fields (Roll: ${roll || 'N/A'}, Name: ${name || 'N/A'})`);
        continue;
      }

      if (deptScope && department.toLowerCase() !== deptScope.toLowerCase().trim()) {
        skipped++;
        reasons.push(`Department '${department}' outside coordinator scope '${deptScope}'`);
        continue;
      }

      if (existingRolls.has(roll.toLowerCase())) {
        skipped++;
        reasons.push(`Duplicate roll number: ${roll}`);
        continue;
      }

      if (existingEmails.has(email.toLowerCase())) {
        skipped++;
        reasons.push(`Duplicate email address: ${email}`);
        continue;
      }

      existingRolls.add(roll.toLowerCase());
      existingEmails.add(email.toLowerCase());

      const now = new Date().toISOString();
      const studentRecord: Student = {
        student_id: crypto.randomUUID(),
        roll_number: roll,
        name,
        department,
        email,
        personal_email: (item['personal_email'] || item['Personal Email'] || item['Personal Email ID'] || null),
        mobile_number: (item['mobile_number'] || item['Mobile No'] || item['Mobile Number'] || item['Mobile'] || null),
        gender: (item['gender'] || item['Gender'] || null),
        residency: (item['residency'] || item['Residency'] || item['Residency Type'] || item['Student Type'] || 'day_scholar'),
        source: (item['source'] || item['Source'] || item['Source Column'] || null),
        sslc_percentage: item['sslc_percentage'] || item['10th %'] || item['10th Percentage'] || item['SSLC %'] ? parseFloat(item['sslc_percentage'] || item['10th %'] || item['10th Percentage'] || item['SSLC %']) : null,
        hsc_percentage: item['hsc_percentage'] || item['12th %'] || item['12th Percentage'] || item['HSC %'] ? parseFloat(item['hsc_percentage'] || item['12th %'] || item['12th Percentage'] || item['HSC %']) : null,
        ug_cgpa: item['ug_cgpa'] || item['UG CGPA'] || item['CGPA'] ? parseFloat(item['ug_cgpa'] || item['UG CGPA'] || item['CGPA']) : null,
        ug_percentage: item['ug_percentage'] || item['UG %'] || item['UG Percentage'] ? parseFloat(item['ug_percentage'] || item['UG %'] || item['UG Percentage']) : null,
        pg_cgpa: item['pg_cgpa'] || item['PG CGPA'] ? parseFloat(item['pg_cgpa'] || item['PG CGPA']) : null,
        pg_percentage: item['pg_percentage'] || item['PG %'] || item['PG Percentage'] ? parseFloat(item['pg_percentage'] || item['PG %'] || item['PG Percentage']) : null,
        graduation_date: (item['graduation_date'] || item['Graduation Date'] || item['Graduation Year'] || null),
        linkedin_url: (item['linkedin_url'] || item['LinkedIn URL'] || item['LinkedIn ID'] || null),
        github_url: (item['github_url'] || item['GitHub URL'] || item['GitHub ID'] || null),
        portfolio_url: (item['portfolio_url'] || item['Portfolio URL'] || item['Portfolio'] || null),
        resume_file: (item['resume_file'] || item['Resume Link'] || item['Resume'] || null),
        photo_file: (item['photo_file'] || item['Student Photo'] || item['Photo'] || null),
        backlogs_count: item['backlogs_count'] || item['Backlogs'] ? parseInt(item['backlogs_count'] || item['Backlogs']) : 0,
        placement_status: (item['placement_status'] || item['Placement Status'] || 'yet_to_be_placed'),
        created_at: now,
        updated_at: now,
      };

      // Strip null/undefined values to prevent PostgREST PGRST204 schema cache errors when optional columns are pending SQL migration
      const cleanRecord = Object.fromEntries(
        Object.entries(studentRecord).filter(([_, v]) => v !== null && v !== undefined)
      ) as Student;

      toInsert.push(cleanRecord);
    }

    if (toInsert.length > 0) {
      if (!isMockMode) {
        try {
          const { error } = await supabase.from('students').insert(toInsert);
          if (error) {
            console.error('Error inserting students into Supabase:', error);
            const current = getStored<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
            setStored(STORAGE_KEYS.STUDENTS, [...toInsert, ...current]);
          } else {
            const current = getStored<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
            setStored(STORAGE_KEYS.STUDENTS, [...toInsert, ...current]);
          }
        } catch (err) {
          console.error('Supabase students bulk insert exception:', err);
          const current = getStored<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
          setStored(STORAGE_KEYS.STUDENTS, [...toInsert, ...current]);
        }
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
      if (!error && data) {
        const local = getStored<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
        return (data as Company[]).map(dbComp => {
          const locComp = local.find(l => l.company_id === dbComp.company_id);
          if (locComp && locComp.status) {
            return { ...dbComp, status: locComp.status };
          }
          return dbComp;
        });
      }
    }
    return getStored<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
  },

  async saveCompany(companyData: Partial<Company> & { name: string }): Promise<Company> {
    const now = new Date().toISOString();
    const company_id = companyData.company_id || crypto.randomUUID();

    let existingStatus = companyData.status || 'active';
    let existingApprovalStatus = companyData.approval_status || 'pending_approval';
    let existingApprovedBy = companyData.approved_by || null;
    let existingApprovedAt = companyData.approved_at || null;
    let existingRejectionReason = companyData.rejection_reason || null;

    if (companyData.company_id) {
      const existingList = await this.getCompanies();
      const match = existingList.find(c => c.company_id === companyData.company_id);
      if (match) {
        existingStatus = companyData.status || match.status || 'active';
        existingApprovalStatus = companyData.approval_status || match.approval_status || 'pending_approval';
        existingApprovedBy = companyData.approved_by || match.approved_by || null;
        existingApprovedAt = companyData.approved_at || match.approved_at || null;
        existingRejectionReason = companyData.rejection_reason || match.rejection_reason || null;
      }
    }

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
      status: existingStatus,
      approval_status: existingApprovalStatus,
      approved_by: existingApprovedBy,
      approved_at: existingApprovedAt,
      rejection_reason: existingRejectionReason,
      created_by: companyData.created_by || null,
      created_at: companyData.created_at || now,
    };

    if (!isMockMode) {
      const { data, error } = await supabase.from('companies').upsert(company).select().single();
      if (error) {
        console.warn('Supabase company upsert check constraint notice:', error.message);
      } else if (data) {
        const companies = getStored<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
        const idx = companies.findIndex(c => c.company_id === company.company_id);
        if (idx >= 0) companies[idx] = data as Company;
        else companies.unshift(data as Company);
        setStored(STORAGE_KEYS.COMPANIES, companies);
        return data as Company;
      }
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

  async bulkInsertCompanies(rawCompanies: any[]): Promise<{ inserted: number; skipped: number; reasons: string[] }> {
    const existing = await this.getCompanies();
    const existingNames = new Set(existing.map(c => c.name.toLowerCase().trim()));

    const toInsert: Company[] = [];
    const reasons: string[] = [];
    let skipped = 0;

    for (const rawItem of rawCompanies) {
      const item = rawItem as any;
      const name = (item['name'] || item['Company Name'] || item['Company'] || item['company_name'] || '').toString().trim();
      const industry_domain = (item['industry_domain'] || item['Industry Domain'] || item['Industry'] || '').toString().trim() || null;
      const website_url = (item['website_url'] || item['Website URL'] || item['Website'] || '').toString().trim() || null;
      const contact_person_name = (item['contact_person_name'] || item['Contact Person Name'] || item['Contact Person'] || '').toString().trim() || null;
      const contact_person_mobile = (item['contact_person_mobile'] || item['Contact Person Mobile'] || item['Mobile'] || '').toString().trim() || null;
      const address = (item['address'] || item['Company Address'] || item['Address'] || '').toString().trim() || null;
      const rawStar = item['star_rating'] || item['Star Rating'] || item['Rating'] || item['Tier'] || 3;
      const star_rating = Math.min(5, Math.max(1, parseInt(rawStar) || 3));
      const rawEmp = item['employee_count'] || item['Employee Count'];
      const employee_count = rawEmp ? parseInt(rawEmp) || null : null;

      if (!name) {
        skipped++;
        reasons.push('Row missing required company name');
        continue;
      }

      if (existingNames.has(name.toLowerCase())) {
        skipped++;
        reasons.push(`Duplicate company name: ${name}`);
        continue;
      }

      existingNames.add(name.toLowerCase());

      const companyRecord: Company = {
        company_id: crypto.randomUUID(),
        name,
        address,
        website_url,
        contact_person_name,
        contact_person_mobile,
        map_link: null,
        employee_count,
        star_rating,
        industry_domain,
        status: 'active',
        approval_status: 'pending_approval',
        created_at: new Date().toISOString(),
      };

      toInsert.push(companyRecord);
    }

    if (toInsert.length > 0) {
      if (!isMockMode) {
        try {
          const { error } = await supabase.from('companies').insert(toInsert);
          if (error) {
            console.error('Error inserting companies into Supabase:', error);
            const current = getStored<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
            setStored(STORAGE_KEYS.COMPANIES, [...toInsert, ...current]);
          } else {
            const current = getStored<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
            setStored(STORAGE_KEYS.COMPANIES, [...toInsert, ...current]);
          }
        } catch (err) {
          console.error('Supabase companies bulk insert exception:', err);
          const current = getStored<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
          setStored(STORAGE_KEYS.COMPANIES, [...toInsert, ...current]);
        }
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

    let existingApprovalStatus = offerData.approval_status || 'approved';
    let existingApprovedBy = offerData.approved_by || null;
    let existingApprovedAt = offerData.approved_at || null;
    let existingRejectionReason = offerData.rejection_reason || null;

    if (offerData.offer_id) {
      const existingList = await this.getOffers();
      const match = existingList.find(o => o.offer_id === offerData.offer_id);
      if (match) {
        existingApprovalStatus = offerData.approval_status || match.approval_status || 'approved';
        existingApprovedBy = offerData.approved_by || match.approved_by || null;
        existingApprovedAt = offerData.approved_at || match.approved_at || null;
        existingRejectionReason = offerData.rejection_reason || match.rejection_reason || null;
      }
    }

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
      offer_status: offerData.offer_status || 'cold',
      approval_status: existingApprovalStatus,
      approved_by: existingApprovedBy,
      approved_at: existingApprovedAt,
      rejection_reason: existingRejectionReason,
      created_by: offerData.created_by || null,
      created_at: offerData.created_at || now,
    };

    // Auto-Upsert Job Description Extraction in document_extractions table
    if (offer.jd_text && offer.jd_text.trim().length > 0) {
      await this.saveDocumentExtraction({
        entity_type: 'job_description',
        entity_id: offer.offer_id,
        extracted_text: offer.jd_text,
        status: 'done',
      });
    }

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

  async markCandidatesAsPlaced(offer_id: string, selectedStudentIds: string[]): Promise<number> {
    const apps = await this.getApplications(offer_id);
    const students = await this.getStudents();
    let updatedCount = 0;

    for (const app of apps) {
      const isSelected = selectedStudentIds.includes(app.student_id);
      if (isSelected) {
        app.final_status = 'selected';
        app.offer_accepted = true;
        updatedCount++;

        // Automatically change student overall placement status to 'placed'
        const st = students.find(s => s.student_id === app.student_id);
        if (st) {
          st.placement_status = 'placed';
          await this.saveStudent(st);
        }

        if (!isMockMode) {
          await supabase
            .from('drive_applications')
            .update({ final_status: 'selected', offer_accepted: true })
            .eq('application_id', app.application_id);
        }
      }
    }

    if (isMockMode) {
      const allApps = getStored<DriveApplication[]>(STORAGE_KEYS.APPLICATIONS, INITIAL_APPLICATIONS);
      const appSet = new Set(selectedStudentIds);
      allApps.forEach(a => {
        if (a.offer_id === offer_id && appSet.has(a.student_id)) {
          a.final_status = 'selected';
          a.offer_accepted = true;
        }
      });
      setStored(STORAGE_KEYS.APPLICATIONS, allApps);
    }

    return updatedCount;
  },

  // AI MATCH SCORING & DOCUMENT EXTRACTION HELPERS
  async saveDocumentExtraction(extraction: Omit<DocumentExtraction, 'extraction_id' | 'extracted_at'> & { extraction_id?: string }): Promise<DocumentExtraction> {
    const record: DocumentExtraction = {
      extraction_id: extraction.extraction_id || crypto.randomUUID(),
      entity_type: extraction.entity_type,
      entity_id: extraction.entity_id,
      extracted_text: extraction.extracted_text,
      status: extraction.status || 'done',
      extracted_at: new Date().toISOString(),
    };

    if (!isMockMode) {
      await supabase.from('document_extractions').upsert(record, { onConflict: 'entity_type,entity_id' });
    }

    return record;
  },

  async getDocumentExtraction(entity_type: 'student_resume' | 'job_description', entity_id: string): Promise<DocumentExtraction | null> {
    if (!isMockMode) {
      const { data, error } = await supabase
        .from('document_extractions')
        .select('*')
        .eq('entity_type', entity_type)
        .eq('entity_id', entity_id)
        .maybeSingle();

      if (!error && data) return data as DocumentExtraction;
    }

    if (entity_type === 'job_description') {
      const offers = await this.getOffers();
      const match = offers.find(o => o.offer_id === entity_id);
      if (match && match.jd_text && match.jd_text.trim().length > 0) {
        return {
          extraction_id: `ext_jd_${entity_id}`,
          entity_type: 'job_description',
          entity_id,
          extracted_text: match.jd_text,
          status: 'done',
          extracted_at: new Date().toISOString(),
        };
      }
    }

    // Fallback/Simulated extraction check
    if (entity_type === 'student_resume') {
      const students = await this.getStudents();
      const st = students.find(s => s.student_id === entity_id);
      if (st && (st.resume_file || st.github_url || (st.ug_cgpa && st.ug_cgpa > 0))) {
        let deptSkills = 'Java, Python, React, Data Structures, SQL, Problem Solving, Web Development.';
        const deptLower = (st.department || '').toLowerCase();
        
        if (deptLower.includes('mechanical')) {
          deptSkills = 'Mechanical Design, AutoCAD, SolidWorks, Thermodynamics, Manufacturing Processes, Machining, Industrial Design.';
        } else if (deptLower.includes('civil')) {
          deptSkills = 'Structural Analysis, AutoCAD, STAAD Pro, Surveying, Concrete Technology, Construction Management.';
        } else if (deptLower.includes('electronics')) {
          deptSkills = 'Embedded Systems, VLSI, Digital Signal Processing, Microcontrollers, C++, IoT, Circuit Design.';
        } else if (deptLower.includes('intelligence') || deptLower.includes('data')) {
          deptSkills = 'Python, Machine Learning, PyTorch, Deep Learning, Data Analytics, Computer Vision, SQL.';
        }

        return {
          extraction_id: `ext_st_${entity_id}`,
          entity_type: 'student_resume',
          entity_id,
          extracted_text: `Candidate ${st.name}, Department: ${st.department}, CGPA: ${st.ug_cgpa || 8.0}, Backlogs: ${st.backlogs_count}. Technical Skills & Domain Expertise: ${deptSkills}`,
          status: 'done',
          extracted_at: new Date().toISOString(),
        };
      }
    }
    return null;
  },

  async updateApplicationMatchScore(application_id: string, match_score: number, matched_model: string = 'antigravity-llm-v1'): Promise<boolean> {
    const now = new Date().toISOString();
    
    if (!isMockMode) {
      const { error } = await supabase
        .from('drive_applications')
        .update({
          match_score,
          matched_model,
          matched_at: now,
        })
        .eq('application_id', application_id);
      
      if (error) {
        console.error('Error updating match score in Supabase:', error);
      }
    }

    const apps = getStored<DriveApplication[]>(STORAGE_KEYS.APPLICATIONS, INITIAL_APPLICATIONS);
    const target = apps.find(a => a.application_id === application_id);
    if (target) {
      target.match_score = match_score;
      target.matched_model = matched_model;
      target.matched_at = now;
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
