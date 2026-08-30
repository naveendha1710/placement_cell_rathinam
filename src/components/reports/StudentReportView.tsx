import React, { useState, useEffect, useMemo } from 'react';
import { Student, DriveApplication, Company, Offer, PlacementStatus } from '../../types/database';
import { DataStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { GraduationCap, CheckCircle2, Clock, UserX, Filter } from 'lucide-react';

const DEPARTMENTS_LIST = [
  'All Departments',
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Artificial Intelligence & Data Science',
  'Master of Computer Applications',
];

export interface StudentReportRow {
  student_id: string;
  roll_number: string;
  name: string;
  department: string;
  email: string;
  placement_status: PlacementStatus;
  residency: string;
  ug_cgpa: number | null;
  backlogs_count: number;
  company_name: string;
  ctc_lpa: number | null;
  final_status: string;
  offer_accepted: string;
}

interface StudentReportViewProps {
  onRowsChange?: (rows: StudentReportRow[]) => void;
}

export const StudentReportView: React.FC<StudentReportViewProps> = ({ onRowsChange }) => {
  const { role, departmentScope } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [applications, setApplications] = useState<DriveApplication[]>([]);
  const [companiesMap, setCompaniesMap] = useState<Record<string, Company>>({});
  const [offersMap, setOffersMap] = useState<Record<string, Offer>>({});
  const [loading, setLoading] = useState(true);

  // Filter states
  const defaultDept = (role === 'dept_coordinator' && departmentScope) ? departmentScope : 'All Departments';
  const [selectedDept, setSelectedDept] = useState<string>(defaultDept);
  const [selectedStatus, setSelectedStatus] = useState<string>('All Statuses');
  const [selectedResidency, setSelectedResidency] = useState<string>('All Residencies');
  const [selectedCompany, setSelectedCompany] = useState<string>('All Companies');
  const [selectedDriveStage, setSelectedDriveStage] = useState<string>('All Stages');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [stList, appList, compList, offerList] = await Promise.all([
          DataStore.getStudents(),
          DataStore.getApplications(),
          DataStore.getCompanies(),
          DataStore.getOffers(),
        ]);

        setStudents(stList);
        setApplications(appList);

        const cMap: Record<string, Company> = {};
        compList.forEach(c => { cMap[c.company_id] = c; });
        setCompaniesMap(cMap);

        const oMap: Record<string, Offer> = {};
        offerList.forEach(o => { oMap[o.offer_id] = o; });
        setOffersMap(oMap);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter students based on academic & profile selection
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Dept Coordinator Scope Guard
      if (role === 'dept_coordinator' && departmentScope) {
        if (s.department.toLowerCase() !== departmentScope.toLowerCase()) return false;
      } else if (selectedDept !== 'All Departments' && s.department !== selectedDept) {
        return false;
      }

      if (selectedStatus !== 'All Statuses' && s.placement_status !== selectedStatus) {
        return false;
      }

      if (selectedResidency !== 'All Residencies' && s.residency !== selectedResidency) {
        return false;
      }

      return true;
    });
  }, [students, selectedDept, selectedStatus, selectedResidency, role, departmentScope]);

  // Unique Company Names list for filter dropdown
  const companyOptions = useMemo(() => {
    const names = Array.from(new Set(Object.values(companiesMap).map(c => c.name))).sort();
    return ['All Companies', ...names];
  }, [companiesMap]);

  // Generate Report Rows based on student, company, and drive stage filters
  const reportRows = useMemo(() => {
    const rows: StudentReportRow[] = [];

    filteredStudents.forEach(st => {
      const stApps = applications.filter(a => a.student_id === st.student_id);

      if (stApps.length === 0) {
        if (selectedCompany === 'All Companies' && selectedDriveStage === 'All Stages') {
          rows.push({
            student_id: st.student_id,
            roll_number: st.roll_number,
            name: st.name,
            department: st.department,
            email: st.email,
            placement_status: st.placement_status,
            residency: st.residency || 'day_scholar',
            ug_cgpa: st.ug_cgpa ?? null,
            backlogs_count: st.backlogs_count || 0,
            company_name: '-',
            ctc_lpa: null,
            final_status: '-',
            offer_accepted: '-',
          });
        }
      } else {
        stApps.forEach(app => {
          const offer = offersMap[app.offer_id];
          const company = offer ? companiesMap[offer.company_id] : null;
          const compName = company?.name || 'Company Offer';
          const finalStatusLower = (app.final_status || '').toLowerCase();

          // Company Filter
          if (selectedCompany !== 'All Companies' && compName !== selectedCompany) {
            return;
          }

          // Drive Stage / Stage Filter
          if (selectedDriveStage !== 'All Stages') {
            if (selectedDriveStage === 'selected' && finalStatusLower !== 'selected') return;
            if (selectedDriveStage === 'shortlisted' && finalStatusLower !== 'shortlisted') return;
            if (selectedDriveStage === 'interviewed' && finalStatusLower !== 'interviewed') return;
            if (selectedDriveStage === 'applied' && finalStatusLower !== 'applied') return;
            if (selectedDriveStage === 'rejected' && finalStatusLower !== 'rejected') return;
          }

          rows.push({
            student_id: st.student_id,
            roll_number: st.roll_number,
            name: st.name,
            department: st.department,
            email: st.email,
            placement_status: st.placement_status,
            residency: st.residency || 'day_scholar',
            ug_cgpa: st.ug_cgpa ?? null,
            backlogs_count: st.backlogs_count || 0,
            company_name: compName,
            ctc_lpa: offer?.ctc_lpa ?? null,
            final_status: app.final_status.toUpperCase(),
            offer_accepted: app.final_status === 'selected' ? (app.offer_accepted ? 'Yes' : 'Pending') : '-',
          });
        });
      }
    });

    return rows;
  }, [filteredStudents, applications, offersMap, companiesMap, selectedCompany, selectedDriveStage]);

  // Compute top KPI cards dynamically from active report rows & filtered students
  const kpis = useMemo(() => {
    const total = filteredStudents.length;
    const placed = filteredStudents.filter(s => s.placement_status === 'placed').length;
    const unplaced = filteredStudents.filter(s => s.placement_status === 'yet_to_be_placed').length;
    const optedOut = filteredStudents.filter(s => s.placement_status === 'opted_out').length;
    return { total, placed, unplaced, optedOut };
  }, [filteredStudents]);

  // Distinct student count in current table view
  const distinctCandidateCount = useMemo(() => {
    const set = new Set(reportRows.map(r => r.student_id));
    return set.size;
  }, [reportRows]);

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
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Total Registered</span>
            <span className="text-xl font-bold text-zinc-900 font-mono">{kpis.total}</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Placed Candidates</span>
            <span className="text-xl font-bold text-emerald-700 font-mono">{kpis.placed}</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Yet to be Placed Candidates</span>
            <span className="text-xl font-bold text-amber-700 font-mono">{kpis.unplaced}</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200 shrink-0">
            <UserX className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Opted Out</span>
            <span className="text-xl font-bold text-zinc-800 font-mono">{kpis.optedOut}</span>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 bg-white border-zinc-200">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-zinc-500" />
          <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Student & Drive Filters</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Select
            label="Department"
            value={selectedDept}
            disabled={role === 'dept_coordinator'}
            onChange={(e) => setSelectedDept(e.target.value)}
            options={DEPARTMENTS_LIST.map(d => ({ label: d, value: d }))}
          />
          <Select
            label="Placement Status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            options={[
              { label: 'All Statuses', value: 'All Statuses' },
              { label: 'Yet to be Placed', value: 'yet_to_be_placed' },
              { label: 'Placed', value: 'placed' },
              { label: 'Opted Out', value: 'opted_out' },
            ]}
          />
          <Select
            label="Applied Company"
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            options={companyOptions.map(c => ({ label: c, value: c }))}
          />
          <Select
            label="Drive Application Stage"
            value={selectedDriveStage}
            onChange={(e) => setSelectedDriveStage(e.target.value)}
            options={[
              { label: 'All Stages', value: 'All Stages' },
              { label: 'Selected / Placed', value: 'selected' },
              { label: 'Shortlisted', value: 'shortlisted' },
              { label: 'Interviewed', value: 'interviewed' },
              { label: 'Applied', value: 'applied' },
              { label: 'Rejected', value: 'rejected' },
            ]}
          />
          <Select
            label="Residency Type"
            value={selectedResidency}
            onChange={(e) => setSelectedResidency(e.target.value)}
            options={[
              { label: 'All Residencies', value: 'All Residencies' },
              { label: 'Day Scholar', value: 'day_scholar' },
              { label: 'Hosteller', value: 'hosteller' },
            ]}
          />
        </div>
      </Card>

      {/* Report Table */}
      <Card className="p-4 bg-white border-zinc-200 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-zinc-900">Student-wise Placement & Drive Matrix</h3>
            <p className="text-xs text-zinc-500">Student academic details, applied companies, drive stages, and company offer acceptances</p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-zinc-500">Loading student report data...</div>
        ) : reportRows.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">No student records match the active filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-700">
              <thead className="bg-zinc-100 border-b border-zinc-200 uppercase text-[11px] font-semibold text-zinc-600 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">CGPA / Backlogs</th>
                  <th className="py-3 px-4">Placement Status</th>
                  <th className="py-3 px-4">Applied Company</th>
                  <th className="py-3 px-4">CTC (LPA)</th>
                  <th className="py-3 px-4">Drive Stage</th>
                  <th className="py-3 px-4">Placed / Offer Accepted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {reportRows.map((row, idx) => (
                  <tr key={`${row.student_id}_${idx}`} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-zinc-900">{row.roll_number}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-zinc-900">{row.name}</p>
                        <p className="text-[11px] text-zinc-500">{row.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-zinc-800">{row.department}</td>
                    <td className="py-3 px-4">
                      {row.ug_cgpa ? row.ug_cgpa.toFixed(2) : 'N/A'} / {' '}
                      <span className={row.backlogs_count > 0 ? 'text-rose-600 font-bold' : ''}>
                        {row.backlogs_count}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={row.placement_status === 'placed' ? 'approved' : row.placement_status === 'opted_out' ? 'rejected' : 'pending'}>
                        {row.placement_status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-bold text-zinc-900">{row.company_name}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700">
                      {row.ctc_lpa ? `₹${row.ctc_lpa.toFixed(2)} LPA` : '-'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-purple-700">{row.final_status}</td>
                    <td className="py-3 px-4 font-bold text-zinc-900">
                      {row.offer_accepted === 'Yes' ? (
                        <span className="text-emerald-700 font-bold">Placed ✓ (Accepted)</span>
                      ) : row.final_status === 'SELECTED' ? (
                        <span className="text-amber-700 font-bold">Selected (Pending)</span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footnote */}
        <div className="pt-2 border-t border-zinc-100 text-[11px] text-zinc-500 font-medium flex items-center justify-between">
          <span>* Footnote: Multiple drive registrations for a student render one row per application.</span>
          <span className="font-semibold text-zinc-800">
            Filtered Application Rows: {reportRows.length} | Distinct Candidates: {distinctCandidateCount}
          </span>
        </div>
      </Card>
    </div>
  );
};
