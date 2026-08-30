import React, { useState, useEffect } from 'react';
import { DataStore } from '../../lib/store';
import { Student, JobRole } from '../../types/database';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Search, X, CheckSquare, Square, Briefcase } from 'lucide-react';

interface RegisterStudentsInlineFormProps {
  offerId: string;
  eligibleDepartments?: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export const RegisterStudentsInlineForm: React.FC<RegisterStudentsInlineFormProps> = ({
  offerId,
  eligibleDepartments,
  onClose,
  onSuccess,
}) => {
  const { departmentScope } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadCandidates() {
      setLoading(true);
      try {
        const offers = await DataStore.getOffers();
        const off = offers.find(o => o.offer_id === offerId);
        if (off?.job_roles && off.job_roles.length > 0) {
          setJobRoles(off.job_roles);
          setSelectedRoleId(off.job_roles[0].role_id);
        }

        let allStudents = await DataStore.getStudents();
        const existingApps = await DataStore.getApplications(offerId);
        const alreadyRegistered = new Set(existingApps.map(a => a.student_id));
        setRegisteredIds(alreadyRegistered);

        // Filter eligible departments & departmentScope
        let eligible = allStudents;
        if (eligibleDepartments && eligibleDepartments.length > 0) {
          eligible = eligible.filter(s => eligibleDepartments.includes(s.department));
        }
        if (departmentScope) {
          eligible = eligible.filter(s => s.department.toLowerCase() === departmentScope.toLowerCase());
        }

        setStudents(eligible);
      } finally {
        setLoading(false);
      }
    }
    loadCandidates();
  }, [offerId, eligibleDepartments, departmentScope]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRegister = async () => {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    try {
      const activeRole = jobRoles.find(r => r.role_id === selectedRoleId) || jobRoles[0];
      await DataStore.registerStudentsForOffer(
        offerId,
        Array.from(selectedIds),
        activeRole?.role_id,
        activeRole?.role_title
      );
      onSuccess();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const activeRole = jobRoles.find(r => r.role_id === selectedRoleId) || jobRoles[0];
  const roleDepts = activeRole?.eligible_departments || eligibleDepartments;
  const crit = activeRole?.eligibility_criteria || {};

  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(search.toLowerCase()) ||
      s.department.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    // Role-specific Department check
    if (roleDepts && roleDepts.length > 0) {
      if (!roleDepts.some(d => d.toLowerCase().trim() === s.department.toLowerCase().trim())) {
        return false;
      }
    }

    // Role-specific Min CGPA check
    if (crit.min_cgpa !== undefined && crit.min_cgpa !== null) {
      if ((s.ug_cgpa ?? 0) < crit.min_cgpa) return false;
    }

    // Role-specific Max Backlogs check
    if (crit.max_backlogs !== undefined && crit.max_backlogs !== null) {
      if ((s.backlogs_count ?? 0) > crit.max_backlogs) return false;
    }

    // Role-specific Allowed Batches check
    if (crit.allowed_batches && crit.allowed_batches.length > 0) {
      if (!crit.allowed_batches.includes((s.batch || 'A') as any)) return false;
    }

    return true;
  });

  const eligibleUnregistered = filteredStudents.filter(s => !registeredIds.has(s.student_id));
  const eligibleUnregisteredIds = eligibleUnregistered.map(s => s.student_id);

  const toggleSelectAll = () => {
    const allSelected = eligibleUnregisteredIds.length > 0 && eligibleUnregisteredIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        eligibleUnregisteredIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        eligibleUnregisteredIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const validSelectedCount = Array.from(selectedIds).filter(id =>
    eligibleUnregistered.some(s => s.student_id === id)
  ).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in">
      <Card className="w-full max-w-7xl h-[88vh] flex flex-col border-2 border-zinc-900 bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">
              Register Eligible Candidates
            </h3>
            <p className="text-xs text-zinc-500">
              Filtered to eligible departments: {eligibleDepartments?.join(', ') || 'All'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Multi-Role Position Selector Bar */}
        {jobRoles.length > 1 && (
          <div className="flex items-center gap-3 bg-zinc-100 p-3 rounded-lg border border-zinc-200 shrink-0">
            <div className="flex items-center gap-1.5 font-bold text-zinc-900 text-xs">
              <Briefcase className="h-4 w-4 text-zinc-800" />
              <span>Target Job Role for Registration:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {jobRoles.map((r) => {
                const isSelected = r.role_id === selectedRoleId;
                return (
                  <button
                    key={r.role_id}
                    type="button"
                    onClick={() => {
                      setSelectedRoleId(r.role_id);
                      setSelectedIds(new Set());
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-md border transition-all ${
                      isSelected
                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                        : 'bg-white text-zinc-800 border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    {r.role_title} ({r.ctc_lpa ? `${r.ctc_lpa} LPA` : 'TBD'})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search candidates by roll number or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-zinc-300 bg-white focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            disabled={eligibleUnregistered.length === 0}
          >
            {eligibleUnregistered.length > 0 && eligibleUnregisteredIds.every(id => selectedIds.has(id))
              ? 'Deselect All'
              : 'Select All Eligible'}
          </Button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 py-6">
            Loading eligible candidates...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 py-6">
            No eligible student records found.
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto border border-zinc-200 rounded-md divide-y divide-zinc-100 bg-white">
            {filteredStudents.map((st) => {
              const isAlready = registeredIds.has(st.student_id);
              const isSelected = selectedIds.has(st.student_id);

              return (
                <div
                  key={st.student_id}
                  onClick={() => !isAlready && toggleSelect(st.student_id)}
                  className={`p-3 text-xs flex items-center justify-between transition-colors ${
                    isAlready
                      ? 'bg-zinc-50 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-zinc-100 font-semibold cursor-pointer'
                      : 'hover:bg-zinc-50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isAlready ? (
                      <CheckSquare className="h-4 w-4 text-zinc-400" />
                    ) : isSelected ? (
                      <CheckSquare className="h-4 w-4 text-zinc-900" />
                    ) : (
                      <Square className="h-4 w-4 text-zinc-300" />
                    )}
                    <div>
                      <span className="font-mono text-zinc-900 font-bold mr-2">{st.roll_number}</span>
                      <span className="text-zinc-800">{st.name}</span>
                      <span className="text-[11px] text-zinc-500 ml-2">({st.department})</span>
                    </div>
                  </div>

                  <div className="text-right text-[11px]">
                    {isAlready ? (
                      <span className="text-zinc-500 font-medium bg-zinc-200 px-2 py-0.5 rounded">
                        Already Registered
                      </span>
                    ) : (
                      <span className="text-zinc-700">
                        CGPA: {st.ug_cgpa ? st.ug_cgpa.toFixed(2) : 'N/A'} | Backlogs: {st.backlogs_count}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 shrink-0">
          <span className="text-xs font-semibold text-zinc-700">
            {validSelectedCount} student(s) selected for registration
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={validSelectedCount === 0 || submitting}
              onClick={handleRegister}
            >
              {submitting ? 'Registering...' : `Register ${validSelectedCount} Candidate(s)`}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
