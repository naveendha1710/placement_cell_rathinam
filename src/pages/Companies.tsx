import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataStore } from '../lib/store';
import { Company } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { CompanyInlineForm } from '../components/companies/CompanyInlineForm';
import { CompanyApprovalModal } from '../components/companies/CompanyApprovalModal';
import { ExcelImporter } from '../components/common/ExcelImporter';
import { Pagination } from '../components/common/Pagination';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Building2, Plus, Search, Star, Edit, Trash2, Eye, ShieldCheck, Clock, ExternalLink } from 'lucide-react';

export const Companies: React.FC = () => {
  const navigate = useNavigate();
  const { user, canCreateEdit, canDelete, canApprove } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [starFilter, setStarFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [search, approvalFilter, starFilter]);

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
    const matchesStar = starFilter === 'all' || (c.star_rating !== null && c.star_rating !== undefined && c.star_rating >= parseInt(starFilter));
    return matchesSearch && matchesApproval && matchesStar;
  });

  const totalPages = Math.ceil(filteredCompanies.length / pageSize);
  const paginatedCompanies = filteredCompanies.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalCount = companies.length;
  const approvedCount = companies.filter(c => c.approval_status === 'approved').length;
  const pendingCount = companies.filter(c => c.approval_status === 'pending_approval').length;
  const superDreamCount = companies.filter(c => c.star_rating === 5).length;

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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-zinc-900 text-white shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Total Companies</span>
            <span className="text-xl font-bold text-zinc-900 font-mono">{totalCount}</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Approved Companies</span>
            <span className="text-xl font-bold text-emerald-700 font-mono">{approvedCount}</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Pending Approval</span>
            <span className="text-xl font-bold text-amber-700 font-mono">{pendingCount}</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
            <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Super Dream (5★)</span>
            <span className="text-xl font-bold text-amber-600 font-mono">{superDreamCount}</span>
          </div>
        </Card>
      </div>

      {isFormOpen ? (
        <CompanyInlineForm
          company={selectedCompany}
          onSave={handleSaveCompany}
          onClose={() => setIsFormOpen(false)}
        />
      ) : (
        <>
          {/* Filter Bar */}
          <Card className="p-4 bg-white border-zinc-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search by company name or domain..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
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

              <Select
                value={starFilter}
                onChange={(e) => setStarFilter(e.target.value)}
                options={[
                  { label: 'All Star Tiers', value: 'all' },
                  { label: '5 Stars (Super Dream Tier)', value: '5' },
                  { label: '4 Stars (Dream Tier)', value: '4' },
                  { label: '3 Stars (Core Tier)', value: '3' },
                  { label: '2 Stars', value: '2' },
                  { label: '1 Star', value: '1' },
                ]}
              />
            </div>
          </Card>

          {/* Companies Grid / Table */}
          <Card className="overflow-hidden border-zinc-200">
            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-500">Loading companies...</div>
            ) : filteredCompanies.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">No company profiles found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-700">
                  <thead className="bg-zinc-100 border-b border-zinc-200 uppercase text-[11px] font-semibold text-zinc-600 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Company Name</th>
                      <th className="py-3 px-4">Industry Domain</th>
                      <th className="py-3 px-4">Tier / Rating</th>
                      <th className="py-3 px-4">Website</th>
                      <th className="py-3 px-4">Approval Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {paginatedCompanies.map((comp) => (
                      <tr key={comp.company_id} className="hover:bg-zinc-50 transition-colors">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => navigate(`/companies/${comp.company_id}`)}
                            className="font-bold text-zinc-900 hover:underline text-left text-sm"
                          >
                            {comp.name}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-medium text-zinc-800">
                          {comp.industry_domain || 'Technology'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">
                            Tier {comp.star_rating} ★
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {comp.website_url ? (
                            <a
                              href={comp.website_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1 max-w-[150px] truncate"
                            >
                              <span className="truncate">{comp.website_url}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-zinc-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => {
                              setCompanyForApproval(comp);
                              setIsApprovalModalOpen(true);
                            }}
                            className="hover:opacity-80 transition-opacity text-left"
                          >
                            <Badge variant={comp.approval_status as any}>
                              {comp.approval_status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate(`/companies/${comp.company_id}`)}
                              className="p-1 rounded hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                              title="View Company HR Contacts & Drives"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {canCreateEdit && (
                              <button
                                onClick={() => {
                                  setSelectedCompany(comp);
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
                                onClick={() => handleDeleteCompany(comp.company_id)}
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

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredCompanies.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </Card>
        </>
      )}

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
