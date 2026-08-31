import React, { useState, useEffect } from 'react';
import { Student, PlacementStatus, ResidencyType, PGStatus } from '../../types/database';
import { DataStore } from '../../lib/store';
import { extractFromUrl } from '../../utils/documentExtractor';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Partial<Student> & { name: string; roll_number: string; email: string; department: string }) => Promise<void>;
  student?: Student | null;
}

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Artificial Intelligence & Data Science',
  'Master of Computer Applications',
];

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  student,
}) => {
  const [formData, setFormData] = useState({
    roll_number: '',
    name: '',
    department: DEPARTMENTS[0],
    gender: 'Male',
    residency: 'day_scholar' as ResidencyType,
    sslc_percentage: '',
    hsc_percentage: '',
    ug_cgpa: '',
    ug_percentage: '',
    pg_cgpa: '',
    pg_status: 'not_applicable' as PGStatus,
    ug_graduation_year: '2026',
    pg_graduation_year: '',
    email: '',
    mobile_number: '',
    backlogs_count: '0',
    placement_status: 'yet_to_be_placed' as PlacementStatus,
    github_url: '',
    linkedin_url: '',
    portfolio_url: '',
    resume_file: '',
    resume_link: '',
    resume_extracted_text: '',
    video_intro_link: '',
    photo_file: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setFormData({
        roll_number: student.roll_number || '',
        name: student.name || '',
        department: student.department || DEPARTMENTS[0],
        gender: student.gender || 'Male',
        residency: (student.residency as ResidencyType) || 'day_scholar',
        sslc_percentage: student.sslc_percentage?.toString() || '',
        hsc_percentage: student.hsc_percentage?.toString() || '',
        ug_cgpa: student.ug_cgpa?.toString() || '',
        ug_percentage: student.ug_percentage?.toString() || '',
        pg_cgpa: student.pg_cgpa?.toString() || '',
        pg_status: student.pg_status || 'not_applicable',
        ug_graduation_year: student.ug_graduation_year?.toString() || '2026',
        pg_graduation_year: student.pg_graduation_year?.toString() || '',
        email: student.email || '',
        mobile_number: student.mobile_number || '',
        backlogs_count: student.backlogs_count?.toString() || '0',
        placement_status: student.placement_status || 'yet_to_be_placed',
        github_url: student.github_url || '',
        linkedin_url: student.linkedin_url || '',
        portfolio_url: student.portfolio_url || '',
        resume_file: student.resume_file || '',
        resume_link: student.resume_link || '',
        resume_extracted_text: student.resume_extracted_text || '',
        video_intro_link: student.video_intro_link || '',
        photo_file: student.photo_file || '',
      });
    } else {
      setFormData({
        roll_number: '',
        name: '',
        department: DEPARTMENTS[0],
        gender: 'Male',
        residency: 'day_scholar',
        sslc_percentage: '',
        hsc_percentage: '',
        ug_cgpa: '',
        ug_percentage: '',
        pg_cgpa: '',
        pg_status: 'not_applicable',
        ug_graduation_year: '2026',
        pg_graduation_year: '',
        email: '',
        mobile_number: '',
        backlogs_count: '0',
        placement_status: 'yet_to_be_placed',
        github_url: '',
        linkedin_url: '',
        portfolio_url: '',
        resume_file: '',
        resume_link: '',
        resume_extracted_text: '',
        video_intro_link: '',
        photo_file: '',
      });
    }
  }, [student, isOpen]);

  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [extractingResume, setExtractingResume] = useState(false);

  const handleExtractFromLink = async () => {
    const link = formData.resume_link?.trim();
    if (!link) return;
    setExtractingResume(true);
    try {
      const text = await extractFromUrl(link);
      setFormData(prev => ({ ...prev, resume_extracted_text: text }));
    } catch (err: any) {
      alert(`Failed to extract text from resume link: ${err.message || 'Error fetching file'}`);
    } finally {
      setExtractingResume(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingResume(true);
    try {
      const fileName = `${formData.roll_number || Date.now()}_resume_${file.name}`;
      const path = await DataStore.uploadFile('student_files', fileName, file);
      setFormData(prev => ({ ...prev, resume_file: path }));
    } catch (err) {
      console.error(err);
      alert('Failed to upload resume to student_files bucket.');
    } finally {
      setUploadingResume(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fileName = `${formData.roll_number || Date.now()}_photo_${file.name}`;
      const path = await DataStore.uploadFile('student_files', fileName, file);
      setFormData(prev => ({ ...prev, photo_file: path }));
    } catch (err) {
      console.error(err);
      alert('Failed to upload photo to student_files bucket.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        student_id: student?.student_id,
        roll_number: formData.roll_number.trim(),
        name: formData.name.trim(),
        department: formData.department,
        gender: formData.gender,
        residency: formData.residency,
        sslc_percentage: formData.sslc_percentage ? parseFloat(formData.sslc_percentage) : null,
        hsc_percentage: formData.hsc_percentage ? parseFloat(formData.hsc_percentage) : null,
        ug_cgpa: formData.ug_cgpa ? parseFloat(formData.ug_cgpa) : null,
        ug_percentage: formData.ug_percentage ? parseFloat(formData.ug_percentage) : null,
        pg_cgpa: formData.pg_cgpa ? parseFloat(formData.pg_cgpa) : null,
        pg_status: formData.pg_status,
        ug_graduation_year: formData.ug_graduation_year ? parseInt(formData.ug_graduation_year) : null,
        pg_graduation_year: formData.pg_graduation_year ? parseInt(formData.pg_graduation_year) : null,
        email: formData.email.trim(),
        mobile_number: formData.mobile_number.trim(),
        backlogs_count: parseInt(formData.backlogs_count) || 0,
        placement_status: formData.placement_status,
        github_url: formData.github_url.trim(),
        linkedin_url: formData.linkedin_url.trim(),
        portfolio_url: formData.portfolio_url.trim(),
        resume_file: formData.resume_file.trim(),
        resume_link: formData.resume_link.trim(),
        resume_extracted_text: formData.resume_extracted_text || null,
        video_intro_link: formData.video_intro_link.trim(),
        photo_file: formData.photo_file.trim(),
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
      title={student ? 'Edit Student Profile' : 'Add New Student Profile'}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Personal & Contact Details */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider border-b pb-1">
            1. Basic & Contact Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Roll Number *"
              placeholder="e.g. 714021104001"
              value={formData.roll_number}
              onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
              required
            />
            <Input
              label="Full Name *"
              placeholder="e.g. Aarav Sharma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Select
              label="Department *"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              options={DEPARTMENTS.map(d => ({ label: d, value: d }))}
            />

            <Input
              label="Email Address *"
              type="email"
              placeholder="aarav@rathinam.edu.in"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              label="Mobile Number"
              placeholder="+91 9876543210"
              value={formData.mobile_number}
              onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
            />
            <Select
              label="Gender"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              options={[
                { label: 'Male', value: 'Male' },
                { label: 'Female', value: 'Female' },
                { label: 'Other', value: 'Other' },
              ]}
            />

            <Select
              label="Residency Status"
              value={formData.residency}
              onChange={(e) => setFormData({ ...formData, residency: e.target.value as ResidencyType })}
              options={[
                { label: 'Day Scholar', value: 'day_scholar' },
                { label: 'Hosteller', value: 'hosteller' },
              ]}
            />
            <Select
              label="Placement Status"
              value={formData.placement_status}
              onChange={(e) => setFormData({ ...formData, placement_status: e.target.value as PlacementStatus })}
              options={[
                { label: 'Yet to be Placed', value: 'yet_to_be_placed' },
                { label: 'Placed', value: 'placed' },
                { label: 'Opted Out', value: 'opted_out' },
              ]}
            />
            <Input
              label="Active Backlogs Count"
              type="number"
              min="0"
              value={formData.backlogs_count}
              onChange={(e) => setFormData({ ...formData, backlogs_count: e.target.value })}
            />
          </div>
        </div>

        {/* Section 2: School & UG Academic Metrics */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider border-b pb-1">
            2. Undergraduate & School Academic Metrics
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="SSLC (10th) %"
              type="number"
              step="0.1"
              max="100"
              placeholder="e.g. 92.5"
              value={formData.sslc_percentage}
              onChange={(e) => setFormData({ ...formData, sslc_percentage: e.target.value })}
            />
            <Input
              label="HSC (12th / Diploma) %"
              type="number"
              step="0.1"
              max="100"
              placeholder="e.g. 89.0"
              value={formData.hsc_percentage}
              onChange={(e) => setFormData({ ...formData, hsc_percentage: e.target.value })}
            />
            <Input
              label="UG CGPA (Scale 10.0)"
              type="number"
              step="0.01"
              max="10"
              placeholder="e.g. 8.75"
              value={formData.ug_cgpa}
              onChange={(e) => setFormData({ ...formData, ug_cgpa: e.target.value })}
            />

            <Input
              label="UG Percentage (%)"
              type="number"
              step="0.1"
              max="100"
              placeholder="e.g. 87.5"
              value={formData.ug_percentage}
              onChange={(e) => setFormData({ ...formData, ug_percentage: e.target.value })}
            />
            <Input
              label="UG Graduation Year"
              type="number"
              placeholder="e.g. 2026"
              value={formData.ug_graduation_year}
              onChange={(e) => setFormData({ ...formData, ug_graduation_year: e.target.value })}
            />
          </div>
        </div>

        {/* Section 3: Postgraduate (PG) Details */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider border-b pb-1">
            3. Postgraduate (PG) Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="PG Status"
              value={formData.pg_status}
              onChange={(e) => setFormData({ ...formData, pg_status: e.target.value as PGStatus })}
              options={[
                { label: 'Not Applicable (N/A)', value: 'not_applicable' },
                { label: 'Pursuing', value: 'pursuing' },
                { label: 'Completed', value: 'completed' },
              ]}
            />
            {formData.pg_status !== 'not_applicable' && (
              <>
                <Input
                  label="PG CGPA"
                  type="number"
                  step="0.01"
                  max="10"
                  placeholder="e.g. 8.5"
                  value={formData.pg_cgpa}
                  onChange={(e) => setFormData({ ...formData, pg_cgpa: e.target.value })}
                />
                <Input
                  label="PG Graduation Year"
                  type="number"
                  placeholder="e.g. 2026"
                  value={formData.pg_graduation_year}
                  onChange={(e) => setFormData({ ...formData, pg_graduation_year: e.target.value })}
                />
              </>
            )}
          </div>
        </div>

        {/* Section 4: Links & File References */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider border-b pb-1">
            4. Social Profiles, Portfolio & Files
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="LinkedIn URL"
              placeholder="https://linkedin.com/in/username"
              value={formData.linkedin_url}
              onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
            />
            <Input
              label="GitHub URL"
              placeholder="https://github.com/username"
              value={formData.github_url}
              onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
            />
            <Input
              label="Portfolio URL"
              placeholder="https://portfolio.me"
              value={formData.portfolio_url}
              onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
            />

            <Input
              label="Video Intro Link"
              placeholder="https://youtube.com/watch?v=..."
              value={formData.video_intro_link}
              onChange={(e) => setFormData({ ...formData, video_intro_link: e.target.value })}
            />

            <div>
              <label className="text-xs font-medium text-zinc-700 block mb-1">
                Resume Link (Google Drive / Direct URL)
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://drive.google.com/file/d/... or share link"
                  value={formData.resume_link || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, resume_link: e.target.value }))}
                  className="font-mono text-xs flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExtractFromLink}
                  disabled={!formData.resume_link?.trim() || extractingResume}
                  className="shrink-0 text-xs bg-white"
                >
                  {extractingResume ? 'Extracting...' : 'Verify & Extract'}
                </Button>
              </div>
              {formData.resume_extracted_text && (
                <p className="text-[11px] text-emerald-700 font-medium mt-1">
                  ✓ Resume text extracted ({formData.resume_extracted_text.length} chars)
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-700 block mb-1">
                Upload Student Photo → <span className="font-bold text-zinc-900">student_files</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
                className="block w-full text-xs text-zinc-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-zinc-800 cursor-pointer"
              />
              {uploadingPhoto && <p className="text-[11px] text-zinc-500 mt-1">Uploading photo to student_files...</p>}
              {formData.photo_file && (
                <p className="text-[11px] text-emerald-700 font-medium mt-1 truncate">
                  ✓ {formData.photo_file}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : student ? 'Update Student Profile' : 'Create Student Profile'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
