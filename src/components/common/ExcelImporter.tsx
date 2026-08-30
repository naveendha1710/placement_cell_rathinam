import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { DataStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';

interface ExcelImporterProps {
  type: 'students' | 'companies';
  onSuccess: () => void;
}

export const ExcelImporter: React.FC<ExcelImporterProps> = ({ type, onSuccess }) => {
  const { role, departmentScope } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resultSummary, setResultSummary] = useState<{
    inserted: number;
    skipped: number;
    reasons: string[];
  } | null>(null);

  // Generate Sample Excel Template
  const handleDownloadTemplate = () => {
    let headers: string[] = [];
    let sampleRow: Record<string, any> = {};

    if (type === 'students') {
      headers = [
        'source', 'roll_number', 'name', 'department', 'gender', 'residency', 'batch',
        'sslc_percentage', 'hsc_percentage', 'ug_percentage', 'ug_cgpa',
        'pg_percentage', 'pg_cgpa', 'github_url', 'resume_file', 'linkedin_url',
        'graduation_date', 'portfolio_url', 'personal_email', 'email',
        'mobile_number', 'photo_file', 'backlogs_count', 'placement_status'
      ];
      sampleRow = {
        source: 'Campus Walk-in',
        roll_number: '714021104099',
        name: 'John Doe',
        department: 'Computer Science',
        gender: 'Male',
        residency: 'day_scholar',
        batch: 'T',
        sslc_percentage: 90.0,
        hsc_percentage: 88.5,
        ug_percentage: 85.0,
        ug_cgpa: 8.5,
        pg_percentage: 0.0,
        pg_cgpa: 0.0,
        github_url: 'https://github.com/johndoe',
        resume_file: 'https://drive.google.com/resume.pdf',
        linkedin_url: 'https://linkedin.com/in/johndoe',
        graduation_date: '2026-05-30',
        portfolio_url: 'https://johndoe.dev',
        personal_email: 'john.personal@gmail.com',
        email: 'john.doe@rathinam.edu.in',
        mobile_number: '+91 9988776655',
        photo_file: 'https://drive.google.com/photo.jpg',
        backlogs_count: 0,
        placement_status: 'yet_to_be_placed',
      };
    } else {
      headers = [
        'name', 'industry_domain', 'website_url', 'star_rating',
        'employee_count', 'address', 'contact_person_name', 'contact_person_mobile'
      ];
      sampleRow = {
        name: 'Sample Tech Solutions',
        industry_domain: 'Software & IT',
        website_url: 'https://sampletech.com',
        star_rating: 4,
        employee_count: 500,
        address: 'Coimbatore IT Park',
        contact_person_name: 'Alex Morgan',
        contact_person_mobile: '+91 9112233445',
      };
    }

    const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${type}_template`);
    XLSX.writeFile(wb, `${type}_import_template.xlsx`);
  };

  // Process uploaded Excel file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResultSummary(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (rows.length === 0) {
          alert('Uploaded Excel file appears empty.');
          setImporting(false);
          return;
        }

        if (type === 'students') {
          const activeScope = (role === 'dept_coordinator') ? departmentScope : null;
          const summary = await DataStore.bulkInsertStudents(rows, activeScope);
          setResultSummary(summary);
        } else {
          const summary = await DataStore.bulkInsertCompanies(rows);
          setResultSummary(summary);
        }
        onSuccess();
      } catch (err) {
        console.error('Failed to parse Excel file', err);
        alert('Failed to parse Excel file. Please ensure it matches the template format.');
      } finally {
        setImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="gap-2">
        <FileSpreadsheet className="h-4 w-4" />
        <span>Import Excel</span>
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setResultSummary(null);
        }}
        title={`Import ${type === 'students' ? 'Students' : 'Companies'} via Excel`}
        subtitle="Bulk import records using standard .xlsx spreadsheet"
        maxWidth="lg"
      >
        <div className="space-y-6">
          {/* Step 1: Download Template */}
          <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-900">1. Download Template</p>
              <p className="text-xs text-zinc-500">Get formatted Excel sheet with required column headers.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              <span>Template</span>
            </Button>
          </div>

          {/* Step 2: Upload File */}
          <div className="p-6 border-2 border-dashed border-zinc-300 rounded-xl text-center space-y-3 hover:border-zinc-500 transition-colors">
            <Upload className="h-8 w-8 text-zinc-400 mx-auto" />
            <div>
              <p className="text-sm font-medium text-zinc-900">Choose Excel file to upload</p>
              <p className="text-xs text-zinc-500">Supports .xlsx and .xls formats</p>
            </div>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              disabled={importing}
              className="block w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-zinc-800 cursor-pointer"
            />
          </div>

          {importing && (
            <div className="py-4 text-center text-xs text-zinc-600 font-medium">
              Processing and validating spreadsheet rows...
            </div>
          )}

          {/* Result Summary */}
          {resultSummary && (
            <div className="space-y-3 pt-2">
              <div className="flex gap-4">
                <div className="flex-1 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900">{resultSummary.inserted} Inserted</p>
                    <p className="text-[11px] text-emerald-700">Successfully added to DB</p>
                  </div>
                </div>

                <div className="flex-1 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-xs font-bold text-amber-900">{resultSummary.skipped} Skipped</p>
                    <p className="text-[11px] text-amber-700">Invalid or duplicate rows</p>
                  </div>
                </div>
              </div>

              {resultSummary.reasons.length > 0 && (
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-zinc-800 mb-1">Skip Reasons:</p>
                  <ul className="text-xs text-zinc-600 space-y-1 pl-4 list-disc">
                    {resultSummary.reasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};
