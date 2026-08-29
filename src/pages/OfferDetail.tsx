import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DataStore } from '../lib/store';
import { Offer, DriveApplication, ApplicationFinalStatus, OfferStatus } from '../types/database';
import { RegisterStudentsInlineForm } from '../components/offers/RegisterStudentsInlineForm';
import { OfferApprovalModal } from '../components/offers/OfferApprovalModal';
import { MatchScoresModal } from '../components/offers/MatchScoresModal';
import { DriveCompletedPlacementsTable } from '../components/offers/DriveCompletedPlacementsTable';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { 
  Briefcase, ArrowLeft, Calendar, MapPin, UserPlus, 
  ShieldCheck, FileText, Check, X, Share2, Sparkles, Trash2 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const OfferDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role, canCreateEdit, canUpdateApplicationStatus, departmentScope } = useAuth();
  
  const [offer, setOffer] = useState<Offer | null>(null);
  const [applications, setApplications] = useState<DriveApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [isMatchScoresOpen, setIsMatchScoresOpen] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const offers = await DataStore.getOffers();
      const match = offers.find(o => o.offer_id === id);
      setOffer(match || null);

      let apps = await DataStore.getApplications(id);
      if (departmentScope) {
        apps = apps.filter(a => a.student?.department.toLowerCase() === departmentScope.toLowerCase());
      }
      setApplications(apps);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, departmentScope]);

  const handleStatusChange = async (appId: string, newStatus: ApplicationFinalStatus, accepted?: boolean) => {
    await DataStore.updateApplicationStatus(appId, newStatus, accepted);
    await loadData();
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-zinc-500">Loading offer details...</div>;
  }

  if (!offer) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-zinc-200">
        <h2 className="text-base font-bold text-zinc-900 mb-2">Offer Not Found</h2>
        <Button variant="outline" size="sm" onClick={() => navigate('/offers')}>
          Back to Offers
        </Button>
      </div>
    );
  }

  const isApproved = offer.approval_status === 'approved';

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/offers')} className="gap-1.5 shrink-0">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Offers</span>
        </Button>

        {/* Offer Lifecycle Pipeline Stage Selector */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider shrink-0">Pipeline Stage:</span>
          <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-lg border border-zinc-200 text-xs">
            {(['cold', 'warm', 'hot', 'drive_completed'] as OfferStatus[]).map((st) => {
              const isCurrent = (offer.offer_status || 'cold') === st;
              const labels: Record<OfferStatus, string> = {
                cold: 'Cold',
                warm: 'Warm',
                hot: 'Hot',
                drive_completed: 'Drive Completed',
              };
              return (
                <button
                  key={st}
                  disabled={!canCreateEdit}
                  onClick={async () => {
                    await DataStore.saveOffer({
                      ...offer,
                      company_id: offer.company_id,
                      offer_status: st,
                    });
                    await loadData();
                  }}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all whitespace-nowrap ${
                    isCurrent
                      ? st === 'drive_completed'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : st === 'hot'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : st === 'warm'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-blue-600 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
                  }`}
                >
                  {labels[st]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Badge variant={offer.approval_status as any}>
            {offer.approval_status.replace('_', ' ').toUpperCase()}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => setIsApprovalOpen(true)} className="gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span>Approval Workflow</span>
          </Button>
        </div>
      </div>

      {/* Offer Metadata Summary */}
      <Card className="p-6 bg-white border-zinc-200">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-xl">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-zinc-900">
                  {offer.company?.name || 'Company Job Drive'}
                </h1>
                <p className="text-xs text-zinc-500 font-medium">
                  {offer.company?.industry_domain || 'Technology Solutions'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-700 font-medium pt-1">
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-bold">CTC Package</span>
                <span className="text-base font-bold text-zinc-900">{offer.ctc_lpa ? `${offer.ctc_lpa} LPA` : 'TBD'}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-bold">Drive Date</span>
                <span className="flex items-center gap-1 font-semibold">
                  <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                  {offer.drive_date || 'To be announced'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-bold">Job Location</span>
                <span className="flex items-center gap-1 font-semibold">
                  <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                  {offer.job_location || 'Flexible'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-bold">Drive Mode</span>
                <span className="font-semibold text-zinc-800 uppercase">{offer.drive_mode}</span>
              </div>
            </div>

            {offer.jd_text && (
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-700 mt-2">
                <p className="font-bold text-zinc-900 mb-1 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-zinc-700" /> Job Description:
                </p>
                <p className="whitespace-pre-line leading-relaxed text-zinc-800">{offer.jd_text}</p>
              </div>
            )}

            {offer.jd_files && offer.jd_files.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[11px] font-bold text-zinc-700">Uploaded JD Attachments ({offer.jd_files.length}):</p>
                {offer.jd_files.map((file, idx) => {
                  const fileName = file.split('/').pop() || file;
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 bg-zinc-50 border border-zinc-200 rounded-md text-xs">
                      <a
                        href={file}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-blue-700 font-semibold hover:underline truncate max-w-[80%]"
                      >
                        <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{fileName}</span>
                      </a>
                      {canCreateEdit && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm(`Delete JD document '${fileName}'?`)) return;
                            const updated = (offer.jd_files || []).filter(f => f !== file);
                            await DataStore.saveOffer({
                              ...offer,
                              company_id: offer.company_id,
                              jd_files: updated,
                            });
                            await loadData();
                          }}
                          className="p-1 rounded text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete JD Attachment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2 min-w-[220px]">
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Eligibility Summary</p>
            <div className="text-xs space-y-1 text-zinc-800">
              <p><span className="font-semibold">Eligible Depts:</span> {offer.eligible_departments?.join(', ') || 'All'}</p>
              <p><span className="font-semibold">Min CGPA:</span> {offer.eligibility_criteria?.min_cgpa || 'N/A'}</p>
              <p><span className="font-semibold">Max Backlogs:</span> {offer.eligibility_criteria?.max_backlogs ?? 'N/A'}</p>
            </div>
          </div>
        </div>
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

      {/* Post-Drive Completed Selection Table */}
      {offer.offer_status === 'drive_completed' && (
        <DriveCompletedPlacementsTable
          offer={offer}
          applications={applications}
          onRefresh={loadData}
        />
      )}

      {/* Student Registration Matrix */}
      <Card className="p-6 bg-white border-zinc-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900">Student Registration Matrix</h3>
            <p className="text-xs text-zinc-500">
              Registered candidates & round-wise final status tracking.
            </p>
          </div>

          {isApproved ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMatchScoresOpen(true)}
                className="gap-1.5 border-purple-300 text-purple-900 font-semibold bg-purple-50 hover:bg-purple-100"
              >
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span>View Match Scores</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const shareUrl = `${window.location.origin}/register/${offer.offer_id}`;
                  navigator.clipboard.writeText(shareUrl);
                  alert(`Shareable Student Registration Link copied to clipboard!\n\n${shareUrl}`);
                }}
                className="gap-1.5 border-zinc-300 text-zinc-900 font-semibold"
              >
                <Share2 className="h-4 w-4 text-emerald-600" />
                <span>Copy Share Link</span>
              </Button>

              <Button onClick={() => navigate(`/register/${offer.offer_id}`)} className="gap-1.5">
                <UserPlus className="h-4 w-4" />
                <span>Open Registration Form</span>
              </Button>
            </div>
          ) : (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 font-medium">
              Offer must be Approved to enable Student Registration Matrix.
            </div>
          )}
        </div>

        {applications.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            No students registered for this drive yet. Click "Register Students" to add candidates.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-700">
              <thead className="bg-zinc-100 border-b border-zinc-200 uppercase text-[11px] font-semibold text-zinc-600 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">CGPA / Backlogs</th>
                  <th className="py-3 px-4">Applied Date</th>
                  <th className="py-3 px-4">Final Drive Status</th>
                  <th className="py-3 px-4">Offer Accepted?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {applications.map((app) => {
                  const canEditCandidateStatus = canUpdateApplicationStatus && (
                    role !== 'dept_coordinator' || 
                    !departmentScope || 
                    (app.student?.department && app.student.department.toLowerCase() === departmentScope.toLowerCase())
                  );

                  return (
                    <tr key={app.application_id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-zinc-900">
                        {app.student?.roll_number || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-zinc-900">{app.student?.name || 'Unknown'}</p>
                          <p className="text-[11px] text-zinc-500">{app.student?.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-zinc-800">
                        {app.student?.department}
                      </td>
                      <td className="py-3 px-4">
                        {app.student?.ug_cgpa ? app.student.ug_cgpa.toFixed(2) : 'N/A'} / {' '}
                        <span className={app.student && app.student.backlogs_count > 0 ? 'text-rose-600 font-bold' : ''}>
                          {app.student?.backlogs_count || 0}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-500">
                        {new Date(app.applied_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {canEditCandidateStatus ? (
                          <select
                            value={app.final_status}
                            onChange={(e) => handleStatusChange(app.application_id, e.target.value as ApplicationFinalStatus, app.offer_accepted)}
                            className="text-xs bg-white border border-zinc-300 rounded px-2 py-1 font-semibold text-zinc-900 focus:ring-1 focus:ring-zinc-900"
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
                          canEditCandidateStatus ? (
                            <button
                              onClick={() => handleStatusChange(app.application_id, 'selected', !app.offer_accepted)}
                              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1 ${
                                app.offer_accepted
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                              }`}
                            >
                              {app.offer_accepted ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 text-zinc-400" />}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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

      {/* AI Match Scores Modal */}
      <MatchScoresModal
        isOpen={isMatchScoresOpen}
        onClose={() => setIsMatchScoresOpen(false)}
        offer={offer}
        applications={applications}
        onUpdate={loadData}
      />
    </div>
  );
};
