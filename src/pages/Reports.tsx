import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { StudentReportView, StudentReportRow } from '../components/reports/StudentReportView';
import { CompanyReportView, CompanyReportRow } from '../components/reports/CompanyReportView';
import { OfferReportView, OfferReportRow } from '../components/reports/OfferReportView';
import { Button } from '../components/ui/Button';
import { Download, FileSpreadsheet, Layers, Users, Building2, Briefcase } from 'lucide-react';

type ReportTab = 'student_wise' | 'company_wise' | 'offer_wise';

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('student_wise');

  // Active rows cache for single-tab download
  const studentRowsRef = useRef<StudentReportRow[]>([]);
  const companyRowsRef = useRef<CompanyReportRow[]>([]);
  const offerRowsRef = useRef<OfferReportRow[]>([]);

  const dateStr = new Date().toISOString().split('T')[0];

  // Download Active Tab Report (.xlsx)
  const handleDownloadActiveReport = () => {
    let sheetName = 'Report';
    let rowsData: any[] = [];
    let fileName = `report_${dateStr}.xlsx`;

    if (activeTab === 'student_wise') {
      sheetName = 'Student_Report';
      fileName = `student_report_${dateStr}.xlsx`;
      rowsData = studentRowsRef.current.map(r => ({
        'Roll Number': r.roll_number,
        'Student Name': r.name,
        'Department': r.department,
        'Email': r.email,
        'Placement Status': r.placement_status.toUpperCase(),
        'Residency': r.residency,
        'UG CGPA': r.ug_cgpa || 'N/A',
        'Backlogs': r.backlogs_count,
        'Company Name': r.company_name,
        'CTC (LPA)': r.ctc_lpa ? `₹${r.ctc_lpa.toFixed(2)} LPA` : '-',
        'Final Status': r.final_status,
        'Offer Accepted': r.offer_accepted,
      }));
    } else if (activeTab === 'company_wise') {
      sheetName = 'Company_Report';
      fileName = `company_report_${dateStr}.xlsx`;
      rowsData = companyRowsRef.current.map(r => ({
        'Company Name': r.name,
        'Industry Domain': r.industry_domain,
        'Approval Status': r.approval_status.toUpperCase(),
        'Star Rating': `${r.star_rating}★`,
        'Total Offers Posted': r.total_offers_posted,
        'Registered Candidates': r.total_students_registered,
        'Total Selected': r.total_selected,
        'Placed Candidates': r.total_placed,
      }));
    } else if (activeTab === 'offer_wise') {
      sheetName = 'Offer_Report';
      fileName = `offer_report_${dateStr}.xlsx`;
      rowsData = offerRowsRef.current.map(r => ({
        'Company Name': r.company_name,
        'CTC (LPA)': r.ctc_lpa ? `₹${r.ctc_lpa.toFixed(2)} LPA` : '-',
        'Drive Date': r.drive_date,
        'Drive Mode': r.drive_mode,
        'Job Location': r.job_location,
        'Approval Status': r.approval_status.toUpperCase(),
        'Total Registered': r.total_registered,
        'Total Shortlisted': r.total_shortlisted,
        'Total Selected': r.total_selected,
        'Offer Accepted': r.total_offer_accepted,
        'Average Match Score': r.avg_match_score,
      }));
    }

    if (rowsData.length === 0) {
      alert('No data rows to export in current view.');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(rowsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);
  };

  // Download All 3 Reports as a Multi-Sheet Excel Workbook
  const handleDownloadAllReports = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Student Report
    const stData = studentRowsRef.current.map(r => ({
      'Roll Number': r.roll_number,
      'Student Name': r.name,
      'Department': r.department,
      'Email': r.email,
      'Placement Status': r.placement_status.toUpperCase(),
      'Residency': r.residency,
      'UG CGPA': r.ug_cgpa || 'N/A',
      'Backlogs': r.backlogs_count,
      'Company Name': r.company_name,
      'CTC (LPA)': r.ctc_lpa ? `₹${r.ctc_lpa.toFixed(2)} LPA` : '-',
      'Final Status': r.final_status,
      'Offer Accepted': r.offer_accepted,
    }));
    const ws1 = XLSX.utils.json_to_sheet(stData.length > 0 ? stData : [{ Status: 'No Data' }]);
    XLSX.utils.book_append_sheet(wb, ws1, 'Student_Report');

    // Sheet 2: Company Report
    const compData = companyRowsRef.current.map(r => ({
      'Company Name': r.name,
      'Industry Domain': r.industry_domain,
      'Approval Status': r.approval_status.toUpperCase(),
      'Star Rating': `${r.star_rating}★`,
      'Total Offers Posted': r.total_offers_posted,
      'Registered Candidates': r.total_students_registered,
      'Total Selected': r.total_selected,
      'Placed Candidates': r.total_placed,
    }));
    const ws2 = XLSX.utils.json_to_sheet(compData.length > 0 ? compData : [{ Status: 'No Data' }]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Company_Report');

    // Sheet 3: Offer Report
    const offerData = offerRowsRef.current.map(r => ({
      'Company Name': r.company_name,
      'CTC (LPA)': r.ctc_lpa ? `₹${r.ctc_lpa.toFixed(2)} LPA` : '-',
      'Drive Date': r.drive_date,
      'Drive Mode': r.drive_mode,
      'Job Location': r.job_location,
      'Approval Status': r.approval_status.toUpperCase(),
      'Total Registered': r.total_registered,
      'Total Shortlisted': r.total_shortlisted,
      'Total Selected': r.total_selected,
      'Offer Accepted': r.total_offer_accepted,
      'Average Match Score': r.avg_match_score,
    }));
    const ws3 = XLSX.utils.json_to_sheet(offerData.length > 0 ? offerData : [{ Status: 'No Data' }]);
    XLSX.utils.book_append_sheet(wb, ws3, 'Offer_Report');

    XLSX.writeFile(wb, `placement_all_reports_${dateStr}.xlsx`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-zinc-800" />
            <span>Placement Analytics & Reports</span>
          </h2>
          <p className="text-xs text-zinc-500">
            Exportable student scorecards, corporate partner statistics, and recruitment drive conversion metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadActiveReport} className="gap-1.5 text-xs font-semibold">
            <Download className="h-3.5 w-3.5" />
            <span>Download Active Tab (.xlsx)</span>
          </Button>

          <Button size="sm" onClick={handleDownloadAllReports} className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold">
            <Layers className="h-3.5 w-3.5" />
            <span>Download All Reports (Multi-Sheet)</span>
          </Button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('student_wise')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'student_wise'
              ? 'border-zinc-900 text-zinc-900 bg-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Student-wise Report</span>
        </button>

        <button
          onClick={() => setActiveTab('company_wise')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'company_wise'
              ? 'border-zinc-900 text-zinc-900 bg-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Company-wise Report</span>
        </button>

        <button
          onClick={() => setActiveTab('offer_wise')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'offer_wise'
              ? 'border-zinc-900 text-zinc-900 bg-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>Offer-wise Report</span>
        </button>
      </div>

      {/* Tab Content Views */}
      <div className="pt-2">
        {activeTab === 'student_wise' && (
          <StudentReportView onRowsChange={(rows) => { studentRowsRef.current = rows; }} />
        )}
        {activeTab === 'company_wise' && (
          <CompanyReportView onRowsChange={(rows) => { companyRowsRef.current = rows; }} />
        )}
        {activeTab === 'offer_wise' && (
          <OfferReportView onRowsChange={(rows) => { offerRowsRef.current = rows; }} />
        )}
      </div>
    </div>
  );
};
