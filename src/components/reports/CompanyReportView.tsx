import React, { useState, useEffect, useMemo } from 'react';
import { Company, Offer, DriveApplication, ApprovalStatus } from '../../types/database';
import { DataStore } from '../../lib/store';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Building2, ShieldCheck, Clock, Star, Filter } from 'lucide-react';

export interface CompanyReportRow {
  company_id: string;
  name: string;
  industry_domain: string;
  approval_status: ApprovalStatus;
  star_rating: number;
  total_offers_posted: number;
  total_students_registered: number;
  total_selected: number;
  total_placed: number;
}

interface CompanyReportViewProps {
  onRowsChange?: (rows: CompanyReportRow[]) => void;
}

export const CompanyReportView: React.FC<CompanyReportViewProps> = ({ onRowsChange }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [applications, setApplications] = useState<DriveApplication[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedApproval, setSelectedApproval] = useState<string>('All Statuses');
  const [selectedRatingTier, setSelectedRatingTier] = useState<string>('All Ratings');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [compList, offerList, appList] = await Promise.all([
          DataStore.getCompanies(),
          DataStore.getOffers(),
          DataStore.getApplications(),
        ]);
        setCompanies(compList);
        setOffers(offerList);
        setApplications(appList);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter companies based on selection
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      if (selectedApproval !== 'All Statuses' && c.approval_status !== selectedApproval) {
        return false;
      }

      if (selectedRatingTier === '5_star' && c.star_rating !== 5) {
        return false;
      } else if (selectedRatingTier === '4_plus' && (!c.star_rating || c.star_rating < 4)) {
        return false;
      } else if (selectedRatingTier === '3_plus' && (!c.star_rating || c.star_rating < 3)) {
        return false;
      }

      return true;
    });
  }, [companies, selectedApproval, selectedRatingTier]);

  // Top KPI metrics dynamically computed from filtered companies
  const kpis = useMemo(() => {
    const total = filteredCompanies.length;
    const approved = filteredCompanies.filter(c => c.approval_status === 'approved').length;
    const pending = filteredCompanies.filter(c => c.approval_status === 'pending_approval' || c.approval_status === 'draft').length;
    const superDream = filteredCompanies.filter(c => c.star_rating === 5).length;
    return { total, approved, pending, superDream };
  }, [filteredCompanies]);

  // Generate Report Rows
  const reportRows = useMemo(() => {
    return filteredCompanies.map(c => {
      const compOffers = offers.filter(o => o.company_id === c.company_id);
      const offerIds = new Set(compOffers.map(o => o.offer_id));

      const compApps = applications.filter(a => offerIds.has(a.offer_id));
      const registeredCount = compApps.length;
      const selectedCount = compApps.filter(a => a.final_status === 'selected').length;
      const placedCount = compApps.filter(a => a.final_status === 'selected' && a.offer_accepted).length;

      return {
        company_id: c.company_id,
        name: c.name,
        industry_domain: c.industry_domain || 'General Corporate',
        approval_status: c.approval_status,
        star_rating: c.star_rating || 3,
        total_offers_posted: compOffers.length,
        total_students_registered: registeredCount,
        total_selected: selectedCount,
        total_placed: placedCount,
      };
    });
  }, [filteredCompanies, offers, applications]);

  // Pass rows to parent for Excel export
  useEffect(() => {
    if (onRowsChange) {
      onRowsChange(reportRows);
    }
  }, [reportRows, onRowsChange]);

  return (
    <div className="space-y-6">
      
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-zinc-900 text-white shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Total Companies</span>
            <span className="text-xl font-bold text-zinc-900 font-mono">{kpis.total}</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Approved Companies</span>
            <span className="text-xl font-bold text-emerald-700 font-mono">{kpis.approved}</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Pending Approval</span>
            <span className="text-xl font-bold text-amber-700 font-mono">{kpis.pending}</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
            <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Super Dream (5★)</span>
            <span className="text-xl font-bold text-amber-600 font-mono">{kpis.superDream}</span>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 bg-white border-zinc-200">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-zinc-500" />
          <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Company Filters</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Approval Status"
            value={selectedApproval}
            onChange={(e) => setSelectedApproval(e.target.value)}
            options={[
              { label: 'All Statuses', value: 'All Statuses' },
              { label: 'Approved', value: 'approved' },
              { label: 'Pending Approval', value: 'pending_approval' },
              { label: 'Draft', value: 'draft' },
              { label: 'Rejected', value: 'rejected' },
            ]}
          />
          <Select
            label="Star Rating Tier"
            value={selectedRatingTier}
            onChange={(e) => setSelectedRatingTier(e.target.value)}
            options={[
              { label: 'All Ratings', value: 'All Ratings' },
              { label: '5 Star Super Dream', value: '5_star' },
              { label: '4+ Star Tier 1', value: '4_plus' },
              { label: '3+ Star Standard', value: '3_plus' },
            ]}
          />
        </div>
      </Card>

      {/* Report Table */}
      <Card className="p-4 bg-white border-zinc-200 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-zinc-900">Company-wise Corporate Report</h3>
            <p className="text-xs text-zinc-500">Corporate partners recruitment performance & offer metrics</p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-zinc-500">Loading company report data...</div>
        ) : reportRows.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">No companies match the active filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-700">
              <thead className="bg-zinc-100 border-b border-zinc-200 uppercase text-[11px] font-semibold text-zinc-600 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Industry Domain</th>
                  <th className="py-3 px-4">Approval Status</th>
                  <th className="py-3 px-4">Star Rating</th>
                  <th className="py-3 px-4 text-center">Offers Posted</th>
                  <th className="py-3 px-4 text-center">Registered Candidates</th>
                  <th className="py-3 px-4 text-center">Selected</th>
                  <th className="py-3 px-4 text-center">Placed (Accepted)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {reportRows.map((row) => (
                  <tr key={row.company_id} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-zinc-900">{row.name}</td>
                    <td className="py-3 px-4 font-medium text-zinc-700">{row.industry_domain}</td>
                    <td className="py-3 px-4">
                      <Badge variant={row.approval_status === 'approved' ? 'approved' : row.approval_status === 'rejected' ? 'rejected' : 'pending'}>
                        {row.approval_status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-semibold text-amber-600">
                      {'★'.repeat(row.star_rating)}{'☆'.repeat(5 - row.star_rating)} ({row.star_rating}★)
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-zinc-900">{row.total_offers_posted}</td>
                    <td className="py-3 px-4 text-center font-semibold text-zinc-800">{row.total_students_registered}</td>
                    <td className="py-3 px-4 text-center font-semibold text-purple-700">{row.total_selected}</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700">{row.total_placed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pt-2 border-t border-zinc-100 text-[11px] text-zinc-500 font-medium text-right">
          Total Corporate Partners: {reportRows.length}
        </div>
      </Card>
    </div>
  );
};
