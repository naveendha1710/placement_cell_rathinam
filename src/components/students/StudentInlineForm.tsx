import React, { useState, useEffect } from 'react';
import { Student, PlacementStatus, ResidencyType, PGStatus, StudentBatch } from '../../types/database';
import { DataStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { X } from 'lucide-react';

interface StudentInlineFormProps {
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

export const StudentInlineForm: React.FC<StudentInlineFormProps> = ({
  onClose,
  onSave,
  student,
}) => {
  const { role, departmentScope } = useAuth();
  const defaultDept = (role === 'dept_coordinator' && departmentScope) ? departmentScope : DEPARTMENTS[0];

  const [formData, setFormData] = useState({
    roll_number: '',
    name: '',
    department: defaultDept,
    gender: 'Male',
    residency: 'day_scholar' as ResidencyType,
    batch: 'A' as StudentBatch,
    source: '',
    sslc_percentage: '',
    hsc_percentage: '',
    ug_cgpa: '',
    ug_percentage: '',
    pg_cgpa: '',
    pg_percentage: '',
    pg_status: 'not_applicable' as PGStatus,
    ug_graduation_year: '2026',
    pg_graduation_year: '',
    graduation_date: '',
    email: '',
    personal_email: '',
    mobile_number: '',
    backlogs_count: '0',
    placement_status: 'yet_to_be_placed' as PlacementStatus,
    github_url: '',
    linkedin_url: '',
    portfolio_url: '',
    resume_file: '',
    video_intro_link: '',
    photo_file: '',
  });

  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (student) {
      setFormData({
        roll_number: student.roll_number || '',
        name: student.name || '',
        department: (role === 'dept_coordinator' && departmentScope) ? departmentScope : (student.department || DEPARTMENTS[0]),
        gender: student.gender || 'Male',
        residency: (student.residency as ResidencyType) || 'day_scholar',
        batch: (student.batch as StudentBatch) || 'A',
        source: student.source || '',
        sslc_percentage: student.sslc_percentage?.toString() || '',
        hsc_percentage: student.hsc_percentage?.toString() || '',
        ug_cgpa: student.ug_cgpa?.toString() || '',
        ug_percentage: student.ug_percentage?.toString() || '',
        pg_cgpa: student.pg_cgpa?.toString() || '',
        pg_percentage: student.pg_percentage?.toString() || '',
        pg_status: student.pg_status || 'not_applicable',
        ug_graduation_year: student.ug_graduation_year?.toString() || '2026',
        pg_graduation_year: student.pg_graduation_year?.toString() || '',
        graduation_date: student.graduation_date || '',
        email: student.email || '',
        personal_email: student.personal_email || '',
        mobile_number: student.mobile_number || '',
        backlogs_count: student.backlogs_count?.toString() || '0',
        placement_status: student.placement_status || 'yet_to_be_placed',
        github_url: student.github_url || '',
        linkedin_url: student.linkedin_url || '',
        portfolio_url: student.portfolio_url || '',
        resume_file: student.resume_file || '',
        video_intro_link: student.video_intro_link || '',
        photo_file: student.photo_file || '',
      });
    }
  }, [student]);

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
      alert('Failed to upload resume.');
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
      alert('Failed to upload photo.');
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
        batch: formData.batch,
        source: formData.source.trim(),
        sslc_percentage: formData.sslc_percentage ? parseFloat(formData.sslc_percentage) : null,
        hsc_percentage: formData.hsc_percentage ? parseFloat(formData.hsc_percentage) : null,
        ug_cgpa: formData.ug_cgpa ? parseFloat(formData.ug_cgpa) : null,
        ug_percentage: formData.ug_percentage ? parseFloat(formData.ug_percentage) : null,
        pg_cgpa: formData.pg_cgpa ? parseFloat(formData.pg_cgpa) : null,
        pg_percentage: formData.pg_percentage ? parseFloat(formData.pg_percentage) : null,
        pg_status: formData.pg_status,
        ug_graduation_year: formData.ug_graduation_year ? parseInt(formData.ug_graduation_year) : null,
        pg_graduation_year: formData.pg_graduation_year ? parseInt(formData.pg_graduation_year) : null,
        graduation_date: formData.graduation_date.trim(),
        email: formData.email.trim(),
        personal_email: formData.personal_email.trim(),
        mobile_number: formData.mobile_number.trim(),
        backlogs_count: parseInt(formData.backlogs_count) || 0,
        placement_status: formData.placement_status,
        github_url: formData.github_url.trim(),
        linkedin_url: formData.linkedin_url.trim(),
        portfolio_url: formData.portfolio_url.trim(),
        resume_file: formData.resume_file.trim(),
        video_intro_link: formData.video_intro_link.trim(),
        photo_file: formData.photo_file.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-2 border-zinc-900 bg-white p-6 shadow-md transition-all animate-in fade-in">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-zinc-900">
            {student ? 'Edit Student Profile (Inline Form)' : 'Add New Student Profile (Inline Form)'}
          </h3>
          <p className="text-xs text-zinc-500">Fill in student academic & contact credentials below</p>
        </div>
        <button onClick={onClose} className="p-1 rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1 */}
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
              disabled={role === 'dept_coordinator'}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              options={DEPARTMENTS.map(d => ({ label: d, value: d }))}
            />

            <Input
              label="College Email Address *"
              type="email"
              placeholder="aarav@rathinam.edu.in"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              label="Personal Email Address"
              type="email"
              placeholder="aarav.personal@gmail.com"
              value={formData.personal_email}
              onChange={(e) => setFormData({ ...formData, personal_email: e.target.value })}
            />
            <Input
              label="Mobile Number"
              placeholder="+91 9876543210"
              value={formData.mobile_number}
              onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
            />
            <Input
              label="Source Column / Channel"
              placeholder="e.g. Walk-in, Portal, Referral"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            />
            <Input
              label="Graduation Date"
              type="date"
              value={formData.graduation_date}
              onChange={(e) => setFormData({ ...formData, graduation_date: e.target.value })}
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
              label="Student Batch"
              value={formData.batch}
              onChange={(e) => setFormData({ ...formData, batch: e.target.value as StudentBatch })}
              options={[
                { label: 'Batch T', value: 'T' },
                { label: 'Batch O', value: 'O' },
                { label: 'Batch S', value: 'S' },
                { label: 'Batch A', value: 'A' },
                { label: 'Batch X', value: 'X' },
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

        {/* Section 2 */}
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

        {/* Section 3 */}
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

        {/* Section 4 */}
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
                Upload Resume → <span className="font-bold">student_files</span>
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleResumeUpload}
                disabled={uploadingResume}
                className="block w-full text-xs text-zinc-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 file:text-white cursor-pointer"
              />
              {formData.resume_file && <p className="text-[11px] text-emerald-700 font-medium mt-1 truncate">✓ {formData.resume_file}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-700 block mb-1">
                Upload Photo → <span className="font-bold">student_files</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
                className="block w-full text-xs text-zinc-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 file:text-white cursor-pointer"
              />
              {formData.photo_file && <p className="text-[11px] text-emerald-700 font-medium mt-1 truncate">✓ {formData.photo_file}</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : student ? 'Update Student Profile' : 'Save Student Profile'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
