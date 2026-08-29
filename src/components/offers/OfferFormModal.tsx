import React, { useState, useEffect } from 'react';
import { Offer, Company, DriveMode, OfferDriveStatus } from '../../types/database';
import { DataStore } from '../../lib/store';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface OfferFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (offer: Partial<Offer> & { company_id: string }) => Promise<void>;
  offer?: Offer | null;
  preselectedCompanyId?: string;
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

export const OfferFormModal: React.FC<OfferFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  offer,
  preselectedCompanyId,
}) => {
  const [approvedCompanies, setApprovedCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [uploadingJd, setUploadingJd] = useState(false);

  const [formData, setFormData] = useState({
    company_id: preselectedCompanyId || '',
    jd_text: '',
    jd_files: [] as string[],
    ctc_lpa: '',
    base_lpa: '',
    job_location: '',
    drive_date: '',
    drive_mode: 'on_campus' as DriveMode,
    status: 'scheduled' as OfferDriveStatus,
    eligible_departments: ['Computer Science', 'Information Technology'],
    min_cgpa: '6.0',
    max_backlogs: '1',
    min_10th_pct: '70',
    min_12th_pct: '70',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadCompanies() {
      setLoadingCompanies(true);
      try {
        const companies = await DataStore.getCompanies();
        const approved = companies.filter(c => c.approval_status === 'approved');
        setApprovedCompanies(approved);

        if (!offer && approved.length > 0) {
          setFormData(prev => ({ ...prev, company_id: preselectedCompanyId || approved[0].company_id }));
        }
      } finally {
        setLoadingCompanies(false);
      }
    }
    if (isOpen) {
      loadCompanies();
    }
  }, [isOpen, offer, preselectedCompanyId]);

  useEffect(() => {
    if (offer) {
      setFormData({
        company_id: offer.company_id || '',
        jd_text: offer.jd_text || '',
        jd_files: offer.jd_files || [],
        ctc_lpa: offer.ctc_lpa?.toString() || '',
        base_lpa: offer.base_lpa?.toString() || '',
        job_location: offer.job_location || '',
        drive_date: offer.drive_date || '',
        drive_mode: offer.drive_mode || 'on_campus',
        status: offer.status || 'scheduled',
        eligible_departments: offer.eligible_departments || ['Computer Science'],
        min_cgpa: offer.eligibility_criteria?.min_cgpa?.toString() || '6.0',
        max_backlogs: offer.eligibility_criteria?.max_backlogs?.toString() || '1',
        min_10th_pct: offer.eligibility_criteria?.min_10th_pct?.toString() || '70',
        min_12th_pct: offer.eligibility_criteria?.min_12th_pct?.toString() || '70',
      });
    } else {
      setFormData({
        company_id: preselectedCompanyId || approvedCompanies[0]?.company_id || '',
        jd_text: '',
        jd_files: [],
        ctc_lpa: '',
        base_lpa: '',
        job_location: '',
        drive_date: '',
        drive_mode: 'on_campus',
        status: 'scheduled',
        eligible_departments: ['Computer Science', 'Information Technology'],
        min_cgpa: '6.0',
        max_backlogs: '1',
        min_10th_pct: '70',
        min_12th_pct: '70',
      });
    }
  }, [offer, isOpen]);

  const handleDeptToggle = (dept: string) => {
    setFormData(prev => {
      const exists = prev.eligible_departments.includes(dept);
      return {
        ...prev,
        eligible_departments: exists
          ? prev.eligible_departments.filter(d => d !== dept)
          : [...prev.eligible_departments, dept],
      };
    });
  };

  const handleJdFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingJd(true);
    try {
      const fileName = `jd_${Date.now()}_${file.name}`;
      const path = await DataStore.uploadFile('student_files', fileName, file);
      setFormData(prev => ({
        ...prev,
        jd_files: [...prev.jd_files, path],
      }));
    } catch (err) {
      console.error(err);
      alert('Failed to upload JD document to student_files bucket.');
    } finally {
      setUploadingJd(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_id) {
      alert('Please select an approved company.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        offer_id: offer?.offer_id,
        company_id: formData.company_id,
        jd_text: formData.jd_text.trim(),
        jd_files: formData.jd_files,
        ctc_lpa: formData.ctc_lpa ? parseFloat(formData.ctc_lpa) : null,
        base_lpa: formData.base_lpa ? parseFloat(formData.base_lpa) : null,
        job_location: formData.job_location.trim(),
        drive_date: formData.drive_date || null,
        drive_mode: formData.drive_mode,
        status: formData.status,
        eligible_departments: formData.eligible_departments,
        eligibility_criteria: {
          min_cgpa: formData.min_cgpa ? parseFloat(formData.min_cgpa) : undefined,
          max_backlogs: formData.max_backlogs ? parseInt(formData.max_backlogs) : undefined,
          min_10th_pct: formData.min_10th_pct ? parseFloat(formData.min_10th_pct) : undefined,
          min_12th_pct: formData.min_12th_pct ? parseFloat(formData.min_12th_pct) : undefined,
        },
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={offer ? 'Edit Job Offer Details' : 'Create New Job Offer'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Picker */}
        <div>
          <label className="text-xs font-semibold text-zinc-900 block mb-1">
            Target Company * <span className="text-zinc-500 font-normal">(Only Approved Companies Shown)</span>
          </label>
          {loadingCompanies ? (
            <p className="text-xs text-zinc-500">Loading approved companies...</p>
          ) : approvedCompanies.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded text-xs">
              No approved companies found. Please approve a company before creating an offer.
            </div>
          ) : (
            <select
              value={formData.company_id}
              onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
              className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm text-zinc-900 focus:ring-2 focus:ring-zinc-900"
              required
            >
              {approvedCompanies.map((c) => (
                <option key={c.company_id} value={c.company_id}>
                  {c.name} ({c.industry_domain || 'General'})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Financial & Location Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="CTC (LPA) *"
            type="number"
            step="0.1"
            placeholder="e.g. 8.5"
            value={formData.ctc_lpa}
            onChange={(e) => setFormData({ ...formData, ctc_lpa: e.target.value })}
            required
          />

          <Input
            label="Base Package (LPA)"
            type="number"
            step="0.1"
            placeholder="e.g. 7.5"
            value={formData.base_lpa}
            onChange={(e) => setFormData({ ...formData, base_lpa: e.target.value })}
          />

          <Input
            label="Job Location"
            placeholder="e.g. Chennai / Bangalore"
            value={formData.job_location}
            onChange={(e) => setFormData({ ...formData, job_location: e.target.value })}
          />

          <Input
            label="Drive Date"
            type="date"
            value={formData.drive_date}
            onChange={(e) => setFormData({ ...formData, drive_date: e.target.value })}
          />

          <Select
            label="Drive Mode"
            value={formData.drive_mode}
            onChange={(e) => setFormData({ ...formData, drive_mode: e.target.value as DriveMode })}
            options={[
              { label: 'On Campus', value: 'on_campus' },
              { label: 'Virtual / Remote', value: 'virtual' },
              { label: 'Pooled Drive', value: 'pooled' },
            ]}
          />

          <Select
            label="Drive Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as OfferDriveStatus })}
            options={[
              { label: 'Scheduled', value: 'scheduled' },
              { label: 'Ongoing', value: 'ongoing' },
              { label: 'Completed', value: 'completed' },
              { label: 'Cancelled', value: 'cancelled' },
            ]}
          />
        </div>

        {/* Eligibility Criteria JSONB fields */}
        <div className="space-y-2 pt-2 border-t border-zinc-100">
          <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
            Eligibility Cutoff Criteria (JSONB)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label="Min UG CGPA"
              type="number"
              step="0.1"
              value={formData.min_cgpa}
              onChange={(e) => setFormData({ ...formData, min_cgpa: e.target.value })}
            />
            <Input
              label="Max Backlogs"
              type="number"
              value={formData.max_backlogs}
              onChange={(e) => setFormData({ ...formData, max_backlogs: e.target.value })}
            />
            <Input
              label="Min 10th (SSLC) %"
              type="number"
              step="0.1"
              value={formData.min_10th_pct}
              onChange={(e) => setFormData({ ...formData, min_10th_pct: e.target.value })}
            />
            <Input
              label="Min 12th (HSC) %"
              type="number"
              step="0.1"
              value={formData.min_12th_pct}
              onChange={(e) => setFormData({ ...formData, min_12th_pct: e.target.value })}
            />
          </div>
        </div>

        {/* Eligible Departments */}
        <div className="pt-2 border-t border-zinc-100">
          <label className="text-xs font-semibold text-zinc-900 block mb-1">
            Eligible Departments
          </label>
          <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
            {DEPARTMENTS_LIST.map((dept) => (
              <label key={dept} className="flex items-center gap-2 text-xs text-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.eligible_departments.includes(dept)}
                  onChange={() => handleDeptToggle(dept)}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <span>{dept}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Job Description & Attachments */}
        <div className="space-y-3 pt-2 border-t border-zinc-100">
          <div>
            <label className="text-xs font-semibold text-zinc-900 block mb-1">
              Job Description (Extracted / Summary Text)
            </label>
            <textarea
              rows={3}
              value={formData.jd_text}
              onChange={(e) => setFormData({ ...formData, jd_text: e.target.value })}
              placeholder="Key responsibilities, technical requirements, bond details..."
              className="w-full p-2 text-xs rounded-md border border-zinc-300 bg-white focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-900 block mb-1">
              Upload Original JD File Document → <span className="font-bold">student_files</span>
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleJdFileUpload}
              disabled={uploadingJd}
              className="block w-full text-xs text-zinc-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-zinc-800 cursor-pointer"
            />
            {uploadingJd && <p className="text-[11px] text-zinc-500 mt-1">Uploading JD file...</p>}
            {formData.jd_files.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-[11px] font-bold text-zinc-700">Uploaded JD Documents:</p>
                {formData.jd_files.map((file, idx) => (
                  <p key={idx} className="text-[11px] text-emerald-700 font-medium truncate">
                    ✓ {file}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || approvedCompanies.length === 0}>
            {saving ? 'Saving...' : offer ? 'Update Job Offer' : 'Create Job Offer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
