import React, { useState, useEffect, useMemo } from 'react';
import { Offer, Company, DriveApplication, ApprovalStatus, DriveMode } from '../../types/database';
import { DataStore } from '../../lib/store';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Briefcase, ShieldCheck, TrendingUp, Award, Filter } from 'lucide-react';

export interface OfferReportRow {
  offer_id: string;
  company_name: string;
  ctc_lpa: number | null;
  drive_date: string;
  drive_mode: DriveMode | string;
  job_location: string;
  approval_status: ApprovalStatus;
  total_registered: number;
  total_shortlisted: number;
  total_selected: number;
  total_offer_accepted: number;
  avg_match_score: string;
}

interface OfferReportViewProps {
  onRowsChange?: (rows: OfferReportRow[]) => void;
}

export const OfferReportView: React.FC<OfferReportViewProps> = ({ onRowsChange }) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [companiesMap, setCompaniesMap] = useState<Record<string, Company>>({});
  const [applications, setApplications] = useState<DriveApplication[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedApproval, setSelectedApproval] = useState<string>('All Statuses');
  const [selectedMode, setSelectedMode] = useState<string>('All Modes');
  const [selectedMinCtc, setSelectedMinCtc] = useState<string>('0');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [offerList, compList, appList] = await Promise.all([
          DataStore.getOffers(),
          DataStore.getCompanies(),
          DataStore.getApplications(),
        ]);
        setOffers(offerList);
        setApplications(appList);

        const cMap: Record<string, Company> = {};
        compList.forEach(c => { cMap[c.company_id] = c; });
        setCompaniesMap(cMap);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter offers based on selection
  const filteredOffers = useMemo(() => {
    return offers.filter(o => {
      if (selectedApproval !== 'All Statuses' && o.approval_status !== selectedApproval) {
        return false;
      }

      if (selectedMode !== 'All Modes' && o.drive_mode !== selectedMode) {
        return false;
      }

      const minCtcVal = parseFloat(selectedMinCtc);
      if (minCtcVal > 0 && (!o.ctc_lpa || o.ctc_lpa < minCtcVal)) {
        return false;
      }

      return true;
    });
  }, [offers, selectedApproval, selectedMode, selectedMinCtc]);

  // Top KPI metrics dynamically computed from filtered offers
  const kpis = useMemo(() => {
    const total = filteredOffers.length;
    const approved = filteredOffers.filter(o => o.approval_status === 'approved').length;

    let highestCtc = 0;
    let totalCtc = 0;
    let ctcCount = 0;

    filteredOffers.forEach(o => {
      if (o.ctc_lpa) {
        if (o.ctc_lpa > highestCtc) highestCtc = o.ctc_lpa;
        totalCtc += o.ctc_lpa;
        ctcCount++;
      }
    });

    const avgCtc = ctcCount > 0 ? (totalCtc / ctcCount).toFixed(2) : '0.00';

    return { total, approved, highestCtc: highestCtc.toFixed(2), avgCtc };
  }, [filteredOffers]);

  // Generate Report Rows
  const reportRows = useMemo(() => {
    return filteredOffers.map(o => {
      const company = companiesMap[o.company_id];
      const driveApps = applications.filter(a => a.offer_id === o.offer_id);

      const totalReg = driveApps.length;
      const totalShortlisted = driveApps.filter(a => a.final_status === 'shortlisted' || a.final_status === 'interviewed' || a.final_status === 'selected').length;
      const totalSelected = driveApps.filter(a => a.final_status === 'selected').length;
      const totalAccepted = driveApps.filter(a => a.final_status === 'selected' && a.offer_accepted).length;

      // Average Match Score calculation
      const scoredApps = driveApps.filter(a => a.match_score !== null && a.match_score !== undefined);
      let avgScoreStr = '-';
      if (scoredApps.length > 0) {
        const sum = scoredApps.reduce((acc, a) => acc + (a.match_score || 0), 0);
        avgScoreStr = `${Math.round(sum / scoredApps.length)}%`;
      }

      return {
        offer_id: o.offer_id,
        company_name: company?.name || 'Recruitment Drive',
        ctc_lpa: o.ctc_lpa ?? null,
        drive_date: o.drive_date ? new Date(o.drive_date).toLocaleDateString() : 'TBD',
        drive_mode: (o.drive_mode || 'on_campus').replace('_', ' ').toUpperCase(),
        job_location: o.job_location || 'Flexible',
        approval_status: o.approval_status,
        total_registered: totalReg,
        total_shortlisted: totalShortlisted,
        total_selected: totalSelected,
        total_offer_accepted: totalAccepted,
        avg_match_score: avgScoreStr,
      };
    });
  }, [filteredOffers, companiesMap, applications]);

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
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Total Drives</span>
            <span className="text-xl font-bold text-zinc-900 font-mono">{kpis.total}</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Approved Drives</span>
            <span className="text-xl font-bold text-emerald-700 font-mono">{kpis.approved}</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Highest Package</span>
            <span className="text-xl font-bold text-emerald-700 font-mono">₹{kpis.highestCtc} LPA</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
            <Award className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Average Package</span>
            <span className="text-xl font-bold text-blue-700 font-mono">₹{kpis.avgCtc} LPA</span>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 bg-white border-zinc-200">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-zinc-500" />
          <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Offer Drive Filters</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            label="Drive Mode"
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            options={[
              { label: 'All Modes', value: 'All Modes' },
              { label: 'On Campus', value: 'on_campus' },
              { label: 'Virtual Drive', value: 'virtual' },
              { label: 'Pooled Drive', value: 'pooled' },
            ]}
          />
          <Select
            label="Minimum Package (CTC)"
            value={selectedMinCtc}
            onChange={(e) => setSelectedMinCtc(e.target.value)}
            options={[
              { label: 'All Packages', value: '0' },
              { label: '≥ 5.0 LPA', value: '5' },
              { label: '≥ 8.0 LPA', value: '8' },
              { label: '≥ 10.0 LPA Super Dream', value: '10' },
            ]}
          />
        </div>
      </Card>

      {/* Report Table */}
      <Card className="p-4 bg-white border-zinc-200 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-zinc-900">Offer-wise Placement Drive Report</h3>
            <p className="text-xs text-zinc-500">Recruitment drives breakdown, candidate conversion pipeline & AI match averages</p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-zinc-500">Loading offer drive report data...</div>
        ) : reportRows.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">No recruitment drives match the active filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-700">
              <thead className="bg-zinc-100 border-b border-zinc-200 uppercase text-[11px] font-semibold text-zinc-600 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">CTC (LPA)</th>
                  <th className="py-3 px-4">Drive Date</th>
                  <th className="py-3 px-4">Mode / Location</th>
                  <th className="py-3 px-4">Approval Status</th>
                  <th className="py-3 px-4 text-center">Registered</th>
                  <th className="py-3 px-4 text-center">Shortlisted</th>
                  <th className="py-3 px-4 text-center">Selected</th>
                  <th className="py-3 px-4 text-center">Offer Accepted</th>
                  <th className="py-3 px-4 text-center">Avg AI Match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {reportRows.map((row) => (
                  <tr key={row.offer_id} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-zinc-900">{row.company_name}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700">
                      {row.ctc_lpa ? `₹${row.ctc_lpa.toFixed(2)} LPA` : '-'}
                    </td>
                    <td className="py-3 px-4 text-zinc-600 font-medium">{row.drive_date}</td>
                    <td className="py-3 px-4 text-zinc-700">
                      <span className="font-semibold">{row.drive_mode}</span>
                      <span className="text-[11px] text-zinc-500 block">{row.job_location}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={row.approval_status === 'approved' ? 'approved' : row.approval_status === 'rejected' ? 'rejected' : 'pending'}>
                        {row.approval_status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-zinc-800">{row.total_registered}</td>
                    <td className="py-3 px-4 text-center font-semibold text-amber-700">{row.total_shortlisted}</td>
                    <td className="py-3 px-4 text-center font-semibold text-purple-700">{row.total_selected}</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700">{row.total_offer_accepted}</td>
                    <td className="py-3 px-4 text-center font-bold text-purple-900">{row.avg_match_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pt-2 border-t border-zinc-100 text-[11px] text-zinc-500 font-medium text-right">
          Total Recruitment Drives: {reportRows.length}
        </div>
      </Card>
    </div>
  );
};
