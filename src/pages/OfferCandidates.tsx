import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DataStore } from '../lib/store';
import { Offer, DriveApplication, ApplicationFinalStatus } from '../types/database';
import { RegisterStudentsInlineForm } from '../components/offers/RegisterStudentsInlineForm';
import { OfferApprovalModal } from '../components/offers/OfferApprovalModal';
import { MatchScoresModal } from '../components/offers/MatchScoresModal';
import { DriveCompletedPlacementsTable } from '../components/offers/DriveCompletedPlacementsTable';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/common/Pagination';
import { 
  ArrowLeft, Search, UserPlus, Share2, Sparkles, Check, X, 
  Users, Building2, Calendar, MapPin, Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const OfferCandidates: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, canCreateEdit } = useAuth();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [applications, setApplications] = useState<DriveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isMatchScoresOpen, setIsMatchScoresOpen] = useState(false);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const allOffers = await DataStore.getOffers();
      const match = allOffers.find(o => o.offer_id === id);
      setOffer(match || null);

      if (match) {
        const allApps = await DataStore.getApplications(match.offer_id);
        setApplications(allApps);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, deptFilter, batchFilter, statusFilter]);

  const handleStatusChange = async (appId: string, status: ApplicationFinalStatus, accepted?: boolean) => {
    if (!offer) return;
    await DataStore.updateApplicationStatus(appId, status, accepted);
    await loadData();
  };

  const handleCopyShareLink = () => {
    if (!offer) return;
    const shareUrl = `${window.location.origin}/register/${offer.offer_id}`;
    navigator.clipboard.writeText(shareUrl);
    alert(`Registration link copied to clipboard!\n\n${shareUrl}`);
  };

  const filteredApplications = applications.filter(app => {
    const studentName = app.student?.name || '';
    const rollNum = app.student?.roll_number || '';
    const dept = app.student?.department || '';
    const batch = app.student?.batch || '';

    const matchesSearch = 
      studentName.toLowerCase().includes(search.toLowerCase()) ||
      rollNum.toLowerCase().includes(search.toLowerCase());

    const matchesDept = deptFilter === 'all' || dept === deptFilter;
    const matchesBatch = batchFilter === 'all' || batch === batchFilter;
    const matchesStatus = statusFilter === 'all' || app.final_status === statusFilter;

    return matchesSearch && matchesDept && matchesBatch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredApplications.length / pageSize);
  const paginatedApps = filteredApplications.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const uniqueDepts = Array.from(new Set(applications.map(a => a.student?.department).filter(Boolean)));

  if (loading) {
    return <div className="p-8 text-center text-xs text-zinc-500">Loading registered candidates...</div>;
  }

  if (!offer) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-zinc-900">Offer not found.</p>
        <Button size="sm" variant="outline" onClick={() => navigate('/offers')}>
          Back to Offers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate(`/offers/${offer.offer_id}`)} className="gap-1.5 shrink-0 bg-white">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Offer Overview</span>
          </Button>

          <div>
            <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-zinc-800" />
              <span>{offer.company?.name || 'Company'} — Registered Student Matrix</span>
            </h1>
            <p className="text-xs text-zinc-500">
              Total {applications.length} student(s) registered for this recruitment drive
            </p>
          </div>
        </div>

        {offer.offer_status !== 'drive_completed' && (
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => setIsMatchScoresOpen(true)} className="gap-1.5 bg-white">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span>Match Scores</span>
            </Button>

            <Button size="sm" variant="outline" onClick={handleCopyShareLink} className="gap-1.5 bg-white">
              <Share2 className="h-4 w-4 text-zinc-600" />
              <span>Share Registration Link</span>
            </Button>

            {canCreateEdit && (
              <Button size="sm" onClick={() => setIsRegisterOpen(true)} className="gap-1.5 bg-zinc-900 text-white">
                <UserPlus className="h-4 w-4" />
                <span>Register Students</span>
              </Button>
            )}
          </div>
        )}
      </div>



      {/* Filters Bar */}
      <Card className="p-4 bg-white border border-zinc-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by student name or roll no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <Select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            options={[
              { label: 'All Departments', value: 'all' },
              ...uniqueDepts.map(d => ({ label: d as string, value: d as string })),
            ]}
          />

          <Select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            options={[
              { label: 'All Batches', value: 'all' },
              { label: 'Batch T', value: 'T' },
              { label: 'Batch O', value: 'O' },
              { label: 'Batch S', value: 'S' },
              { label: 'Batch A', value: 'A' },
              { label: 'Batch X', value: 'X' },
            ]}
          />

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { label: 'All Selection Statuses', value: 'all' },
              { label: 'Applied', value: 'applied' },
              { label: 'Shortlisted', value: 'shortlisted' },
              { label: 'Interviewed', value: 'interviewed' },
              { label: 'Selected', value: 'selected' },
              { label: 'Rejected', value: 'rejected' },
            ]}
          />
        </div>
      </Card>

      {/* Main Student Registrations Matrix Table */}
      <Card className="overflow-hidden border border-zinc-200 bg-white shadow-xs">
        {filteredApplications.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="h-8 w-8 text-zinc-400 mx-auto" />
            <p className="text-xs text-zinc-500">
              No registered students found matching the selected filters.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-700">
                <thead className="bg-zinc-100 border-b border-zinc-200 uppercase text-[11px] font-semibold text-zinc-600 tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Roll Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Batch</th>
                    <th className="py-3 px-4">Applied Date</th>
                    <th className="py-3 px-4">Selection Status</th>
                    <th className="py-3 px-4">Offer Acceptance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {paginatedApps.map((app) => (
                    <tr key={app.application_id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-zinc-900">{app.student?.roll_number || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => navigate(`/students/${app.student_id}`)}
                          className="font-bold text-zinc-900 hover:underline text-left block"
                        >
                          {app.student?.name || 'N/A'}
                        </button>
                        {app.applied_role_title && (
                          <span className="inline-block mt-0.5 text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                            {app.applied_role_title}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-zinc-700">{app.student?.department || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                          Batch {app.student?.batch || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-500 font-mono">
                        {new Date(app.applied_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        {canCreateEdit ? (
                          <select
                            value={app.final_status}
                            onChange={(e) => handleStatusChange(app.application_id, e.target.value as ApplicationFinalStatus, app.offer_accepted)}
                            className="h-7 px-2 text-xs rounded border border-zinc-300 bg-white font-semibold text-zinc-900 focus:ring-2 focus:ring-zinc-900"
                          >
                            <option value="applied">APPLIED</option>
                            <option value="shortlisted">SHORTLISTED</option>
                            <option value="interviewed">INTERVIEWED</option>
                            <option value="selected">SELECTED</option>
                            <option value="rejected">REJECTED</option>
                            <option value="no_show">NO SHOW</option>
                          </select>
                        ) : (
                          <Badge variant={app.final_status === 'selected' ? 'approved' : app.final_status === 'rejected' ? 'rejected' : 'pending'}>
                            {app.final_status.toUpperCase()}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {app.final_status === 'selected' ? (
                          canCreateEdit ? (
                            <button
                              onClick={() => handleStatusChange(app.application_id, 'selected', !app.offer_accepted)}
                              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                                app.offer_accepted
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
                              }`}
                            >
                              {app.offer_accepted ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 text-zinc-400" />}
                              {app.offer_accepted ? 'ACCEPTED' : 'PENDING'}
                            </button>
                          ) : (
                            <span className="font-semibold text-emerald-700">
                              {app.offer_accepted ? 'Accepted' : 'Pending'}
                            </span>
                          )
                        ) : (
                          <span className="text-zinc-400 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredApplications.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </Card>

      {/* Inline Registration Form */}
      {isRegisterOpen && (
        <RegisterStudentsInlineForm
          offerId={offer.offer_id}
          eligibleDepartments={offer.eligible_departments || undefined}
          onClose={() => setIsRegisterOpen(false)}
          onSuccess={loadData}
        />
      )}

      {/* AI Match Scores Modal */}
      <MatchScoresModal
        isOpen={isMatchScoresOpen}
        onClose={() => setIsMatchScoresOpen(false)}
        offer={offer}
        applications={applications}
        onUpdate={loadData}
      />

      {/* Approval Workflow Modal */}
      <OfferApprovalModal
        isOpen={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
        offer={offer}
        onApprove={async () => {
          await DataStore.updateOfferApproval(offer.offer_id, 'approved', user?.id);
          await loadData();
        }}
        onReject={async (reason) => {
          await DataStore.updateOfferApproval(offer.offer_id, 'rejected', user?.id, reason);
          await loadData();
        }}
        onSubmitApproval={async () => {
          await DataStore.updateOfferApproval(offer.offer_id, 'pending_approval');
          await loadData();
        }}
      />
    </div>
  );
};
