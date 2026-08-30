import React, { useState, useEffect } from 'react';
import { Profile, UserRole } from '../../types/database';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { X } from 'lucide-react';

interface UserInlineFormProps {
  onClose: () => void;
  onSave: (user: Partial<Profile> & { name: string; email: string; role: UserRole; password?: string }) => Promise<void>;
  userProfile?: Profile | null;
}

const ROLES: { label: string; value: UserRole }[] = [
  { label: 'Super Admin (Full Platform Control)', value: 'super_admin' },
  { label: 'Placement Coordinator (Central Officer)', value: 'placement_coordinator' },
  { label: 'Department Coordinator (HOD / Faculty)', value: 'dept_coordinator' },
  { label: 'Data Entry Operator (Entry Staff)', value: 'data_entry' },
  { label: 'Report Viewer (Read-only Officer)', value: 'report_viewer' },
];

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Artificial Intelligence & Data Science',
  'Master of Computer Applications',
];

export const UserInlineForm: React.FC<UserInlineFormProps> = ({
  onClose,
  onSave,
  userProfile,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'dept_coordinator' as UserRole,
    department_scope: '',
    status: 'active' as 'active' | 'disabled',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        email: userProfile.email || '',
        password: '',
        role: userProfile.role || 'dept_coordinator',
        department_scope: userProfile.department_scope || '',
        status: userProfile.status || 'active',
      });
    }
  }, [userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        id: userProfile?.id,
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password || undefined,
        role: formData.role,
        department_scope: formData.role === 'dept_coordinator' ? formData.department_scope : undefined,
        status: formData.status,
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
            {userProfile ? 'Edit Staff Credentials' : 'Add New Staff User'}
          </h3>
          <p className="text-xs text-zinc-500">Configure role permissions, credentials, and department access boundaries</p>
        </div>
        <button onClick={onClose} className="p-1 rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Full Name *"
            placeholder="e.g. Dr. Rajesh Kumar"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Email Address *"
            type="email"
            placeholder="rajesh@rathinam.edu.in"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          {!userProfile && (
            <Input
              label="Account Password *"
              type="password"
              placeholder="Set account password (min 6 characters)"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
            />
          )}

          <Select
            label="System Role *"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
            options={ROLES}
          />

          {formData.role === 'dept_coordinator' && (
            <Select
              label="Assigned Department Scope *"
              value={formData.department_scope}
              onChange={(e) => setFormData({ ...formData, department_scope: e.target.value })}
              options={[
                { label: 'Select Department...', value: '' },
                ...DEPARTMENTS.map((d) => ({ label: d, value: d })),
              ]}
              required
            />
          )}

          <Select
            label="Account Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'disabled' })}
            options={[
              { label: 'Active Account', value: 'active' },
              { label: 'Disabled Account', value: 'disabled' },
            ]}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : userProfile ? 'Update User Account' : 'Create User Account'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
