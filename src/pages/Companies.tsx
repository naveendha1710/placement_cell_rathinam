import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataStore } from '../lib/store';
import { Company } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { CompanyInlineForm } from '../components/companies/CompanyInlineForm';
import { CompanyApprovalModal } from '../components/companies/CompanyApprovalModal';
import { ExcelImporter } from '../components/common/ExcelImporter';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Building2, Plus, Search, Star, Edit, Trash2, Eye, ShieldCheck } from 'lucide-react';

export const Companies: React.FC = () => {
  const navigate = useNavigate();
  const { user, canCreateEdit, canDelete, canApprove } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('all');

  // Inline Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [companyForApproval, setCompanyForApproval] = useState<Company | null>(null);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await DataStore.getCompanies();
      setCompanies(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleSaveCompany = async (companyData: Partial<Company> & { name: string }) => {
    await DataStore.saveCompany(companyData);
    setIsFormOpen(false);
    await loadCompanies();
  };

  const handleDeleteCompany = async (id: string) => {
    if (confirm('Delete this company profile?')) {
      await DataStore.deleteCompany(id);
      await loadCompanies();
    }
  };

  const handleApprove = async () => {
    if (companyForApproval) {
      await DataStore.updateCompanyApproval(companyForApproval.company_id, 'approved', user?.id);
      await loadCompanies();
    }
  };

  const handleReject = async (reason: string) => {
    if (companyForApproval) {
      await DataStore.updateCompanyApproval(companyForApproval.company_id, 'rejected', user?.id, reason);
      await loadCompanies();
    }
  };

  const handleSubmitForApproval = async () => {
    if (companyForApproval) {
      await DataStore.updateCompanyApproval(companyForApproval.company_id, 'pending_approval');
      await loadCompanies();
    }
  };

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.industry_domain && c.industry_domain.toLowerCase().includes(search.toLowerCase()));
    const matchesApproval = approvalFilter === 'all' || c.approval_status === approvalFilter;
    return matchesSearch && matchesApproval;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            <span>Recruiting Companies</span>
          </h1>
          <p className="text-xs text-zinc-500">
            Company directory, star ratings, HR contacts, and approval status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canCreateEdit && <ExcelImporter type="companies" onSuccess={loadCompanies} />}
          {canCreateEdit && !isFormOpen && (
            <Button
              onClick={() => {
                setSelectedCompany(null);
                setIsFormOpen(true);
              }}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Add Company</span>
            </Button>
          )}
        </div>
      </div>

      {/* Inline Form Container */}
      {isFormOpen && (
        <CompanyInlineForm
          company={selectedCompany}
          onSave={handleSaveCompany}
          onClose={() => setIsFormOpen(false)}
        />
      )}

      {/* Filter Bar */}
      <Card className="p-4 bg-white border-zinc-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by company name or domain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <Select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            options={[
              { label: 'All Approval Statuses', value: 'all' },
              { label: 'Approved Companies', value: 'approved' },
              { label: 'Pending Approval', value: 'pending_approval' },
              { label: 'Draft Mode', value: 'draft' },
              { label: 'Rejected', value: 'rejected' },
            ]}
          />
        </div>
      </Card>

      {/* Data Table */}
      <Card className="overflow-hidden border-zinc-200">
        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500">Loading companies...</div>
        ) : filteredCompanies.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">No companies found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-700">
              <thead className="bg-zinc-100 border-b border-zinc-200 uppercase text-[11px] font-semibold text-zinc-600 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Domain / Industry</th>
                  <th className="py-3 px-4">Star Rating</th>
                  <th className="py-3 px-4">Primary Contact Snapshot</th>
                  <th className="py-3 px-4">Approval Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {filteredCompanies.map((c) => (
                  <tr key={c.company_id} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <button
                          onClick={() => navigate(`/companies/${c.company_id}`)}
                          className="font-bold text-zinc-900 hover:underline text-left text-sm"
                        >
                          {c.name}
                        </button>
                        {c.website_url && (
                          <p className="text-[11px] text-zinc-400 truncate max-w-xs">{c.website_url}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-zinc-800">
                      {c.industry_domain || 'General IT'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 font-semibold text-amber-600">
                        <span>{c.star_rating}</span>
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-zinc-900">{c.contact_person_name || 'Not set'}</p>
                        <p className="text-[11px] text-zinc-500">{c.contact_person_mobile || '-'}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          setCompanyForApproval(c);
                          setIsApprovalModalOpen(true);
                        }}
                        className="hover:opacity-80 transition-opacity text-left"
                      >
                        <Badge variant={c.approval_status as any}>
                          {c.approval_status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canApprove && c.approval_status !== 'approved' && (
                          <button
                            onClick={async () => {
                              await DataStore.updateCompanyApproval(c.company_id, 'approved', user?.id);
                              await loadCompanies();
                            }}
                            className="text-[11px] px-2 py-0.5 rounded font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
                            title="Quick Approve Company"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            <span>Approve</span>
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/companies/${c.company_id}`)}
                          className="p-1 rounded hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                          title="View Details & HR Contacts"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setCompanyForApproval(c);
                            setIsApprovalModalOpen(true);
                          }}
                          className="p-1 rounded hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                          title="Approval Workflow"
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </button>
                        {canCreateEdit && (
                          <button
                            onClick={() => {
                              setSelectedCompany(c);
                              setIsFormOpen(true);
                            }}
                            className="p-1 rounded hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteCompany(c.company_id)}
                            className="p-1 rounded hover:bg-rose-50 text-rose-600 hover:text-rose-700"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Approval Workflow Modal */}
      <CompanyApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        company={companyForApproval}
        onApprove={handleApprove}
        onReject={handleReject}
        onSubmitApproval={handleSubmitForApproval}
      />
    </div>
  );
};
