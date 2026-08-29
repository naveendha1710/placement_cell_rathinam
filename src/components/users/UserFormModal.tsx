import React, { useState, useEffect } from 'react';
import { Profile, UserRole, UserStatus } from '../../types/database';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profileData: Partial<Profile> & { name: string; email: string; role: UserRole }) => Promise<void>;
  userProfile?: Profile | null;
}

const ROLES_OPTIONS = [
  { label: 'Super Admin', value: 'super_admin' },
  { label: 'Placement Coordinator', value: 'placement_coordinator' },
  { label: 'Department Coordinator', value: 'dept_coordinator' },
  { label: 'Data Entry Staff', value: 'data_entry' },
  { label: 'Report Viewer (Auditor)', value: 'report_viewer' },
];

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
];

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  userProfile,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'dept_coordinator' as UserRole,
    department_scope: DEPARTMENTS[0],
    status: 'active' as UserStatus,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        email: userProfile.email || '',
        role: userProfile.role || 'dept_coordinator',
        department_scope: userProfile.department_scope || DEPARTMENTS[0],
        status: userProfile.status || 'active',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'dept_coordinator',
        department_scope: DEPARTMENTS[0],
        status: 'active',
      });
    }
  }, [userProfile, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        id: userProfile?.id || `user-${Date.now().toString(36)}`,
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        department_scope: formData.role === 'dept_coordinator' ? formData.department_scope : null,
        status: formData.status,
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
      title={userProfile ? 'Edit Staff User Profile' : 'Add New Staff User'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name *"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <Input
          label="Email Address *"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          disabled={!!userProfile}
        />

        <Select
          label="Assigned System Role *"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
          options={ROLES_OPTIONS}
        />

        {formData.role === 'dept_coordinator' && (
          <Select
            label="Department Scope *"
            value={formData.department_scope}
            onChange={(e) => setFormData({ ...formData, department_scope: e.target.value })}
            options={DEPARTMENTS.map(d => ({ label: d, value: d }))}
          />
        )}

        <Select
          label="Account Status"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
          options={[
            { label: 'Active', value: 'active' },
            { label: 'Disabled', value: 'disabled' },
          ]}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : userProfile ? 'Update User' : 'Create User'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
