import React, { useState, useEffect } from 'react';
import { Company, CompanyStatus } from '../../types/database';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { X } from 'lucide-react';

interface CompanyInlineFormProps {
  onClose: () => void;
  onSave: (company: Partial<Company> & { name: string }) => Promise<void>;
  company?: Company | null;
}

export const CompanyInlineForm: React.FC<CompanyInlineFormProps> = ({
  onClose,
  onSave,
  company,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    industry_domain: '',
    website_url: '',
    address: '',
    map_link: '',
    employee_count: '',
    star_rating: '3',
    status: 'active' as CompanyStatus,
    contact_person_name: '',
    contact_person_mobile: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        industry_domain: company.industry_domain || '',
        website_url: company.website_url || '',
        address: company.address || '',
        map_link: company.map_link || '',
        employee_count: company.employee_count?.toString() || '',
        star_rating: company.star_rating?.toString() || '3',
        status: company.status || 'active',
        contact_person_name: company.contact_person_name || '',
        contact_person_mobile: company.contact_person_mobile || '',
      });
    }
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        company_id: company?.company_id,
        name: formData.name.trim(),
        industry_domain: formData.industry_domain.trim(),
        website_url: formData.website_url.trim(),
        address: formData.address.trim(),
        map_link: formData.map_link.trim(),
        employee_count: formData.employee_count ? parseInt(formData.employee_count) : null,
        star_rating: parseInt(formData.star_rating) || 3,
        status: formData.status,
        approval_status: company?.approval_status || 'approved',
        approved_by: company?.approved_by || null,
        approved_at: company?.approved_at || null,
        rejection_reason: company?.rejection_reason || null,
        contact_person_name: formData.contact_person_name.trim(),
        contact_person_mobile: formData.contact_person_mobile.trim(),
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
            {company ? 'Edit Company Profile' : 'Add New Company Profile'}
          </h3>
          <p className="text-xs text-zinc-500">Fill in corporate credentials and contact info</p>
        </div>
        <button onClick={onClose} className="p-1 rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Company Name *"
          placeholder="e.g. Zoho Corporation"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Industry Domain"
            placeholder="e.g. IT Services, SaaS, Core"
            value={formData.industry_domain}
            onChange={(e) => setFormData({ ...formData, industry_domain: e.target.value })}
          />

          <Input
            label="Website URL"
            placeholder="https://company.com"
            value={formData.website_url}
            onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
          />

          <Input
            label="Employee Count"
            type="number"
            placeholder="e.g. 500"
            value={formData.employee_count}
            onChange={(e) => setFormData({ ...formData, employee_count: e.target.value })}
          />

          <Select
            label="Star Rating Tier (1-5)"
            value={formData.star_rating}
            onChange={(e) => setFormData({ ...formData, star_rating: e.target.value })}
            options={[
              { label: '5 Stars ★★★★★ (Super Dream)', value: '5' },
              { label: '4 Stars ★★★★☆ (Dream)', value: '4' },
              { label: '3 Stars ★★★☆☆ (Standard)', value: '3' },
              { label: '2 Stars ★★☆☆☆ (Mass Recruiter)', value: '2' },
              { label: '1 Star ★☆☆☆☆ (Startup)', value: '1' },
            ]}
          />

          <Select
            label="Operational Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as CompanyStatus })}
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Blacklisted', value: 'blacklisted' },
            ]}
          />

          <Input
            label="Office Address"
            placeholder="e.g. Estancia IT Park, Chennai"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <Input
            label="Google Maps Location Link"
            placeholder="https://maps.google.com/..."
            value={formData.map_link}
            onChange={(e) => setFormData({ ...formData, map_link: e.target.value })}
          />
        </div>

        <div className="pt-2 border-t border-zinc-100">
          <p className="text-xs font-semibold text-zinc-900 mb-2">Primary HR Contact Snapshot</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Primary Contact Name"
              placeholder="e.g. Suresh Kumar"
              value={formData.contact_person_name}
              onChange={(e) => setFormData({ ...formData, contact_person_name: e.target.value })}
            />
            <Input
              label="Primary Contact Mobile"
              placeholder="+91 9876543210"
              value={formData.contact_person_mobile}
              onChange={(e) => setFormData({ ...formData, contact_person_mobile: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : company ? 'Update Company Profile' : 'Save Company Profile'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
