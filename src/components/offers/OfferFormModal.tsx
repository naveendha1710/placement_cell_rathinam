import React, { useState, useEffect } from 'react';
import { Offer, Company, CompanyHrContact } from '../../types/database';
import { DataStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Building2, User } from 'lucide-react';

interface OfferFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (offer: Partial<Offer> & { company_id: string }) => Promise<void>;
  offer?: Offer | null;
  preselectedCompanyId?: string;
}

export const OfferFormModal: React.FC<OfferFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  offer,
  preselectedCompanyId,
}) => {
  const { user } = useAuth();
  const [approvedCompanies, setApprovedCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  const [companyId, setCompanyId] = useState(offer?.company_id || preselectedCompanyId || '');
  const [contactPersonName, setContactPersonName] = useState(offer?.contact_person_name || '');
  const [remarks, setRemarks] = useState(offer?.remarks || '');
  const [saving, setSaving] = useState(false);

  const [hrContacts, setHrContacts] = useState<CompanyHrContact[]>([]);
  const [isCustomContact, setIsCustomContact] = useState(false);

  // New HR Contact Structured Fields
  const [hrName, setHrName] = useState('');
  const [hrDesignation, setHrDesignation] = useState('');
  const [hrEmail, setHrEmail] = useState('');
  const [hrMobile, setHrMobile] = useState('');

  useEffect(() => {
    async function loadCompanies() {
      setLoadingCompanies(true);
      try {
        const companies = await DataStore.getCompanies();
        const approved = companies.filter(c => c.approval_status === 'approved');
        setApprovedCompanies(approved);

        if (!companyId && approved.length > 0) {
          setCompanyId(preselectedCompanyId || approved[0].company_id);
        }
      } finally {
        setLoadingCompanies(false);
      }
    }
    if (isOpen) {
      loadCompanies();
    }
  }, [preselectedCompanyId, isOpen]);

  useEffect(() => {
    async function loadHrContacts() {
      if (!companyId) return;
      try {
        const contacts = await DataStore.getHrContacts(companyId);
        setHrContacts(contacts);
        if (contacts.length > 0 && !contactPersonName) {
          const primary = contacts.find(c => c.is_primary) || contacts[0];
          setContactPersonName(primary.designation ? `${primary.name} (${primary.designation})` : primary.name);
        }
      } catch (err) {
        console.error('Error fetching HR contacts:', err);
      }
    }
    if (isOpen) {
      loadHrContacts();
    }
  }, [companyId, isOpen]);

  useEffect(() => {
    if (offer) {
      setCompanyId(offer.company_id || preselectedCompanyId || '');
      setContactPersonName(offer.contact_person_name || '');
      setRemarks(offer.remarks || '');
    }
  }, [offer, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      alert('Please select an approved company.');
      return;
    }
    if (!remarks.trim()) {
      alert('Please enter initial lead discussion remarks.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();

      // If user typed a new HR Contact name, automatically persist into company_hr_contacts table
      let finalContactName = contactPersonName.trim();
      if ((isCustomContact || hrContacts.length === 0) && hrName.trim()) {
        finalContactName = hrDesignation.trim() ? `${hrName.trim()} (${hrDesignation.trim()})` : hrName.trim();
        try {
          await DataStore.saveHrContact({
            company_id: companyId,
            name: hrName.trim(),
            designation: hrDesignation.trim() || null,
            email: hrEmail.trim() || null,
            mobile_number: hrMobile.trim() || null,
            is_primary: hrContacts.length === 0,
          });
        } catch (err) {
          console.warn('Note: Could not save HR contact:', err);
        }
      }

      const initialAudit = {
        id: crypto.randomUUID(),
        stage: 'cold' as const,
        timestamp: now,
        updated_by_id: user?.id || 'system',
        updated_by_name: user?.name || 'Placement Officer',
        notes: remarks.trim(),
      };

      await onSave({
        offer_id: offer?.offer_id,
        company_id: companyId,
        offer_status: 'cold',
        approval_status: offer?.approval_status || 'approved',
        contact_person_name: finalContactName,
        remarks: remarks.trim(),
        created_by: offer?.created_by || user?.id || null,
        stage_history: offer?.stage_history && offer.stage_history.length > 0
          ? offer.stage_history
          : [initialAudit],
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
      title="Create New Placement Lead (Cold Stage)"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Target Company */}
        {!preselectedCompanyId && (
          <div>
            <label className="text-xs font-semibold text-zinc-900 block mb-1">
              Target Approved Company *
            </label>
            {loadingCompanies ? (
              <p className="text-xs text-zinc-500">Loading approved companies...</p>
            ) : approvedCompanies.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded text-xs">
                No approved companies found. Please approve a company before adding a lead.
              </div>
            ) : (
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-xs font-medium text-zinc-900 focus:ring-2 focus:ring-zinc-900"
                required
              >
                {approvedCompanies.map((c) => (
                  <option key={c.company_id} value={c.company_id}>
                    {c.name} ({c.industry_domain || 'General Domain'})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-4">
          <div className="flex items-center gap-2 text-zinc-900 font-bold text-xs uppercase tracking-wider">
            <User className="h-4 w-4 text-zinc-700" /> Cold Lead Information
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-900 block">
                Primary HR Contact Person Details
              </label>
              {hrContacts.length > 0 && isCustomContact && (
                <button
                  type="button"
                  onClick={() => setIsCustomContact(false)}
                  className="text-[11px] text-zinc-600 hover:text-zinc-900 font-medium underline"
                >
                  ← Select from registered company HR contacts ({hrContacts.length})
                </button>
              )}
            </div>

            {hrContacts.length > 0 && !isCustomContact ? (
              <select
                value={contactPersonName}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setIsCustomContact(true);
                    setContactPersonName('');
                  } else {
                    setContactPersonName(e.target.value);
                  }
                }}
                className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-xs font-medium text-zinc-900 focus:ring-2 focus:ring-zinc-900"
              >
                <option value="">Select registered HR contact...</option>
                {hrContacts.map((c) => {
                  const label = c.designation ? `${c.name} (${c.designation})` : c.name;
                  return (
                    <option key={c.contact_id} value={label}>
                      {label} {c.mobile_number ? `— ${c.mobile_number}` : c.email ? `— ${c.email}` : ''} {c.is_primary ? '(Primary)' : ''}
                    </option>
                  );
                })}
                <option value="__custom__">+ Add / Type Custom HR Contact Details...</option>
              </select>
            ) : (
              <div className="p-3 bg-white border border-zinc-200 rounded-md space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label="HR Contact Name *"
                    placeholder="e.g. Senthil Kumar"
                    value={hrName || contactPersonName}
                    onChange={(e) => {
                      setHrName(e.target.value);
                      setContactPersonName(e.target.value);
                    }}
                  />

                  <Input
                    label="Designation"
                    placeholder="e.g. Talent Acquisition Lead"
                    value={hrDesignation}
                    onChange={(e) => setHrDesignation(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label="Mobile / Phone Number"
                    placeholder="e.g. +91 9876543210"
                    value={hrMobile}
                    onChange={(e) => setHrMobile(e.target.value)}
                  />

                  <Input
                    label="Email Address"
                    placeholder="e.g. senthil@google.com"
                    value={hrEmail}
                    onChange={(e) => setHrEmail(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-900 block mb-1">
              Initial Lead Remarks & Discussion Notes *
            </label>
            <textarea
              rows={4}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Record outreach summary, HR feedback, initial hiring requirements discussed..."
              className="w-full p-2.5 text-xs rounded-md border border-zinc-300 bg-white focus:ring-2 focus:ring-zinc-900"
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || (!preselectedCompanyId && approvedCompanies.length === 0)}>
            {saving ? 'Saving...' : 'Save Cold Lead'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
