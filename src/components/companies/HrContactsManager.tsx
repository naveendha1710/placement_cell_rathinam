import React, { useState, useEffect } from 'react';
import { DataStore } from '../../lib/store';
import { CompanyHrContact } from '../../types/database';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Plus, Edit, Trash2, Star, Mail, Phone, X } from 'lucide-react';

interface HrContactsManagerProps {
  companyId: string;
  onUpdate: () => void;
}

export const HrContactsManager: React.FC<HrContactsManagerProps> = ({ companyId, onUpdate }) => {
  const { canCreateEdit, canDelete } = useAuth();
  const [contacts, setContacts] = useState<CompanyHrContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CompanyHrContact | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    mobile_number: '',
    designation: '',
    is_primary: false,
  });

  const loadContacts = async () => {
    setLoading(true);
    try {
      const data = await DataStore.getHrContacts(companyId);
      setContacts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [companyId]);

  const handleOpenAdd = () => {
    setSelectedContact(null);
    setForm({
      name: '',
      email: '',
      mobile_number: '',
      designation: '',
      is_primary: contacts.length === 0,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c: CompanyHrContact) => {
    setSelectedContact(c);
    setForm({
      name: c.name || '',
      email: c.email || '',
      mobile_number: c.mobile_number || '',
      designation: c.designation || '',
      is_primary: c.is_primary,
    });
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await DataStore.saveHrContact({
      contact_id: selectedContact?.contact_id,
      company_id: companyId,
      name: form.name.trim(),
      email: form.email.trim(),
      mobile_number: form.mobile_number.trim(),
      designation: form.designation.trim(),
      is_primary: form.is_primary,
    });
    setIsFormOpen(false);
    await loadContacts();
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this HR contact?')) {
      await DataStore.deleteHrContact(id);
      await loadContacts();
      onUpdate();
    }
  };

  const handleSetPrimary = async (c: CompanyHrContact) => {
    await DataStore.saveHrContact({
      ...c,
      is_primary: true,
    });
    await loadContacts();
    onUpdate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-zinc-900">Company HR Contacts</h3>
          <p className="text-xs text-zinc-500">Multiple HR representatives & recruiter directory</p>
        </div>
        {canCreateEdit && !isFormOpen && (
          <Button size="sm" onClick={handleOpenAdd} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            <span>Add HR Contact</span>
          </Button>
        )}
      </div>

      {/* Inline Form Container */}
      {isFormOpen && (
        <form onSubmit={handleSave} className="p-4 rounded-xl border-2 border-zinc-900 bg-zinc-50 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
            <p className="text-xs font-bold text-zinc-900">
              {selectedContact ? 'Edit HR Contact' : 'Add HR Contact'}
            </p>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-zinc-400 hover:text-zinc-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Contact Name *"
              placeholder="e.g. Suresh Kumar"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="Designation / Title"
              placeholder="e.g. Talent Acquisition Lead"
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="suresh@zoho.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Mobile Number"
              placeholder="+91 9876543210"
              value={form.mobile_number}
              onChange={(e) => setForm({ ...form, mobile_number: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_primary"
              checked={form.is_primary}
              onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
            />
            <label htmlFor="is_primary" className="text-xs font-semibold text-zinc-800">
              Set as Primary Contact for Company Overview
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              {selectedContact ? 'Update Contact' : 'Add Contact'}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-zinc-500 py-4">Loading contacts...</p>
      ) : contacts.length === 0 ? (
        <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg">
          No HR contacts added yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {contacts.map((c) => (
            <div
              key={c.contact_id}
              className={`p-3.5 rounded-xl border transition-all ${
                c.is_primary ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm' : 'bg-white text-zinc-900 border-zinc-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm">{c.name}</h4>
                    {c.is_primary && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-zinc-950 flex items-center gap-1">
                        <Star className="h-2.5 w-2.5 fill-zinc-950" /> Primary HR
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${c.is_primary ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    {c.designation || 'HR Representative'}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {canCreateEdit && !c.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(c)}
                      className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                        c.is_primary ? 'text-amber-300' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                      }`}
                      title="Set as Primary HR"
                    >
                      Make Primary
                    </button>
                  )}
                  {canCreateEdit && (
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className={`p-1 rounded ${c.is_primary ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-600'}`}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(c.contact_id)}
                      className={`p-1 rounded ${c.is_primary ? 'hover:bg-rose-900 text-rose-300' : 'hover:bg-rose-50 text-rose-600'}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-2 space-y-0.5 text-xs">
                {c.email && (
                  <div className="flex items-center gap-1.5 opacity-90">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{c.email}</span>
                  </div>
                )}
                {c.mobile_number && (
                  <div className="flex items-center gap-1.5 opacity-90">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{c.mobile_number}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
