import React, { useState, useEffect } from 'react';
import { DataStore } from '../../lib/store';
import { Student } from '../../types/database';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Search, X, CheckSquare, Square } from 'lucide-react';

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
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadCandidates() {
      setLoading(true);
      try {
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

  const toggleSelectAll = () => {
    const unregistered = students.filter(s => !registeredIds.has(s.student_id));
    if (selectedIds.size === unregistered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unregistered.map(s => s.student_id)));
    }
  };

  const handleRegister = async () => {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    try {
      await DataStore.registerStudentsForOffer(offerId, Array.from(selectedIds));
      onSuccess();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_number.toLowerCase().includes(search.toLowerCase()) ||
    s.department.toLowerCase().includes(search.toLowerCase())
  );

  const unregisteredCount = students.filter(s => !registeredIds.has(s.student_id)).length;

  return (
    <Card className="border-2 border-zinc-900 bg-white p-6 shadow-md transition-all animate-in fade-in space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
        <div>
          <h3 className="text-base font-bold text-zinc-900">
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

      <div className="flex items-center justify-between gap-4">
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
          disabled={unregisteredCount === 0}
        >
          {selectedIds.size === unregisteredCount && unregisteredCount > 0 ? 'Deselect All' : 'Select All Eligible'}
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-zinc-500 py-6 text-center">Loading eligible candidates...</p>
      ) : filteredStudents.length === 0 ? (
        <p className="text-xs text-zinc-500 py-6 text-center">No eligible student records found.</p>
      ) : (
        <div className="max-h-60 overflow-y-auto border border-zinc-200 rounded-md divide-y divide-zinc-100 bg-white">
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

      <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
        <span className="text-xs font-semibold text-zinc-700">
          {selectedIds.size} student(s) selected for registration
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={selectedIds.size === 0 || submitting}
            onClick={handleRegister}
          >
            {submitting ? 'Registering...' : `Register ${selectedIds.size} Candidate(s)`}
          </Button>
        </div>
      </div>
    </Card>
  );
};
