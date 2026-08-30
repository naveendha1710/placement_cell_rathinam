import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DataStore } from '../lib/store';
import { Company, Offer } from '../types/database';
import { HrContactsManager } from '../components/companies/HrContactsManager';
import { CompanyApprovalModal } from '../components/companies/CompanyApprovalModal';
import { CompanyInlineForm } from '../components/companies/CompanyInlineForm';
import { OfferInlineForm } from '../components/offers/OfferInlineForm';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { 
  Building2, ArrowLeft, Globe, MapPin, Users, Star, 
  ShieldCheck, Briefcase, Plus, ExternalLink, Calendar, ChevronRight, Edit,
  PauseCircle, PlayCircle, XCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const CompanyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, canCreateEdit, canApprove } = useAuth();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline Form States
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [isAddOfferOpen, setIsAddOfferOpen] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const companies = await DataStore.getCompanies();
      const match = companies.find(c => c.company_id === id);
      setCompany(match || null);

      const allOffers = await DataStore.getOffers();
      setOffers(allOffers.filter(o => o.company_id === id));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleSaveCompany = async (companyData: Partial<Company> & { name: string }) => {
    await DataStore.saveCompany(companyData);
    setIsEditCompanyOpen(false);
    await loadData();
  };

  const handleSaveOffer = async (offerData: Partial<Offer> & { company_id: string }) => {
    await DataStore.saveOffer(offerData);
    setIsAddOfferOpen(false);
    await loadData();
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-zinc-500">Loading company details...</div>;
  }

  if (!company) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-zinc-200">
        <h2 className="text-base font-bold text-zinc-900 mb-2">Company Profile Not Found</h2>
        <Button variant="outline" size="sm" onClick={() => navigate('/companies')}>
          Back to Companies Directory
        </Button>
      </div>
    );
  }

  const isCompanyApproved = company.approval_status === 'approved';

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigate('/companies')} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Companies</span>
        </Button>

        <div className="flex items-center gap-3">
          {canCreateEdit && (
            <Button size="sm" variant="outline" onClick={() => setIsEditCompanyOpen(!isEditCompanyOpen)} className="gap-1.5">
              <Edit className="h-4 w-4" />
              <span>Edit Company Info</span>
            </Button>
          )}
          <Badge variant={company.approval_status as any}>
            {company.approval_status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Inline Company Edit Form */}
      {isEditCompanyOpen && (
        <CompanyInlineForm
          company={company}
          onSave={handleSaveCompany}
          onClose={() => setIsEditCompanyOpen(false)}
        />
      )}

      {/* 50% - 50% Split Two-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT 50% COLUMN: Company Details & HR Contacts */}
        <div className="w-full lg:w-1/2 space-y-6">
          {/* Company Overview Card */}
          <Card className="p-6 bg-white border-zinc-200 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-xl shadow-xs">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-zinc-900">{company.name}</h1>
                  <p className="text-xs text-zinc-500 font-medium">
                    {company.industry_domain || 'Technology & Services'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 text-xs">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                <span>Tier {company.star_rating} ★</span>
              </div>
            </div>

            {/* Quick Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-zinc-100">
              <div>
                <span className="text-zinc-400 font-medium block text-[10px] uppercase">Account Status</span>
                <span className="font-bold text-zinc-800 uppercase">{company.status}</span>
              </div>
              <div>
                <span className="text-zinc-400 font-medium block text-[10px] uppercase">Employee Count</span>
                <span className="font-semibold text-zinc-800">{company.employee_count ? `${company.employee_count.toLocaleString()} Employees` : 'N/A'}</span>
              </div>
              <div>
                <span className="text-zinc-400 font-medium block text-[10px] uppercase">Official Website</span>
                {company.website_url ? (
                  <a
                    href={company.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-900 font-semibold hover:underline flex items-center gap-1 truncate"
                  >
                    <Globe className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate">{company.website_url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-zinc-400" />
                  </a>
                ) : (
                  <span className="text-zinc-400">Not provided</span>
                )}
              </div>
              <div>
                <span className="text-zinc-400 font-medium block text-[10px] uppercase">Industry Tier</span>
                <span className="font-bold text-amber-600">Tier {company.star_rating} ★</span>
              </div>
            </div>

            {company.address && (
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-700">
                <span className="font-bold text-zinc-900 block mb-0.5">Office Address:</span>
                <p>{company.address}</p>
              </div>
            )}

            {/* Live Viewable Google Maps Embed Card */}
            <div className="p-4 bg-zinc-900 text-white rounded-xl border border-zinc-900 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                    Company Location Map
                  </span>
                </div>
                {company.map_link ? (
                  <a
                    href={company.map_link}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors flex items-center gap-1"
                  >
                    <span>Full Map View</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-[11px] text-zinc-400">Live Map View</span>
                )}
              </div>

              {/* Viewable Live Google Maps Iframe Embed */}
              <div className="relative h-56 w-full rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 shadow-inner">
                <iframe
                  title={`${company.name} Map Location`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(company.address || company.name || 'Tamil Nadu')}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                />
              </div>
            </div>

            {/* Primary Contact Snapshot Box */}
            <div className="p-3 rounded-lg bg-zinc-900 text-white flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase block">Primary Contact Snapshot</span>
                <p className="font-bold text-sm text-zinc-50">{company.contact_person_name || 'No Primary Contact set'}</p>
              </div>
              <div className="text-right font-mono text-zinc-300">
                {company.contact_person_mobile || '-'}
              </div>
            </div>
          </Card>

          {/* HR Contacts Sub-table Manager (With Inline Form) */}
          <Card className="p-6 bg-white border-zinc-200">
            <HrContactsManager companyId={company.company_id} onUpdate={loadData} />
          </Card>
        </div>

        {/* RIGHT 50% COLUMN: Attached Job Offers & Drives */}
        <div className="w-full lg:w-1/2 space-y-6">
          {/* Inline Add Offer Form */}
          {isAddOfferOpen && (
            <OfferInlineForm
              preselectedCompanyId={company.company_id}
              onSave={handleSaveOffer}
              onClose={() => setIsAddOfferOpen(false)}
            />
          )}

          <Card className="p-6 bg-white border-zinc-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-zinc-700" />
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Job Offers & Drives</h3>
                  <p className="text-xs text-zinc-500">{offers.length} active offer(s) for {company.name}</p>
                </div>
              </div>

              {canCreateEdit && !isAddOfferOpen && (
                !isCompanyApproved ? (
                  <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded font-medium">
                    Approve company to unlock Add Offer
                  </span>
                ) : company.status === 'inactive' || company.status === 'paused' ? (
                  <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded font-medium flex items-center gap-1">
                    <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
                    <span>Company is paused. Resume company to add job offers.</span>
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setIsAddOfferOpen(true)}
                    className="gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Job Offer</span>
                  </Button>
                )
              )}
            </div>

            {offers.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500 space-y-2">
                <Briefcase className="h-8 w-8 text-zinc-300 mx-auto" />
                <p className="font-medium text-zinc-700">No job offers added for this company yet.</p>
                {isCompanyApproved && company.status !== 'inactive' && company.status !== 'paused' && canCreateEdit && !isAddOfferOpen && (
                  <Button size="sm" variant="outline" onClick={() => setIsAddOfferOpen(true)}>
                    Create First Job Offer
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {offers.map((off) => (
                  <div
                    key={off.offer_id}
                    onClick={() => navigate(`/offers/${off.offer_id}`)}
                    className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300 transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        {off.job_roles && off.job_roles.length > 0 ? (
                          off.job_roles.length === 1 ? (
                            <>
                              <span className="text-sm font-extrabold text-zinc-900">
                                {off.job_roles[0].role_title || 'Job Role'}
                              </span>
                              <span className="text-xs font-bold text-zinc-800 bg-zinc-200/80 px-2 py-0.5 rounded">
                                {off.job_roles[0].ctc_lpa ? `${off.job_roles[0].ctc_lpa} LPA` : 'CTC TBD'}
                              </span>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-bold text-zinc-900 bg-zinc-200 px-2 py-0.5 rounded">
                                {off.job_roles.length} Roles
                              </span>
                              <span className="text-xs font-semibold text-zinc-800 truncate max-w-[280px]">
                                {off.job_roles.map(r => `${r.role_title || 'Role'} (${r.ctc_lpa ? `${r.ctc_lpa} LPA` : 'TBD'})`).join(', ')}
                              </span>
                            </div>
                          )
                        ) : (
                          <>
                            <span className="text-base font-extrabold text-zinc-900">
                              {off.ctc_lpa ? `${off.ctc_lpa} LPA` : 'CTC TBD'}
                            </span>
                            {off.base_lpa && (
                              <span className="text-xs text-zinc-500 font-medium">
                                (Base: {off.base_lpa} LPA)
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={off.approval_status as any}>
                          {off.approval_status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600">
                      <span className="font-bold text-zinc-800 uppercase text-[10px] bg-white px-2 py-0.5 rounded border border-zinc-200">
                        {off.offer_status?.replace('_', ' ') || 'COLD'}
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                        {off.drive_date || off.tentative_drive_date || 'Schedule TBD'}
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                        {off.job_location || 'Flexible Location'}
                      </span>
                    </div>

                    {off.eligible_departments && off.eligible_departments.length > 0 && (
                      <p className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/60">
                        <span className="font-semibold text-zinc-700">Depts:</span> {off.eligible_departments.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Company Approval Action Controls (Moved below Job Offers & Drives card) */}
          <Card className="p-5 bg-white border-zinc-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-zinc-700" />
                  <span>Company Approval Management</span>
                </h3>
                <p className="text-xs text-zinc-500">Review approval status, submission history, and administrator actions.</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={company.approval_status as any}>
                  {company.approval_status.replace('_', ' ').toUpperCase()}
                </Badge>
                {company.status === 'inactive' && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                    PAUSED
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-zinc-100">
              {/* Actions for Pending Approval */}
              {canApprove && company.approval_status === 'pending_approval' && (
                <>
                  <Button
                    size="sm"
                    onClick={async () => {
                      await DataStore.updateCompanyApproval(company.company_id, 'approved', user?.id);
                      await loadData();
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-bold"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Approve Company</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await DataStore.updateCompanyApproval(company.company_id, 'rejected', user?.id, 'Rejected by Admin');
                      await loadData();
                    }}
                    className="border-rose-300 text-rose-700 hover:bg-rose-50 gap-1.5 font-bold"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Reject Company</span>
                  </Button>
                </>
              )}

              {/* Actions for Approved Companies: Pause / Resume options */}
              {canApprove && company.approval_status === 'approved' && (
                <>
                  {company.status === 'active' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await DataStore.saveCompany({ ...company, status: 'inactive' });
                        await loadData();
                      }}
                      className="border-amber-300 text-amber-800 hover:bg-amber-50 gap-1.5 font-bold"
                    >
                      <PauseCircle className="h-4 w-4" />
                      <span>Pause Company</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={async () => {
                        await DataStore.saveCompany({ ...company, status: 'active' });
                        await loadData();
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-bold"
                    >
                      <PlayCircle className="h-4 w-4" />
                      <span>Resume Company</span>
                    </Button>
                  )}
                </>
              )}

              {/* Actions for Rejected Companies */}
              {canApprove && company.approval_status === 'rejected' && (
                <Button
                  size="sm"
                  onClick={async () => {
                    await DataStore.updateCompanyApproval(company.company_id, 'approved', user?.id);
                    await loadData();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-bold"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Re-Approve Company</span>
                </Button>
              )}

              <Button size="sm" variant="outline" onClick={() => setIsApprovalOpen(true)} className="gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                <span>View Full Workflow History</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Approval Workflow Modal */}
      <CompanyApprovalModal
        isOpen={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
        company={company}
        onApprove={async () => {
          await DataStore.updateCompanyApproval(company.company_id, 'approved', user?.id);
          await loadData();
        }}
        onReject={async (reason) => {
          await DataStore.updateCompanyApproval(company.company_id, 'rejected', user?.id, reason);
          await loadData();
        }}
        onSubmitApproval={async () => {
          await DataStore.updateCompanyApproval(company.company_id, 'pending_approval');
          await loadData();
        }}
      />
    </div>
  );
};
