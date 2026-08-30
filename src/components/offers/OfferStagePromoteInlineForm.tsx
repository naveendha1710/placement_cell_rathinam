import React, { useState, useEffect } from 'react';
import { Offer, OfferStatus, DriveMode, StudentBatch, JobRole, StageHistoryEntry } from '../../types/database';
import { DataStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';
import { extractTextFromDocumentFile } from '../../utils/documentExtractor';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Plus, Trash2, CheckCircle, Layers, Calendar, MessageSquare, Briefcase, ArrowRight, X } from 'lucide-react';

interface OfferStagePromoteInlineFormProps {
  onClose: () => void;
  offer: Offer;
  targetStage: OfferStatus;
  onSuccess: () => Promise<void>;
}

const DEPARTMENTS_LIST = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Artificial Intelligence & Data Science',
  'Master of Computer Applications',
];

const MONTHS_LIST = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PERIODS_LIST = [
  'Entire Month',
  '1st Week (Days 1-7)',
  '2nd Week (Days 8-14)',
  '3rd Week (Days 15-21)',
  '4th Week (Days 22-28)',
  'Mid Month (Days 10-20)',
  'End of Month (Days 20-30)',
];

const YEARS_LIST = ['2026', '2027', '2028'];

export const OfferStagePromoteInlineForm: React.FC<OfferStagePromoteInlineFormProps> = ({
  onClose,
  offer,
  targetStage,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [transitionNotes, setTransitionNotes] = useState('');

  // Warm Stage Fields (Structured Month, Year & Period)
  const [tentativeMonth, setTentativeMonth] = useState('October');
  const [tentativeYear, setTentativeYear] = useState('2026');
  const [tentativePeriod, setTentativePeriod] = useState('2nd Week (Days 8-14)');

  const [expectedOpenings, setExpectedOpenings] = useState(offer.expected_openings?.toString() || '');
  const [contactPersonName, setContactPersonName] = useState(offer.contact_person_name || '');

  // Hot Stage Fields
  const [driveDate, setDriveDate] = useState(offer.drive_date || '');
  const [jobLocation, setJobLocation] = useState(offer.job_location || '');
  const [driveMode, setDriveMode] = useState<DriveMode>(offer.drive_mode || 'on_campus');

  // Multi-Role Manager State for Hot Stage
  const [jobRoles, setJobRoles] = useState<JobRole[]>(
    offer.job_roles && offer.job_roles.length > 0
      ? offer.job_roles
      : [
          {
            role_id: crypto.randomUUID(),
            role_title: '',
            ctc_lpa: offer.ctc_lpa ?? undefined,
            base_lpa: offer.base_lpa ?? undefined,
            eligible_departments: offer.eligible_departments || [],
            eligibility_criteria: offer.eligibility_criteria || { allowed_batches: ['T', 'O', 'S', 'A', 'X'] },
            jd_text: offer.jd_text || '',
            jd_files: offer.jd_files || [],
            vacancies: undefined,
          },
        ]
  );
  const [activeRoleIndex, setActiveRoleIndex] = useState<number>(0);
  const [uploadingJd, setUploadingJd] = useState(false);

  useEffect(() => {
    if (offer) {
      setExpectedOpenings(offer.expected_openings?.toString() || '');
      setContactPersonName(offer.contact_person_name || '');
      setDriveDate(offer.drive_date || '');
      setJobLocation(offer.job_location || '');
      setDriveMode(offer.drive_mode || 'on_campus');
      if (offer.job_roles && offer.job_roles.length > 0) {
        setJobRoles(offer.job_roles);
      }
      setTransitionNotes('');
    }
  }, [offer]);

  const handleAddJobRole = () => {
    const newRole: JobRole = {
      role_id: crypto.randomUUID(),
      role_title: '',
      ctc_lpa: undefined,
      base_lpa: undefined,
      eligible_departments: [],
      eligibility_criteria: { allowed_batches: ['T', 'O', 'S', 'A', 'X'] },
      jd_files: [],
      vacancies: undefined,
    };
    setJobRoles([...jobRoles, newRole]);
    setActiveRoleIndex(jobRoles.length);
  };

  const handleRemoveJobRole = (index: number) => {
    if (jobRoles.length <= 1) {
      alert('At least one job role is required.');
      return;
    }
    const updated = jobRoles.filter((_, idx) => idx !== index);
    setJobRoles(updated);
    setActiveRoleIndex(Math.max(0, index - 1));
  };

  const handleUpdateRoleField = (index: number, updates: Partial<JobRole>) => {
    const updated = [...jobRoles];
    updated[index] = { ...updated[index], ...updates };
    setJobRoles(updated);
  };

  const handleUpdateCriteriaField = (index: number, key: string, value: any) => {
    const updated = [...jobRoles];
    const role = updated[index];
    const criteria = role.eligibility_criteria || { allowed_batches: ['T', 'O', 'S', 'A', 'X'] };
    updated[index] = {
      ...role,
      eligibility_criteria: {
        ...criteria,
        [key]: value,
      },
    };
    setJobRoles(updated);
  };

  const handleBatchToggle = (index: number, batch: StudentBatch) => {
    const updated = [...jobRoles];
    const role = updated[index];
    const criteria = role.eligibility_criteria || { allowed_batches: [] };
    const currentBatches = criteria.allowed_batches || ['T', 'O', 'S', 'A', 'X'];

    const nextBatches = currentBatches.includes(batch)
      ? currentBatches.filter(b => b !== batch)
      : [...currentBatches, batch];

    updated[index] = {
      ...role,
      eligibility_criteria: {
        ...criteria,
        allowed_batches: nextBatches,
      },
    };
    setJobRoles(updated);
  };

  const handleDeptToggle = (index: number, dept: string) => {
    const updated = [...jobRoles];
    const role = updated[index];
    const currentDepts = role.eligible_departments || [];
    const nextDepts = currentDepts.includes(dept)
      ? currentDepts.filter(d => d !== dept)
      : [...currentDepts, dept];

    updated[index] = { ...role, eligible_departments: nextDepts };
    setJobRoles(updated);
  };

  const handleFileUpload = async (index: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingJd(true);
    try {
      const file = files[0];
      const uploadedPath = await DataStore.uploadFile('jd-files', `${offer.company_id}/${Date.now()}_${file.name}`, file);
      
      let extractedText = '';
      try {
        extractedText = await extractTextFromDocumentFile(file);
      } catch (err) {
        console.warn('Could not extract text automatically from JD:', err);
      }

      const role = jobRoles[index];
      const existingFiles = role.jd_files || [];
      const updatedFiles = [...existingFiles, uploadedPath];
      const updatedText = role.jd_text ? `${role.jd_text}\n\n${extractedText}` : extractedText;

      handleUpdateRoleField(index, {
        jd_files: updatedFiles,
        jd_text: updatedText,
      });
    } catch (err) {
      console.error(err);
      alert('Failed to upload JD file.');
    } finally {
      setUploadingJd(false);
    }
  };

  const handleRemoveJdFile = (roleIndex: number, fileIndex: number) => {
    const role = jobRoles[roleIndex];
    const updatedFiles = (role.jd_files || []).filter((_, idx) => idx !== fileIndex);
    handleUpdateRoleField(roleIndex, { jd_files: updatedFiles });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transitionNotes.trim()) {
      alert('Please enter transition notes for this stage update.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const newAuditEntry: StageHistoryEntry = {
        id: crypto.randomUUID(),
        stage: targetStage,
        timestamp: now,
        updated_by_id: user?.id || 'system',
        updated_by_name: user?.name || 'Placement Officer',
        notes: transitionNotes.trim(),
      };

      const updatedHistory = [...(offer.stage_history || []), newAuditEntry];

      const primaryRole = jobRoles[0] || {};

      await DataStore.saveOffer({
        ...offer,
        company_id: offer.company_id,
        offer_status: targetStage,
        contact_person_name: contactPersonName.trim(),
        tentative_drive_date: targetStage === 'warm' ? `${tentativeMonth} ${tentativeYear} (${tentativePeriod.split(' ')[0]} ${tentativePeriod.split(' ')[1] || ''})`.trim() : (offer.tentative_drive_date || null),
        expected_openings: expectedOpenings ? parseInt(expectedOpenings) : null,
        drive_date: driveDate || null,
        drive_mode: driveMode,
        job_location: jobLocation.trim(),
        job_roles: (targetStage === 'hot' || targetStage === 'drive_completed') ? jobRoles : offer.job_roles,
        stage_history: updatedHistory,
        // Fallbacks
        ctc_lpa: primaryRole.ctc_lpa ?? offer.ctc_lpa,
        base_lpa: primaryRole.base_lpa ?? offer.base_lpa,
        eligible_departments: primaryRole.eligible_departments ?? offer.eligible_departments,
        eligibility_criteria: primaryRole.eligibility_criteria ?? offer.eligibility_criteria,
      });

      await onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to promote stage.');
    } finally {
      setSaving(false);
    }
  };

  const stageLabels: Record<OfferStatus, string> = {
    cold: 'Cold Lead',
    warm: 'Warm Discussion',
    hot: 'Hot Drive Confirmed',
    drive_completed: 'Drive Completed',
  };

  const currentRole = jobRoles[activeRoleIndex] || jobRoles[0];

  return (
    <Card className="p-6 bg-white border-2 border-zinc-900 shadow-lg space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-zinc-900" />
            <span>Promote Stage: {stageLabels[offer.offer_status || 'cold']} ➔ {stageLabels[targetStage]}</span>
          </h3>
          <p className="text-xs text-zinc-500">Configure drive specifications, multi-role parameters, & transition audit notes</p>
        </div>
        <button onClick={onClose} className="p-1 rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-2 p-3 bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-800">
          <span>Current: <strong className="uppercase">{offer.offer_status}</strong></span>
          <ArrowRight className="h-4 w-4 text-zinc-500" />
          <span>New Target Stage: <strong className="uppercase text-zinc-900">{targetStage}</strong></span>
        </div>

        {/* WARM STAGE SPECIFIC FIELDS */}
        {targetStage === 'warm' && (
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-4">
            <div className="flex items-center gap-2 text-zinc-900 font-bold text-xs uppercase tracking-wider">
              <Calendar className="h-4 w-4 text-zinc-700" /> Warm Discussion & Tentative Schedule
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-900 block mb-1">
                  Tentative Drive Month *
                </label>
                <select
                  value={tentativeMonth}
                  onChange={(e) => setTentativeMonth(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-xs font-medium text-zinc-900 focus:ring-2 focus:ring-zinc-900"
                >
                  {MONTHS_LIST.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-900 block mb-1">
                  Tentative Year *
                </label>
                <select
                  value={tentativeYear}
                  onChange={(e) => setTentativeYear(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-xs font-medium text-zinc-900 focus:ring-2 focus:ring-zinc-900"
                >
                  {YEARS_LIST.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-900 block mb-1">
                  Tentative Timeframe / Period *
                </label>
                <select
                  value={tentativePeriod}
                  onChange={(e) => setTentativePeriod(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-xs font-medium text-zinc-900 focus:ring-2 focus:ring-zinc-900"
                >
                  {PERIODS_LIST.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-200 pt-3">
              <Input
                label="Expected Openings / Headcount"
                type="number"
                placeholder="e.g. 15"
                value={expectedOpenings}
                onChange={(e) => setExpectedOpenings(e.target.value)}
              />

              <Input
                label="HR Contact Person"
                placeholder="e.g. Anand V (University Relations)"
                value={contactPersonName}
                onChange={(e) => setContactPersonName(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* HOT STAGE SPECIFIC FIELDS + MULTI-ROLE MANAGER */}
        {targetStage === 'hot' && (
          <div className="space-y-6">
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-4">
              <div className="flex items-center gap-2 text-zinc-900 font-bold text-xs uppercase tracking-wider">
                <Briefcase className="h-4 w-4 text-zinc-700" /> Confirmed Drive Specifications
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  label="Confirmed Drive Date *"
                  type="date"
                  value={driveDate}
                  onChange={(e) => setDriveDate(e.target.value)}
                  required
                />

                <Select
                  label="Drive Mode"
                  value={driveMode}
                  onChange={(e) => setDriveMode(e.target.value as DriveMode)}
                  options={[
                    { label: 'On Campus', value: 'on_campus' },
                    { label: 'Virtual', value: 'virtual' },
                    { label: 'Pooled', value: 'pooled' },
                  ]}
                />

                <Input
                  label="Job Location"
                  placeholder="e.g. Chennai / Bangalore"
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                />

                <Input
                  label="HR Contact Person"
                  placeholder="e.g. Senthil Kumar (Talent Acquisition Lead)"
                  value={contactPersonName}
                  onChange={(e) => setContactPersonName(e.target.value)}
                />
              </div>
            </div>

            {/* MULTI-ROLE POSITIONS MANAGER */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                <div className="flex items-center gap-2 text-zinc-900 font-bold text-xs uppercase tracking-wider">
                  <Layers className="h-4 w-4 text-zinc-700" /> Company Job Roles ({jobRoles.length} Configured)
                </div>
                <Button type="button" size="sm" variant="outline" onClick={handleAddJobRole} className="gap-1 bg-white">
                  <Plus className="h-3.5 w-3.5" /> Add Job Role
                </Button>
              </div>

              {/* Role Tabs Selector */}
              <div className="flex flex-wrap gap-2">
                {jobRoles.map((role, idx) => (
                  <button
                    key={role.role_id}
                    type="button"
                    onClick={() => setActiveRoleIndex(idx)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                      activeRoleIndex === idx
                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                        : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                    }`}
                  >
                    {role.role_title || `Role #${idx + 1}`}
                    {role.ctc_lpa ? ` (${role.ctc_lpa} LPA)` : ''}
                  </button>
                ))}
              </div>

              {/* Active Role Configuration Details */}
              {currentRole && (
                <div className="p-4 bg-white border border-zinc-200 rounded-lg space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                    <span className="text-xs font-bold text-zinc-900 uppercase">
                      Role #{activeRoleIndex + 1} Specifications
                    </span>
                    {jobRoles.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveJobRole(activeRoleIndex)}
                        className="text-red-600 border-red-200 hover:bg-red-50 gap-1 h-7 text-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove Role
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Input
                      label="Job Role / Position Title *"
                      placeholder="e.g. Software Development Engineer"
                      value={currentRole.role_title}
                      onChange={(e) => handleUpdateRoleField(activeRoleIndex, { role_title: e.target.value })}
                      required
                    />

                    <Input
                      label="CTC (LPA) *"
                      type="number"
                      step="0.1"
                      placeholder="e.g. 8.5"
                      value={currentRole.ctc_lpa?.toString() || ''}
                      onChange={(e) => handleUpdateRoleField(activeRoleIndex, { ctc_lpa: parseFloat(e.target.value) || 0 })}
                      required
                    />

                    <Input
                      label="Base Package (LPA)"
                      type="number"
                      step="0.1"
                      placeholder="e.g. 7.5"
                      value={currentRole.base_lpa?.toString() || ''}
                      onChange={(e) => handleUpdateRoleField(activeRoleIndex, { base_lpa: parseFloat(e.target.value) || 0 })}
                    />

                    <Input
                      label="Expected Vacancies"
                      type="number"
                      placeholder="e.g. 10"
                      value={currentRole.vacancies?.toString() || ''}
                      onChange={(e) => handleUpdateRoleField(activeRoleIndex, { vacancies: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  {/* Cutoff Criteria */}
                  <div className="space-y-3 pt-2">
                    <h5 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                      Eligibility Cutoff Criteria for "{currentRole.role_title || 'Role'}"
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Input
                        label="Min UG CGPA"
                        type="number"
                        step="0.1"
                        placeholder="e.g. 6.5"
                        value={currentRole.eligibility_criteria?.min_cgpa?.toString() || ''}
                        onChange={(e) => handleUpdateCriteriaField(activeRoleIndex, 'min_cgpa', parseFloat(e.target.value) || 0)}
                      />

                      <Input
                        label="Max Backlogs"
                        type="number"
                        placeholder="e.g. 1"
                        value={currentRole.eligibility_criteria?.max_backlogs?.toString() || ''}
                        onChange={(e) => handleUpdateCriteriaField(activeRoleIndex, 'max_backlogs', parseInt(e.target.value) || 0)}
                      />

                      <Input
                        label="Min 10th %"
                        type="number"
                        placeholder="e.g. 60"
                        value={currentRole.eligibility_criteria?.min_10th_pct?.toString() || ''}
                        onChange={(e) => handleUpdateCriteriaField(activeRoleIndex, 'min_10th_pct', parseFloat(e.target.value) || 0)}
                      />

                      <Input
                        label="Min 12th %"
                        type="number"
                        placeholder="e.g. 60"
                        value={currentRole.eligibility_criteria?.min_12th_pct?.toString() || ''}
                        onChange={(e) => handleUpdateCriteriaField(activeRoleIndex, 'min_12th_pct', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    {/* Eligible Student Batches */}
                    <div className="space-y-1.5 pt-2">
                      <label className="text-xs font-semibold text-zinc-900 block">Eligible Student Batches</label>
                      <div className="flex flex-wrap gap-4 p-3 bg-zinc-50 border border-zinc-200 rounded-md">
                        {(['T', 'O', 'S', 'A', 'X'] as StudentBatch[]).map((batch) => {
                          const isChecked = (currentRole.eligibility_criteria?.allowed_batches || ['T', 'O', 'S', 'A', 'X']).includes(batch);
                          return (
                            <label key={batch} className="flex items-center gap-2 text-xs font-bold text-zinc-800 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleBatchToggle(activeRoleIndex, batch)}
                                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                              />
                              <span>Batch {batch}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Eligible Departments */}
                    <div className="space-y-1.5 pt-2">
                      <label className="text-xs font-semibold text-zinc-900 block">Eligible Departments</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-md">
                        {DEPARTMENTS_LIST.map((dept) => {
                          const isChecked = (currentRole.eligible_departments || []).includes(dept);
                          return (
                            <label key={dept} className="flex items-center gap-2 text-xs text-zinc-800 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleDeptToggle(activeRoleIndex, dept)}
                                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                              />
                              <span>{dept}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* JD Text & File Upload */}
                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-semibold text-zinc-900 block">
                        Job Description (JD Text / Extract)
                      </label>
                      <textarea
                        rows={3}
                        value={currentRole.jd_text || ''}
                        onChange={(e) => handleUpdateRoleField(activeRoleIndex, { jd_text: e.target.value })}
                        placeholder="Key responsibilities, required technical skills, selection process..."
                        className="w-full p-2.5 text-xs rounded-md border border-zinc-300 bg-white focus:ring-2 focus:ring-zinc-900 font-mono"
                      />

                      <div className="flex items-center gap-3 pt-1">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-xs font-semibold text-zinc-800 hover:bg-zinc-50 shadow-xs">
                          <Plus className="h-3.5 w-3.5" />
                          <span>{uploadingJd ? 'Uploading JD...' : 'Upload JD File'}</span>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={(e) => handleFileUpload(activeRoleIndex, e.target.files)}
                            disabled={uploadingJd}
                            className="hidden"
                          />
                        </label>

                        {currentRole.jd_files && currentRole.jd_files.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {currentRole.jd_files.map((file, fileIdx) => (
                              <span key={fileIdx} className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 border border-zinc-300 rounded text-[11px] font-mono text-zinc-800">
                                {file.split('/').pop()}
                                <button type="button" onClick={() => handleRemoveJdFile(activeRoleIndex, fileIdx)} className="text-red-500 hover:text-red-700">
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transition Audit Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-900 block flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5 text-zinc-700" />
            Stage Promotion Remarks & Discussion Notes *
          </label>
          <textarea
            rows={3}
            value={transitionNotes}
            onChange={(e) => setTransitionNotes(e.target.value)}
            placeholder={`Log notes for promoting to ${stageLabels[targetStage]} (e.g. Confirmed date with HR, finalized CTC packages & role specifications)...`}
            className="w-full p-2.5 text-xs rounded-md border border-zinc-300 bg-white focus:ring-2 focus:ring-zinc-900"
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="gap-1.5 bg-zinc-900 text-white">
            <CheckCircle className="h-4 w-4" />
            <span>{saving ? 'Promoting Stage...' : `Save & Promote to ${stageLabels[targetStage]}`}</span>
          </Button>
        </div>
      </form>
    </Card>
  );
};
