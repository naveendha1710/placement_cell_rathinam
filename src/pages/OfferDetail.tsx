import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DataStore } from '../lib/store';
import { Offer, DriveApplication, OfferStatus, CompanyHrContact } from '../types/database';
import { RegisterStudentsInlineForm } from '../components/offers/RegisterStudentsInlineForm';
import { OfferApprovalModal } from '../components/offers/OfferApprovalModal';
import { MatchScoresModal } from '../components/offers/MatchScoresModal';
import { DriveCompletedPlacementsTable } from '../components/offers/DriveCompletedPlacementsTable';
import { OfferStagePromoteInlineForm } from '../components/offers/OfferStagePromoteInlineForm';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { 
  ArrowLeft, Calendar, MapPin, ShieldCheck, FileText, 
  Trash2, User, Layers, UserCheck, Clock, ArrowRight, History, Building2, Download,
  Users, UserPlus, MessageSquare, Phone, Mail, Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const OfferDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, canCreateEdit } = useAuth();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [applications, setApplications] = useState<DriveApplication[]>([]);
  const [hrContacts, setHrContacts] = useState<CompanyHrContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [isMatchScoresOpen, setIsMatchScoresOpen] = useState(false);

  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [targetPromoteStage, setTargetPromoteStage] = useState<OfferStatus>('warm');
  const [isPlacementsModalOpen, setIsPlacementsModalOpen] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const allOffers = await DataStore.getOffers();
      const match = allOffers.find(o => o.offer_id === id);
      setOffer(match || null);

      if (match) {
        const [allApps, contacts] = await Promise.all([
          DataStore.getApplications(match.offer_id),
          DataStore.getHrContacts(match.company_id),
        ]);
        setApplications(allApps);
        setHrContacts(contacts);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-xs text-zinc-500">Loading drive specifications...</div>;
  }

  if (!offer) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-zinc-900">Offer or placement lead not found.</p>
        <Button size="sm" variant="outline" onClick={() => navigate('/offers')}>
          Back to Offers
        </Button>
      </div>
    );
  }

  const stageBadgeStyle =
    offer.offer_status === 'drive_closed' ? 'bg-zinc-950 text-white border-zinc-950 font-bold' :
    offer.offer_status === 'drive_completed' ? 'bg-zinc-900 text-white border-zinc-900' :
    offer.offer_status === 'hot' ? 'bg-zinc-800 text-zinc-100 border-zinc-700' :
    offer.offer_status === 'warm' ? 'bg-zinc-200 text-zinc-800 border-zinc-300 font-semibold' :
    'bg-zinc-100 text-zinc-700 border-zinc-300';

  const stageLabels: Record<OfferStatus, string> = {
    cold: 'COLD LEAD',
    warm: 'WARM DISCUSSION',
    hot: 'HOT CONFIRMED DRIVE',
    drive_completed: 'DRIVE COMPLETED',
    drive_closed: 'DRIVE CLOSED & ARCHIVED',
  };

  return (
    <div className="space-y-6">
      {/* Navigation & Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/offers')} className="gap-1.5 shrink-0 bg-white">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Offers</span>
        </Button>

        <div className="flex flex-wrap items-center gap-3">
          <span className={`px-3 py-1 rounded-md text-xs font-bold border uppercase tracking-wider ${stageBadgeStyle}`}>
            {stageLabels[offer.offer_status || 'cold']}
          </span>

          {canCreateEdit && offer.offer_status !== 'drive_closed' && (
            <Button
              size="sm"
              onClick={() => {
                const next: OfferStatus = 
                  offer.offer_status === 'cold' ? 'warm' : 
                  offer.offer_status === 'warm' ? 'hot' : 
                  offer.offer_status === 'hot' ? 'drive_completed' : 'drive_closed';
                setTargetPromoteStage(next);
                setIsPromoteModalOpen(true);
              }}
              className="gap-1.5 bg-zinc-900 text-white"
            >
              <span>
                {offer.offer_status === 'cold' ? 'Promote to Warm Stage' :
                 offer.offer_status === 'warm' ? 'Promote to Hot Stage' :
                 offer.offer_status === 'hot' ? 'Mark Drive Completed' : 'Close & Archive Drive'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          <Badge variant={offer.approval_status as any}>
            {offer.approval_status.replace('_', ' ').toUpperCase()}
          </Badge>

          <Button size="sm" variant="outline" onClick={() => setIsApprovalOpen(true)} className="gap-1.5 bg-white">
            <ShieldCheck className="h-4 w-4" />
            <span>Approval Workflow</span>
          </Button>
        </div>
      </div>

      {/* Inline Stage Progressive Promotion Form */}
      {isPromoteModalOpen && offer && (
        <OfferStagePromoteInlineForm
          onClose={() => setIsPromoteModalOpen(false)}
          offer={offer}
          targetStage={targetPromoteStage}
          onSuccess={async () => {
            await loadData();
            if (targetPromoteStage === 'drive_completed') {
              setIsPlacementsModalOpen(true);
            }
          }}
        />
      )}

      {/* Post-Drive Selection & Placed Candidates Modal Popup */}
      {isPlacementsModalOpen && offer && (
        <DriveCompletedPlacementsTable
          offer={offer}
          applications={applications}
          onRefresh={loadData}
          isOpen={isPlacementsModalOpen}
          onClose={() => setIsPlacementsModalOpen(false)}
        />
      )}

      {/* Main Enterprise Details Sheet */}
      <Card className="p-6 bg-white border border-zinc-200 space-y-6 shadow-xs">
        {/* Company Header */}
        <div className="flex items-start justify-between border-b border-zinc-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-lg">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">
                {offer.company?.name || 'Company Placement Drive'}
              </h1>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                {offer.company?.industry_domain || 'Technology & Engineering Domain'}
              </p>
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="text-zinc-400 block text-[10px] font-bold uppercase tracking-wider">Created By</span>
            <span className="font-semibold text-zinc-900">{offer.creator_profile?.name || 'Placement Officer'}</span>
            {offer.creator_profile?.email && (
              <span className="text-[11px] text-zinc-500 block font-mono">{offer.creator_profile.email}</span>
            )}
          </div>
        </div>

        {/* Structured 60% / 40% Grid Layout Split */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column: 60% (lg:col-span-3) — Lead & Scheduling Overview */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider border-b border-zinc-100 pb-2">
              Lead & Scheduling Overview
            </h3>

            <div className="space-y-3 text-xs">
              {/* Structured HR Contact Person Card */}
              {(() => {
                const matchedHr = hrContacts.find(c => 
                  (offer.contact_person_name && c.name && offer.contact_person_name.toLowerCase().includes(c.name.toLowerCase())) || c.is_primary
                ) || (hrContacts.length > 0 ? hrContacts[0] : null);

                const hrName = matchedHr?.name || offer.contact_person_name?.split('(')[0]?.trim() || offer.company?.contact_person_name || 'HR Contact Person';
                const hrDesignation = matchedHr?.designation || (offer.contact_person_name?.includes('(') ? offer.contact_person_name.split('(')[1]?.replace(')', '') : null);
                const hrMobile = matchedHr?.mobile_number || offer.company?.contact_person_mobile || null;
                const hrEmail = matchedHr?.email || null;

                return (
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2 mb-3">
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                      <div className="flex items-center gap-2 font-bold text-zinc-900 text-sm">
                        <User className="h-4 w-4 text-zinc-700" />
                        <span>{hrName}</span>
                      </div>
                      {hrDesignation && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-200 text-zinc-800 uppercase">
                          {hrDesignation}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-0.5">
                      <div className="flex items-center gap-2 text-zinc-700">
                        <Phone className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        <span className="font-mono">{hrMobile || 'Mobile not provided'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-700">
                        <Mail className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        <span className="font-mono truncate">{hrEmail || 'Email not provided'}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {offer.tentative_drive_date && (
                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-500 font-medium">Tentative Drive Schedule:</span>
                  <span className="font-semibold text-zinc-900">{offer.tentative_drive_date}</span>
                </div>
              )}

              {offer.expected_openings && (
                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-500 font-medium">Expected Vacancies:</span>
                  <span className="font-semibold text-zinc-900">{offer.expected_openings} Openings</span>
                </div>
              )}

              {(offer.offer_status === 'hot' || offer.offer_status === 'drive_completed') && (
                <>
                  <div className="flex justify-between py-2 border-b border-zinc-100">
                    <span className="text-zinc-500 font-medium">Confirmed Drive Date:</span>
                    <span className="font-semibold text-zinc-900 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-zinc-400" /> {offer.drive_date || 'To be announced'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-zinc-100">
                    <span className="text-zinc-500 font-medium">Drive Mode:</span>
                    <span className="font-semibold text-zinc-900 uppercase">{offer.drive_mode?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-zinc-100">
                    <span className="text-zinc-500 font-medium">Job Location:</span>
                    <span className="font-semibold text-zinc-900 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-zinc-400" /> {offer.job_location || 'Flexible'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column: 40% (lg:col-span-2) — Coordinator Remarks & Notes (Chat Feed) */}
          <div className="lg:col-span-2 space-y-3 lg:border-l lg:border-zinc-200 lg:pl-6">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider border-b border-zinc-100 pb-2 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-zinc-700" /> Coordinator Remarks & Notes
            </h3>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {offer.remarks && (
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-zinc-500" />
                      {offer.creator_profile?.name || 'Placement Officer'}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">Lead Note</span>
                  </div>
                  <p className="text-zinc-800 leading-relaxed font-normal bg-white p-2.5 rounded border border-zinc-200">
                    {offer.remarks}
                  </p>
                </div>
              )}

              {offer.stage_history && offer.stage_history.map((hist, idx) => (
                <div key={hist.id || idx} className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-zinc-200 text-zinc-800">
                        {hist.stage.replace('_', ' ')}
                      </span>
                      <span className="font-bold text-zinc-900">
                        {hist.updated_by_name || 'Coordinator'}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {new Date(hist.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  {hist.notes && (
                    <p className="text-zinc-800 leading-relaxed font-normal bg-white p-2 rounded border border-zinc-200">
                      {hist.notes}
                    </p>
                  )}
                </div>
              ))}

              {!offer.remarks && (!offer.stage_history || offer.stage_history.length === 0) && (
                <p className="text-xs text-zinc-400 italic py-6 text-center">No remarks or discussion notes logged yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* MULTI-ROLE POSITIONS (WHEN HOT OR COMPLETED) */}
        {offer.job_roles && offer.job_roles.length > 0 && (
          <div className="pt-4 border-t border-zinc-200 space-y-3">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-zinc-700" /> Configured Job Roles & Positions ({offer.job_roles.length})
            </h3>
            
            <div className="overflow-x-auto border border-zinc-200 rounded-lg">
              <table className="w-full text-left text-xs text-zinc-700">
                <thead className="bg-zinc-100 border-b border-zinc-200 uppercase text-[11px] font-semibold text-zinc-600 tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Role Title</th>
                    <th className="py-2.5 px-4">CTC (LPA)</th>
                    <th className="py-2.5 px-4">Eligible Depts</th>
                    <th className="py-2.5 px-4">Batches</th>
                    <th className="py-2.5 px-4">Min CGPA</th>
                    <th className="py-2.5 px-4">Vacancies</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {offer.job_roles.map((role) => (
                    <tr key={role.role_id} className="hover:bg-zinc-50">
                      <td className="py-3 px-4 font-bold text-zinc-900">{role.role_title}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">{role.ctc_lpa ? `${role.ctc_lpa} LPA` : 'TBD'}</td>
                      <td className="py-3 px-4 text-zinc-600">{role.eligible_departments?.join(', ') || 'All'}</td>
                      <td className="py-3 px-4 text-zinc-600">{role.eligibility_criteria?.allowed_batches?.map(b => `Batch ${b}`).join(', ') || 'All'}</td>
                      <td className="py-3 px-4 text-zinc-600">{role.eligibility_criteria?.min_cgpa || 'N/A'}</td>
                      <td className="py-3 px-4 text-zinc-600">{role.vacancies ?? 'Open'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* JD Attachments Row */}
        {offer.jd_files && offer.jd_files.length > 0 && (
          <div className="pt-4 border-t border-zinc-200 space-y-2">
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Job Description Attachments</h4>
            <div className="flex flex-wrap gap-2">
              {offer.jd_files.map((file, idx) => {
                const fileName = file.split('/').pop() || file;
                return (
                  <a
                    key={idx}
                    href={file}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-md text-xs font-semibold text-zinc-800 hover:bg-zinc-100 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5 text-zinc-500" />
                    <span>{fileName}</span>
                  </a>
                );
              })}
            </div>
          </div>
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



      {/* Student Registration Card — ONLY shown in 'hot' stage */}
      {offer.offer_status === 'hot' && (
        <Card className="p-6 bg-white border border-zinc-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-zinc-100 rounded-lg text-zinc-900 border border-zinc-200">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-zinc-900">Student Registration</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-zinc-900 text-white">
                    {applications.length} {applications.length === 1 ? 'Candidate' : 'Candidates'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  View registered candidate matrix, AI match scores, round-wise status tracking, & placement selections on a dedicated page.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {canCreateEdit && (
                <Button size="sm" variant="outline" onClick={() => setIsRegisterOpen(true)} className="gap-1.5 bg-white">
                  <UserPlus className="h-4 w-4" />
                  <span>Register Students</span>
                </Button>
              )}

              <Button
                size="sm"
                onClick={() => navigate(`/offers/${offer.offer_id}/candidates`)}
                className="gap-1.5 bg-zinc-900 text-white shadow-xs"
              >
                <span>View Registration Matrix</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Placed Candidates Summary Card — shown in 'drive_completed' and 'drive_closed' stages */}
      {(offer.offer_status === 'drive_completed' || offer.offer_status === 'drive_closed') && (
        <Card className="p-6 bg-white border border-zinc-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-lg text-emerald-700 border border-emerald-200">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-zinc-900">Placed Candidates & Drive Outcomes</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-700 text-white">
                    {applications.filter(a => a.final_status === 'selected' || a.offer_accepted).length} Placed
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {offer.offer_status === 'drive_closed'
                    ? 'Review confirmed placed candidates for this closed & archived recruitment drive.'
                    : 'Select and confirm students who received job offers from this recruitment drive.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Button
                size="sm"
                onClick={() => setIsPlacementsModalOpen(true)}
                className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-xs"
              >
                <Award className="h-4 w-4" />
                <span>{offer.offer_status === 'drive_closed' ? 'View Placed Candidates' : 'Manage Placed Candidates'}</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

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
