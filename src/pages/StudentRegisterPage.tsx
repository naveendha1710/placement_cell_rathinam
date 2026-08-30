import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DataStore } from '../lib/store';
import { Offer, Student } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { 
  Calendar, MapPin, Search, 
  FileText, CheckCircle2, UserCheck, AlertCircle, GraduationCap, XCircle 
} from 'lucide-react';

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Artificial Intelligence & Data Science',
  'Master of Computer Applications',
];

interface EligibilityCheckResult {
  isEligible: boolean;
  reasons: string[];
}

function checkEligibility(
  student: {
    department: string;
    batch?: string | null;
    ug_cgpa?: number | null;
    sslc_percentage?: number | null;
    hsc_percentage?: number | null;
    backlogs_count?: number | null;
  },
  offer: Offer
): EligibilityCheckResult {
  const reasons: string[] = [];

  // 1. Department Check
  if (offer.eligible_departments && offer.eligible_departments.length > 0) {
    const isDeptEligible = offer.eligible_departments.some(
      d => d.toLowerCase().trim() === student.department?.toLowerCase().trim()
    );
    if (!isDeptEligible) {
      reasons.push(
        `Department '${student.department}' is not in eligible list (${offer.eligible_departments.join(', ')})`
      );
    }
  }

  const crit = offer.eligibility_criteria || {};

  // 2. Min CGPA Check
  if (crit.min_cgpa !== undefined && crit.min_cgpa !== null) {
    const cgpa = student.ug_cgpa ?? 0;
    if (cgpa < crit.min_cgpa) {
      reasons.push(`UG CGPA (${cgpa.toFixed(2)}) is below minimum required of ${crit.min_cgpa}`);
    }
  }

  // 3. Max Backlogs Check
  if (crit.max_backlogs !== undefined && crit.max_backlogs !== null) {
    const backlogs = student.backlogs_count ?? 0;
    if (backlogs > crit.max_backlogs) {
      reasons.push(`Active backlogs (${backlogs}) exceed maximum allowed (${crit.max_backlogs})`);
    }
  }

  // 4. Min 10th (SSLC) % Check
  if (crit.min_10th_pct !== undefined && crit.min_10th_pct !== null) {
    const sslc = student.sslc_percentage ?? 0;
    if (sslc < crit.min_10th_pct) {
      reasons.push(`10th (SSLC) % (${sslc}%) is below minimum required of ${crit.min_10th_pct}%`);
    }
  }

  // 5. Min 12th (HSC) % Check
  if (crit.min_12th_pct !== undefined && crit.min_12th_pct !== null) {
    const hsc = student.hsc_percentage ?? 0;
    if (hsc < crit.min_12th_pct) {
      reasons.push(`12th (HSC) % (${hsc}%) is below minimum required of ${crit.min_12th_pct}%`);
    }
  }

  // 6. Allowed Student Batches Check
  if (crit.allowed_batches && crit.allowed_batches.length > 0) {
    const studentBatch = student.batch || 'A';
    if (!crit.allowed_batches.includes(studentBatch as any)) {
      reasons.push(`Student batch (Batch ${studentBatch}) is not in eligible batches (${crit.allowed_batches.map(b => `Batch ${b}`).join(', ')})`);
    }
  }

  return {
    isEligible: reasons.length === 0,
    reasons,
  };
}

export const StudentRegisterPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loadingOffer, setLoadingOffer] = useState(true);

  // Registration Form State
  const [rollNumber, setRollNumber] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [resumeFile, setResumeFile] = useState('');
  
  const [existingStudent, setExistingStudent] = useState<Student | null>(null);
  const [searchingRoll, setSearchingRoll] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    async function fetchOffer() {
      if (!id) return;
      setLoadingOffer(true);
      try {
        const offers = await DataStore.getOffers();
        const match = offers.find(o => o.offer_id === id);
        setOffer(match || null);
      } finally {
        setLoadingOffer(false);
      }
    }
    fetchOffer();
  }, [id]);

  // Lookup student by roll number
  const handleRollLookup = async (roll: string) => {
    const cleanRoll = roll.trim();
    if (!cleanRoll) return;
    setSearchingRoll(true);
    try {
      const students = await DataStore.getStudents();
      const match = students.find(s => s.roll_number.toLowerCase() === cleanRoll.toLowerCase());
      if (match) {
        setExistingStudent(match);
        setName(match.name || '');
        setDepartment(match.department || DEPARTMENTS[0]);
        setEmail(match.email || '');
        setMobileNumber(match.mobile_number || '');
        setResumeFile(match.resume_file || '');
      } else {
        setExistingStudent(null);
      }
    } finally {
      setSearchingRoll(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingResume(true);
    setErrorMsg('');
    try {
      const fileName = `${rollNumber || Date.now()}_resume_${file.name}`;
      const publicUrl = await DataStore.uploadFile('student_files', fileName, file);
      setResumeFile(publicUrl);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to upload resume to student_files bucket.');
    } finally {
      setUploadingResume(false);
    }
  };

  // Eligibility Evaluation
  const eligibility = offer ? checkEligibility({
    department,
    batch: existingStudent?.batch ?? 'A',
    ug_cgpa: existingStudent?.ug_cgpa ?? null,
    sslc_percentage: existingStudent?.sslc_percentage ?? null,
    hsc_percentage: existingStudent?.hsc_percentage ?? null,
    backlogs_count: existingStudent?.backlogs_count ?? null,
  }, offer) : { isEligible: true, reasons: [] };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !offer) return;
    if (!rollNumber.trim() || !name.trim() || !email.trim()) {
      setErrorMsg('Please fill in all required fields (Roll Number, Name, Email).');
      return;
    }

    if (!eligibility.isEligible) {
      setErrorMsg('Cannot submit registration: Candidate does not meet the eligibility cutoff criteria.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      // 1. Create or Update Student Record
      const studentPayload: Partial<Student> & { name: string; roll_number: string; email: string; department: string } = {
        student_id: existingStudent?.student_id,
        roll_number: rollNumber.trim(),
        name: name.trim(),
        department,
        email: email.trim(),
        mobile_number: mobileNumber.trim() || undefined,
        resume_file: resumeFile || undefined,
        ug_cgpa: existingStudent?.ug_cgpa ?? 8.0,
        backlogs_count: existingStudent?.backlogs_count ?? 0,
        placement_status: existingStudent?.placement_status || 'yet_to_be_placed',
      };

      const savedStudent = await DataStore.saveStudent(studentPayload);

      // 2. Register Student for the Drive
      await DataStore.registerStudentsForOffer(offer.offer_id, [savedStudent.student_id]);
      setSubmittedSuccess(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to complete registration.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingOffer) {
    return <div className="py-12 text-center text-xs text-zinc-500">Loading drive details...</div>;
  }

  if (!offer) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-zinc-200">
        <h2 className="text-base font-bold text-zinc-900 mb-2">Offer Drive Not Found</h2>
        {user && (
          <Button variant="outline" size="sm" onClick={() => navigate('/offers')}>
            Back to Offers Directory
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      {/* Official College Branding Header */}
      <div className="p-4 bg-white rounded-xl border border-zinc-200 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Rathinam College Placement Cell</h2>
            <p className="text-xs text-zinc-500">Campus Drive Student Registration Portal</p>
          </div>
        </div>
        <Badge variant="approved">OFFICIAL DRIVE</Badge>
      </div>

      {/* Offer Summary Banner Card */}
      <Card className="p-6 bg-zinc-900 text-white border-zinc-900 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
              Campus Recruitment Drive
            </span>
            <h1 className="text-2xl font-bold text-zinc-50">{offer.company?.name || 'Company Offer'}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-300 pt-1">
              <span className="font-bold text-amber-400">{offer.ctc_lpa ? `${offer.ctc_lpa} LPA Package` : 'CTC TBD'}</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {offer.drive_date || 'Date TBD'}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {offer.job_location || 'Flexible'}
              </span>
            </div>
          </div>
          <Badge variant={offer.approval_status as any}>
            {offer.approval_status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </Card>

      {/* Submission Success View */}
      {submittedSuccess ? (
        <Card className="p-8 bg-white border-2 border-emerald-500 shadow-md text-center space-y-4 animate-in fade-in">
          <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-zinc-900">Registration Successfully Submitted!</h2>
            <p className="text-xs text-zinc-600">
              Thank you <span className="font-bold text-zinc-900">{name}</span> ({rollNumber}). Your candidate application for <span className="font-bold text-zinc-900">{offer.company?.name}</span> has been confirmed.
            </p>
          </div>

          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-700 max-w-md mx-auto text-left space-y-1">
            <p><span className="font-semibold">Department:</span> {department}</p>
            <p><span className="font-semibold">Registered Email:</span> {email}</p>
            <p><span className="font-semibold">Resume Attachment:</span> {resumeFile ? 'Attached in student_files bucket ✓' : 'None'}</p>
          </div>

          {!user && (
            <p className="text-xs text-zinc-400">You may close this browser tab now.</p>
          )}
        </Card>
      ) : (
        /* Student Registration Form */
        <Card className="p-6 bg-white border-zinc-200 shadow-sm space-y-6">
          <div className="border-b border-zinc-100 pb-3">
            <h2 className="text-lg font-bold text-zinc-900">Student Registration Form</h2>
            <p className="text-xs text-zinc-500">
              Enter your registration details below to apply for {offer.company?.name || 'this recruitment drive'}.
            </p>
          </div>

          {/* Eligibility Warning Banner if Ineligible */}
          {!eligibility.isEligible && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-700">
                <XCircle className="h-5 w-5" />
                <span>Eligibility Criteria Not Met — Registration Blocked</span>
              </div>
              <p className="text-rose-800 font-medium">
                Sorry, your candidate profile does not satisfy the eligibility cutoff requirements for this drive:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-rose-900 font-semibold">
                {eligibility.reasons.map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Registration / Roll Number Lookup */}
            <div>
              <label className="text-xs font-semibold text-zinc-900 block mb-1">
                Registration / Roll Number *
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 714021104001"
                  value={rollNumber}
                  onChange={(e) => {
                    setRollNumber(e.target.value);
                    handleRollLookup(e.target.value);
                  }}
                  onBlur={() => handleRollLookup(rollNumber)}
                  required
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRollLookup(rollNumber)}
                  disabled={searchingRoll}
                  className="shrink-0 gap-1.5"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>{searchingRoll ? 'Searching...' : 'Lookup Profile'}</span>
                </Button>
              </div>
              {existingStudent ? (
                <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5" />
                  Existing Student Profile matched: {existingStudent.name} ({existingStudent.department})
                </p>
              ) : rollNumber.length > 2 && !searchingRoll ? (
                <p className="text-[11px] text-zinc-400 mt-1">
                  New candidate registration — profile will be created.
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Student Full Name *"
                placeholder="e.g. Aarav Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Select
                label="Department *"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                options={DEPARTMENTS.map(d => ({ label: d, value: d }))}
              />

              <Input
                label="Email Address *"
                type="email"
                placeholder="aarav@rathinam.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Mobile Number"
                placeholder="+91 9876543210"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
              />
            </div>

            {/* Resume Upload & Replacement */}
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
              <label className="text-xs font-bold text-zinc-900 block uppercase tracking-wider">
                Resume Document
              </label>

              {resumeFile ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="h-4 w-4 text-emerald-700 shrink-0" />
                    <div className="truncate">
                      <p className="font-semibold text-emerald-900 truncate text-[11px]">
                        {resumeFile.split('/').pop()?.split('?')[0] || 'Resume Document'}
                      </p>
                      <p className="text-[10px] text-emerald-700">Current active resume file</p>
                    </div>
                  </div>
                  <a
                    href={resumeFile}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 px-2.5 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                  >
                    View Resume
                  </a>
                </div>
              ) : (
                <p className="text-xs text-zinc-500">No resume attached to profile yet.</p>
              )}

              <div>
                <label className="text-xs font-semibold text-zinc-800 block mb-1">
                  {resumeFile ? 'Upload New Resume (Replaces Current File)' : 'Upload Resume File (PDF / Docx)'}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeUpload}
                    disabled={uploadingResume}
                    className="block w-full text-xs text-zinc-500 file:mr-2 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-zinc-800 cursor-pointer"
                  />
                </div>
                {uploadingResume && (
                  <p className="text-[11px] text-zinc-500 mt-1 font-medium">
                    Uploading new resume file...
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
              <Button
                type="submit"
                disabled={submitting || uploadingResume || !eligibility.isEligible}
                className="w-full sm:w-auto gap-2 bg-zinc-900 hover:bg-zinc-800 text-white disabled:bg-zinc-300 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{submitting ? 'Registering Candidate...' : !eligibility.isEligible ? 'Ineligible for this Drive' : 'Submit Registration for Drive'}</span>
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};
