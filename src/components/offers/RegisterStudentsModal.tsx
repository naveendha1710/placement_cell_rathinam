import React, { useState, useEffect } from 'react';
import { Student, DriveApplication } from '../../types/database';
import { DataStore } from '../../lib/store';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Search, UserCheck, CheckSquare, Square } from 'lucide-react';

interface RegisterStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  eligibleDepartments?: string[] | null;
  onSuccess: () => void;
}

export const RegisterStudentsModal: React.FC<RegisterStudentsModalProps> = ({
  isOpen,
  onClose,
  offerId,
  eligibleDepartments,
  onSuccess,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!isOpen) return;
      setLoading(true);
      try {
        const allStudents = await DataStore.getStudents();
        const existingApps = await DataStore.getApplications(offerId);
        
        const registered = new Set(existingApps.map(a => a.student_id));
        setRegisteredIds(registered);

        // Filter eligible students based on department if specified
        let eligible = allStudents;
        if (eligibleDepartments && eligibleDepartments.length > 0) {
          eligible = eligible.filter(s => eligibleDepartments.includes(s.department));
        }

        setStudents(eligible);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isOpen, offerId, eligibleDepartments]);

  const handleToggleSelect = (sid: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  const handleSelectAll = () => {
    const unregistered = filteredStudents.filter(s => !registeredIds.has(s.student_id));
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register Students for Drive"
      subtitle="Select eligible students to add to the application matrix"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by student name or roll number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            Select All Available
          </Button>
        </div>

        {loading ? (
          <p className="text-xs text-zinc-500 py-6 text-center">Loading eligible students...</p>
        ) : filteredStudents.length === 0 ? (
          <p className="text-xs text-zinc-500 py-6 text-center">No eligible students found.</p>
        ) : (
          <div className="border border-zinc-200 rounded-lg max-h-72 overflow-y-auto divide-y divide-zinc-100">
            {filteredStudents.map((st) => {
              const isRegistered = registeredIds.has(st.student_id);
              const isSelected = selectedIds.has(st.student_id);

              return (
                <div
                  key={st.student_id}
                  onClick={() => !isRegistered && handleToggleSelect(st.student_id)}
                  className={`p-3 flex items-center justify-between text-xs transition-colors ${
                    isRegistered
                      ? 'bg-zinc-50 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-zinc-100 font-medium cursor-pointer'
                      : 'hover:bg-zinc-50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {!isRegistered ? (
                      isSelected ? (
                        <CheckSquare className="h-4 w-4 text-zinc-900" />
                      ) : (
                        <Square className="h-4 w-4 text-zinc-400" />
                      )
                    ) : (
                      <UserCheck className="h-4 w-4 text-emerald-600" />
                    )}
                    <div>
                      <p className="font-semibold text-zinc-900">{st.name} ({st.roll_number})</p>
                      <p className="text-[11px] text-zinc-500">
                        {st.department} | CGPA: {st.ug_cgpa || 'N/A'} | Backlogs: {st.backlogs_count}
                      </p>
                    </div>
                  </div>

                  <div>
                    {isRegistered ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Already Registered
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-500">
                        {st.placement_status.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
          <span className="text-xs text-zinc-500 font-medium">
            {selectedIds.size} student(s) selected
          </span>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRegister}
              disabled={submitting || selectedIds.size === 0}
            >
              {submitting ? 'Registering...' : `Register ${selectedIds.size} Students`}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
