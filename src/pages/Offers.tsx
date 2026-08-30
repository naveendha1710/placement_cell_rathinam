import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataStore } from '../lib/store';
import { Offer } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { OfferInlineForm } from '../components/offers/OfferInlineForm';
import { OfferApprovalModal } from '../components/offers/OfferApprovalModal';
import { Pagination } from '../components/common/Pagination';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Briefcase, Plus, Search, Calendar, MapPin, Edit, Trash2, Eye, ShieldCheck, TrendingUp, Award } from 'lucide-react';

export const Offers: React.FC = () => {
  const navigate = useNavigate();
  const { user, canCreateEdit, canDelete } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [ctcFilter, setCtcFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Inline Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [offerForApproval, setOfferForApproval] = useState<Offer | null>(null);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const data = await DataStore.getOffers();
      setOffers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, stageFilter, approvalFilter, modeFilter, ctcFilter]);

  const handleSaveOffer = async (offerData: Partial<Offer> & { company_id: string }) => {
    await DataStore.saveOffer(offerData);
    setIsFormOpen(false);
    await loadOffers();
  };

  const handleDeleteOffer = async (id: string) => {
    if (confirm('Are you sure you want to delete this job offer record?')) {
      await DataStore.deleteOffer(id);
      await loadOffers();
    }
  };

  const handleApprove = async () => {
    if (offerForApproval) {
      await DataStore.updateOfferApproval(offerForApproval.offer_id, 'approved', user?.id);
      await loadOffers();
    }
  };

  const handleReject = async (reason: string) => {
    if (offerForApproval) {
      await DataStore.updateOfferApproval(offerForApproval.offer_id, 'rejected', user?.id, reason);
      await loadOffers();
    }
  };

  const handleSubmitForApproval = async () => {
    if (offerForApproval) {
      await DataStore.updateOfferApproval(offerForApproval.offer_id, 'pending_approval');
      await loadOffers();
    }
  };

  const filteredOffers = offers.filter(o => {
    const companyName = o.company?.name || '';
    const matchesSearch = 
      companyName.toLowerCase().includes(search.toLowerCase()) ||
      (o.job_location && o.job_location.toLowerCase().includes(search.toLowerCase()));
    const matchesApproval = approvalFilter === 'all' || o.approval_status === approvalFilter;
    const matchesMode = modeFilter === 'all' || o.drive_mode === modeFilter;
    const matchesCtc = ctcFilter === 'all' || (o.ctc_lpa !== null && o.ctc_lpa !== undefined && o.ctc_lpa >= parseFloat(ctcFilter));

    return matchesSearch && matchesApproval && matchesMode && matchesCtc;
  });

  const totalPages = Math.ceil(filteredOffers.length / pageSize);
  const paginatedOffers = filteredOffers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalCount = offers.length;
  const approvedCount = offers.filter(o => o.approval_status === 'approved').length;
  const ctcValues = offers.map(o => o.ctc_lpa).filter((c): c is number => c !== null && c !== undefined);
  const highestCtc = ctcValues.length > 0 ? Math.max(...ctcValues) : 0;
  const avgCtc = ctcValues.length > 0 ? (ctcValues.reduce((a, b) => a + b, 0) / ctcValues.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Briefcase className="h-6 w-6" />
            <span>Job Offers & Recruitment Drives</span>
          </h1>
          <p className="text-xs text-zinc-500">
            Manage placement offers attached to approved companies & register students.
          </p>
        </div>

        <div>
          {canCreateEdit && !isFormOpen && (
            <Button
              onClick={() => {
                setSelectedOffer(null);
                setIsFormOpen(true);
              }}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Create Job Offer</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-zinc-900 text-white shrink-0">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Total Drives</span>
            <span className="text-xl font-bold text-zinc-900 font-mono">{totalCount}</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Approved Drives</span>
            <span className="text-xl font-bold text-emerald-700 font-mono">{approvedCount}</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Highest Package</span>
            <span className="text-xl font-bold text-emerald-700 font-mono">{highestCtc > 0 ? `${highestCtc.toFixed(1)} LPA` : 'N/A'}</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
            <Award className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Average Package</span>
            <span className="text-xl font-bold text-purple-700 font-mono">{avgCtc > 0 ? `${avgCtc.toFixed(2)} LPA` : 'N/A'}</span>
          </div>
        </Card>
      </div>

      {/* Inline Form Container */}
      {isFormOpen ? (
        <OfferInlineForm
          offer={selectedOffer}
          onSave={handleSaveOffer}
          onClose={() => setIsFormOpen(false)}
        />
      ) : (
        <>
          {/* Filters */}
          <Card className="p-4 bg-white border-zinc-200">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="relative md:col-span-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search company, location, creator..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <Select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                options={[
                  { label: 'All Pipeline Stages', value: 'all' },
                  { label: 'Cold Leads Only', value: 'cold' },
                  { label: 'Warm Discussions', value: 'warm' },
                  { label: 'Hot Confirmed Drives', value: 'hot' },
                  { label: 'Completed Drives', value: 'drive_completed' },
                  { label: 'Closed & Archived Drives', value: 'drive_closed' },
                ]}
              />

              <Select
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value)}
                options={[
                  { label: 'All Approval Statuses', value: 'all' },
                  { label: 'Approved Offers', value: 'approved' },
                  { label: 'Pending Approval', value: 'pending_approval' },
                  { label: 'Draft Mode', value: 'draft' },
                  { label: 'Rejected', value: 'rejected' },
                ]}
              />

              <Select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                options={[
                  { label: 'All Drive Modes', value: 'all' },
                  { label: 'On Campus', value: 'on_campus' },
                  { label: 'Virtual Drive', value: 'virtual' },
                  { label: 'Pooled Drive', value: 'pooled' },
                ]}
              />

              <Select
                value={ctcFilter}
                onChange={(e) => setCtcFilter(e.target.value)}
                options={[
                  { label: 'All CTC Packages', value: 'all' },
                  { label: 'CTC >= 10.0 LPA', value: '10' },
                  { label: 'CTC >= 8.0 LPA', value: '8' },
                  { label: 'CTC >= 5.0 LPA', value: '5' },
                  { label: 'CTC >= 3.0 LPA', value: '3' },
                ]}
              />
            </div>
          </Card>

          {/* Data Table */}
          <Card className="overflow-hidden border-zinc-200">
            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-500">Loading offers...</div>
            ) : filteredOffers.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">No job offers found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-700">
                  <thead className="bg-zinc-100 border-b border-zinc-200 uppercase text-[11px] font-semibold text-zinc-600 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Company Name</th>
                      <th className="py-3 px-4">Pipeline Stage</th>
                      <th className="py-3 px-4">Job Roles / CTC</th>
                      <th className="py-3 px-4">Drive Date & Location</th>
                      <th className="py-3 px-4">Created By</th>
                      <th className="py-3 px-4">Approval Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {paginatedOffers.map((off) => {
                      const stage = off.offer_status || 'cold';
                      // Monochrome / High-contrast Mono Badges for Pipeline Stages
                      const stageBadge = 
                        stage === 'drive_closed' ? 'bg-zinc-950 text-white border-zinc-950 font-bold' :
                        stage === 'drive_completed' ? 'bg-zinc-900 text-white border-zinc-900' :
                        stage === 'hot' ? 'bg-zinc-800 text-zinc-100 border-zinc-700' :
                        stage === 'warm' ? 'bg-zinc-200 text-zinc-800 border-zinc-300 font-semibold' :
                        'bg-zinc-100 text-zinc-700 border-zinc-300';

                      const stageLabel = 
                        stage === 'drive_closed' ? 'Drive Closed' :
                        stage === 'drive_completed' ? 'Drive Completed' :
                        stage === 'hot' ? 'Hot Drive' :
                        stage === 'warm' ? 'Warm Lead' : 'Cold Lead';

                      const rolesCount = off.job_roles?.length || (off.ctc_lpa ? 1 : 0);

                      return (
                        <tr key={off.offer_id} className="hover:bg-zinc-50 transition-colors">
                          <td className="py-3 px-4 font-bold text-zinc-900 text-sm">
                            <button
                              onClick={() => navigate(`/offers/${off.offer_id}`)}
                              className="font-bold text-zinc-900 hover:underline text-left"
                            >
                              {off.company?.name || 'Company Offer'}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-md border ${stageBadge}`}>
                              {stageLabel}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-zinc-900">
                            {rolesCount > 1 ? (
                              <span>{rolesCount} Roles ({off.ctc_lpa ? `${off.ctc_lpa} LPA` : 'TBD'})</span>
                            ) : (
                              <span>{off.ctc_lpa ? `${off.ctc_lpa} LPA` : 'TBD'}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 font-medium text-zinc-900">
                                <Calendar className="h-3 w-3 text-zinc-500" />
                                <span>{off.drive_date || off.tentative_drive_date || 'TBD'}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                                <MapPin className="h-3 w-3 text-zinc-400" />
                                <span>{off.job_location || 'Flexible'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-zinc-900">
                            {off.creator_profile?.name || 'Admin User'}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => {
                                setOfferForApproval(off);
                                setIsApprovalModalOpen(true);
                              }}
                              className="hover:opacity-80 transition-opacity text-left"
                            >
                              <Badge variant={off.approval_status as any}>
                                {off.approval_status.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => navigate(`/offers/${off.offer_id}`)}
                                className="p-1 rounded hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                                title="View Offer Matrix & Register Students"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setOfferForApproval(off);
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
                                    setSelectedOffer(off);
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
                                  onClick={() => handleDeleteOffer(off.offer_id)}
                                  className="p-1 rounded hover:bg-rose-50 text-rose-600 hover:text-rose-700"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredOffers.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </Card>
        </>
      )}

      {/* Approval Workflow Modal */}
      <OfferApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        offer={offerForApproval}
        onApprove={handleApprove}
        onReject={handleReject}
        onSubmitApproval={handleSubmitForApproval}
      />
    </div>
  );
};
