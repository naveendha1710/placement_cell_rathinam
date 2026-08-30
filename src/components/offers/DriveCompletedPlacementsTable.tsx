import React, { useState, useEffect } from 'react';
import { Offer, DriveApplication } from '../../types/database';
import { DataStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CheckCircle2, UserCheck, Award, AlertCircle, Search, X } from 'lucide-react';

interface DriveCompletedPlacementsTableProps {
  offer: Offer;
  applications: DriveApplication[];
  onRefresh: () => Promise<void>;
  isOpen?: boolean;
  onClose?: () => void;
}

export const DriveCompletedPlacementsTable: React.FC<DriveCompletedPlacementsTableProps> = ({
  offer,
  applications,
  onRefresh,
  isOpen = true,
  onClose,
}) => {
  const { canCreateEdit } = useAuth();
  const isReadOnly = offer.offer_status === 'drive_closed' || !canCreateEdit;
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Initialize selected checkboxes with already placed/selected students
  useEffect(() => {
    const preSelected = applications
      .filter(a => a.final_status === 'selected' || a.offer_accepted)
      .map(a => a.student_id);
    setSelectedStudentIds(preSelected);
  }, [applications]);

  const filteredApplications = applications.filter(app => {
    const st = app.student;
    if (!st) return true;
    const query = search.toLowerCase();
    return (
      st.name.toLowerCase().includes(query) ||
      st.roll_number.toLowerCase().includes(query) ||
      st.department.toLowerCase().includes(query)
    );
  });

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === filteredApplications.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredApplications.map(a => a.student_id));
    }
  };

  const handleSavePlacements = async () => {
    if (selectedStudentIds.length === 0) {
      if (!confirm('No candidates selected. Proceed to clear placed candidate status for this drive?')) {
        return;
      }
    }

    setSaving(true);
    setSuccessMsg('');
    try {
      const count = await DataStore.markCandidatesAsPlaced(offer.offer_id, selectedStudentIds);
      setSuccessMsg(`Successfully recorded ${count} candidate(s) as Placed! Student profile status updated automatically.`);
      await onRefresh();
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err) {
      console.error('Error updating placed candidate status:', err);
      alert('Failed to save placed candidate status.');
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-zinc-900">Post-Drive Selection & Placed Candidates</h3>
              <Badge variant="approved">DRIVE COMPLETED</Badge>
            </div>
            <p className="text-xs text-zinc-500">
              Select students who received job offers from {offer.company?.name || 'this recruitment drive'}. Selected students' status will automatically update to <span className="font-bold text-emerald-700">PLACED</span> across the portal.
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Search Bar & Select All Controller */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search candidate by roll, name, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs font-semibold text-zinc-700">
            Selected: <span className="font-bold text-emerald-700">{selectedStudentIds.length} candidate(s)</span>
          </span>
          {!isReadOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              disabled={isReadOnly || filteredApplications.length === 0}
              className="text-xs bg-white shrink-0"
            >
              {selectedStudentIds.length === filteredApplications.length && filteredApplications.length > 0
                ? 'Deselect All'
                : 'Select All Filtered'}
            </Button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs font-semibold text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Candidates Selection Table */}
      {filteredApplications.length === 0 ? (
        <div className="py-8 text-center text-xs text-zinc-500 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
          No candidates found matching criteria.
        </div>
      ) : (
        <div className="overflow-x-auto border border-zinc-200 rounded-xl max-h-[50vh] overflow-y-auto">
          <table className="w-full text-left text-xs text-zinc-700">
            <thead className="bg-zinc-100 border-b border-zinc-200 sticky top-0 uppercase text-[11px] font-semibold text-zinc-600 tracking-wider">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredApplications.length > 0 && selectedStudentIds.length === filteredApplications.length}
                    onChange={toggleSelectAll}
                    disabled={isReadOnly || saving}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Candidate Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">CGPA / Backlogs</th>
                <th className="py-3 px-4">Current Drive Stage</th>
                <th className="py-3 px-4 text-center">Placed Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {filteredApplications.map((app) => {
                const st = app.student;
                const isChecked = selectedStudentIds.includes(app.student_id);

                return (
                  <tr
                    key={app.application_id}
                    onClick={() => !isReadOnly && toggleStudent(app.student_id)}
                    className={`hover:bg-zinc-50 transition-colors ${!isReadOnly ? 'cursor-pointer' : ''} ${
                      isChecked ? 'bg-emerald-50/50' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => !isReadOnly && toggleStudent(app.student_id)}
                        disabled={isReadOnly || saving}
                        className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-zinc-900">
                      {st?.roll_number || 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-900">
                      {st?.name || 'Candidate'}
                    </td>
                    <td className="py-3 px-4 font-medium text-zinc-700">
                      {st?.department || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      {st?.ug_cgpa ? st.ug_cgpa.toFixed(2) : 'N/A'} / {' '}
                      <span className={st && st.backlogs_count > 0 ? 'text-rose-600 font-bold' : ''}>
                        {st?.backlogs_count || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-purple-700">
                      {app.final_status.toUpperCase()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isChecked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>Placed ✓ (₹{offer.ctc_lpa || '7.0'} LPA)</span>
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-500 border border-zinc-200">
                          Not Placed
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {isReadOnly ? 'Close' : 'Cancel'}
          </Button>
        )}
        {!isReadOnly && (
          <Button
            onClick={handleSavePlacements}
            disabled={saving}
            className="bg-emerald-700 hover:bg-emerald-800 text-white gap-2 font-semibold"
          >
            <UserCheck className="h-4 w-4" />
            <span>{saving ? 'Updating Status...' : `Confirm Placed Candidates (${selectedStudentIds.length})`}</span>
          </Button>
        )}
      </div>
    </div>
  );

  // If called as a modal popup with onClose
  if (onClose) {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
        <div className="bg-white rounded-2xl border border-zinc-200 max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
          {content}
        </div>
      </div>
    );
  }

  return (
    <Card className="p-6 bg-white border-2 border-emerald-500/30 shadow-sm">
      {content}
    </Card>
  );
};
