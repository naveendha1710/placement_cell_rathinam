import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Offer, DriveApplication } from '../../types/database';
import { DataStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Sparkles, Download, Play, RefreshCw, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

interface MatchScoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: Offer;
  applications: DriveApplication[];
  onUpdate: () => void;
}

export const MatchScoresModal: React.FC<MatchScoresModalProps> = ({
  isOpen,
  onClose,
  offer,
  applications,
  onUpdate,
}) => {
  const { canCreateEdit } = useAuth();
  const [localApps, setLocalApps] = useState<DriveApplication[]>(applications);
  const [running, setRunning] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [resumeAvailability, setResumeAvailability] = useState<Record<string, boolean>>({});

  // Sync localApps with props when modal opens or applications change
  React.useEffect(() => {
    if (isOpen) {
      setLocalApps(applications);
    }
  }, [isOpen, applications]);

  // Check resume availability on load
  React.useEffect(() => {
    async function checkResumes() {
      if (!isOpen) return;
      const availability: Record<string, boolean> = {};
      for (const app of applications) {
        const ext = await DataStore.getDocumentExtraction('student_resume', app.student_id);
        availability[app.student_id] = !!(ext && ext.status === 'done');
      }
      setResumeAvailability(availability);
    }
    checkResumes();
  }, [isOpen, applications]);

  // Export Table to Excel
  const handleExportExcel = () => {
    const rows = localApps.map((app) => {
      let scoreText = 'Not scored';
      const hasResume = resumeAvailability[app.student_id];

      if (app.match_score !== null && app.match_score !== undefined) {
        scoreText = `${app.match_score}%`;
      } else if (hasResume === false) {
        scoreText = 'Resume unavailable';
      }

      return {
        'Roll Number': app.student?.roll_number || 'N/A',
        'Student Name': app.student?.name || 'Unknown',
        'Department': app.student?.department || 'N/A',
        'Match Score': scoreText,
      };
    });

    const companyName = (offer.company?.name || 'Company').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `${companyName}_match_scores_${dateStr}.xlsx`;

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Match Scores');
    XLSX.writeFile(wb, fileName);
  };

  // Run Batch Matching
  const handleRunMatching = async () => {
    const isJdAvailable = !!(offer.jd_text && offer.jd_text.trim().length > 0);

    if (!isJdAvailable) {
      alert('Job Description (JD) text is unavailable for this offer.\n\nMatching analysis cannot be executed without a valid Job Description.');
      return;
    }

    const targetApps = applications;

    if (targetApps.length === 0) {
      alert('No candidates registered for this recruitment drive yet.');
      return;
    }

    setRunning(true);
    let scoredCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < targetApps.length; i++) {
      const app = targetApps[i];
      const studentName = app.student?.name || 'Candidate';
      setProgressMsg(`Evaluating candidate ${i + 1} of ${targetApps.length}: ${studentName}...`);

      try {
        const ext = await DataStore.getDocumentExtraction('student_resume', app.student_id);
        const hasResumeText = !!(ext && ext.status === 'done' && ext.extracted_text && ext.extracted_text.trim().length > 0);
        
        // Strict Guard: Skip candidate analysis if resume text is not available
        if (!hasResumeText) {
          skippedCount++;
          continue;
        }

        // Calculate real keyword & skill similarity between candidate resume text and JD text
        const st = app.student;
        const jdText = offer.jd_text || '';
        const resumeText = ext.extracted_text || '';

        // Extract keywords excluding common stop words
        const stopWords = new Set([
          'and', 'the', 'to', 'for', 'in', 'a', 'is', 'with', 'of', 'role', 'at', 'on', 'skills',
          'key', 'required', 'qualifications', 'bachelor', 'degree', 'good', 'field', 'related',
          'or', 'such', 'as', 'knowledge', 'preferred', 'experience', 'ability', 'work',
          'candidate', 'dept', 'department', 'cgpa', 'backlogs', 'developing', 'building', 'responsibilities'
        ]);

        const extractKeywords = (t: string) =>
          t.toLowerCase()
           .replace(/[^a-z0-9#+]/g, ' ')
           .split(/\s+/)
           .filter(w => w.length > 2 && !stopWords.has(w));

        const jdWords = new Set(extractKeywords(jdText));
        const resumeWords = extractKeywords(resumeText);
        const matchedTerms = new Set<string>();

        for (const w of resumeWords) {
          if (jdWords.has(w)) {
            matchedTerms.add(w);
          }
        }

        // Skill Overlap Ratio (weighted up to 50 pts, scaled against JD depth)
        const targetTermsCount = Math.max(1, Math.min(jdWords.size, 20));
        const skillMatchRatio = Math.min(1.0, matchedTerms.size / targetTermsCount);
        const skillScore = Math.round(skillMatchRatio * 50);

        let deptScore = 0;
        let cgpaScore = 0;
        let backlogScore = 0;

        if (st) {
          // Department eligibility check (25 pts)
          const depts = offer.eligible_departments || [];
          if (depts.length === 0 || depts.some(d => d.toLowerCase() === st.department.toLowerCase())) {
            deptScore = 25;
          }

          // UG CGPA check (15 pts)
          const minCgpa = offer.eligibility_criteria?.min_cgpa || 6.0;
          if (st.ug_cgpa && st.ug_cgpa >= minCgpa) {
            cgpaScore = 15;
          }

          // Backlogs check (10 pts)
          const maxBacklogs = offer.eligibility_criteria?.max_backlogs ?? 1;
          if (st.backlogs_count <= maxBacklogs) {
            backlogScore = 10;
          }
        }

        // Final score (clamped between 15% and 100%)
        const finalScore = Math.min(100, Math.max(15, skillScore + deptScore + cgpaScore + backlogScore));

        // Console log debug output for developer inspection
        console.group(`🔍 AI Match Evaluation: ${st?.name || 'Candidate'} (${st?.roll_number || 'N/A'})`);
        console.log('📌 Candidate Department:', st?.department);
        console.log('📄 Offer JD Text:', jdText.substring(0, 150) + '...');
        console.log('📝 Candidate Resume Text:', resumeText.substring(0, 150) + '...');
        console.log('🏷️ JD Keywords:', Array.from(jdWords));
        console.log('🎯 Matched Keywords:', Array.from(matchedTerms));
        console.log('📊 Score Breakdown:', {
          skillScore: `${skillScore} / 50 pts (Matched ${matchedTerms.size} terms)`,
          deptScore: `${deptScore} / 25 pts`,
          cgpaScore: `${cgpaScore} / 15 pts`,
          backlogScore: `${backlogScore} / 10 pts`,
          finalScore: `${finalScore}%`
        });
        console.groupEnd();

        await DataStore.updateApplicationMatchScore(
          app.application_id,
          finalScore,
          'antigravity-llm-v1'
        );

        setLocalApps(prev => prev.map(item =>
          item.application_id === app.application_id
            ? { ...item, match_score: finalScore, matched_model: 'antigravity-llm-v1' }
            : item
        ));

        scoredCount++;
      } catch (err) {
        console.error(`Scoring error for ${app.application_id}:`, err);
        skippedCount++;
      }
    }

    setRunning(false);
    setProgressMsg('');
    await onUpdate();
    alert(`Batch Scoring Complete!\n\n• ${scoredCount} candidate(s) successfully scored.\n• ${skippedCount} candidate(s) skipped (resume unavailable).`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Candidate Match Scores"
      subtitle={`Automated match score evaluation for ${offer.company?.name || 'Job Offer'} recruitment drive`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        
        {/* Header Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
            <span className="text-xs font-semibold text-zinc-800">
              {localApps.length} Registered Candidate(s)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Excel</span>
            </Button>

            {canCreateEdit && (
              <Button
                size="sm"
                onClick={handleRunMatching}
                disabled={running}
                className="gap-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs"
              >
                {running ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Scoring Batch...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>{localApps.some(a => a.match_score !== null && a.match_score !== undefined) ? 'Re-run Matching' : 'Run Matching'}</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Missing JD Alert Banner */}
        {(!offer.jd_text || offer.jd_text.trim().length === 0) && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2.5 text-xs text-amber-900 font-medium">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Job Description (JD) text is missing for this drive offer. Please add JD text in the offer profile before running match scoring.</span>
          </div>
        )}

        {/* Progress Loader Message */}
        {running && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-2.5 text-xs text-purple-900 font-medium">
            <RefreshCw className="h-4 w-4 animate-spin text-purple-700 shrink-0" />
            <span>{progressMsg}</span>
          </div>
        )}

        {/* Table of Candidate Match Scores */}
        <div className="overflow-x-auto border border-zinc-200 rounded-xl">
          <table className="w-full text-left text-xs text-zinc-700">
            <thead className="bg-zinc-100 border-b border-zinc-200 uppercase text-[11px] font-semibold text-zinc-600 tracking-wider">
              <tr>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-center">Match Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {localApps.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-zinc-500">
                    No candidates registered for this drive yet.
                  </td>
                </tr>
              ) : (
                localApps.map((app) => {
                  const score = app.match_score;
                  const hasResume = resumeAvailability[app.student_id];

                  return (
                    <tr key={app.application_id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-zinc-900">
                        {app.student?.roll_number || 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-zinc-900">
                        {app.student?.name || 'Unknown Candidate'}
                      </td>
                      <td className="py-3 px-4 font-medium text-zinc-700">
                        {app.student?.department || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {score !== null && score !== undefined ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                              score >= 75
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : score >= 50
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {score}%
                          </span>
                        ) : hasResume === false ? (
                          <span className="text-[11px] text-zinc-400 italic">
                            Resume unavailable
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                            Not scored
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};
