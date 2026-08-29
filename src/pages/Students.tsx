import React, { useEffect, useState } from 'react';
import { DataStore } from '../lib/store';
import { Student } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { StudentInlineForm } from '../components/students/StudentInlineForm';
import { ExcelImporter } from '../components/common/ExcelImporter';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Search, Plus, Edit, Trash2, GraduationCap } from 'lucide-react';

export const Students: React.FC = () => {
  const { departmentScope, canCreateEdit, canDelete } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState(departmentScope || 'all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Inline Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const loadStudents = async () => {
    setLoading(true);
    try {
      let data = await DataStore.getStudents();
      if (departmentScope) {
        data = data.filter(s => s.department.toLowerCase() === departmentScope.toLowerCase());
      }
      setStudents(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [departmentScope]);

  const handleSaveStudent = async (studentData: Partial<Student> & { name: string; roll_number: string; email: string; department: string }) => {
    await DataStore.saveStudent(studentData);
    setIsFormOpen(false);
    await loadStudents();
  };

  const handleDeleteStudent = async (id: string) => {
    if (confirm('Are you sure you want to delete this student record?')) {
      await DataStore.deleteStudent(id);
      await loadStudents();
    }
  };

  const filteredStudents = students.filter(st => {
    const matchesSearch = 
      st.name.toLowerCase().includes(search.toLowerCase()) ||
      st.roll_number.toLowerCase().includes(search.toLowerCase()) ||
      st.email.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === 'all' || st.department === deptFilter;
    const matchesStatus = statusFilter === 'all' || st.placement_status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            <span>Students Directory</span>
          </h1>
          <p className="text-xs text-zinc-500">
            {departmentScope ? `Filtered to scope: ${departmentScope}` : 'Manage student database and academic profiles.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canCreateEdit && <ExcelImporter type="students" onSuccess={loadStudents} />}
          {canCreateEdit && !isFormOpen && (
            <Button
              onClick={() => {
                setSelectedStudent(null);
                setIsFormOpen(true);
              }}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Add Student</span>
            </Button>
          )}
        </div>
      </div>

      {/* Inline Form Container */}
      {isFormOpen && (
        <StudentInlineForm
          student={selectedStudent}
          onSave={handleSaveStudent}
          onClose={() => setIsFormOpen(false)}
        />
      )}

      {/* Filter Bar */}
      <Card className="p-4 bg-white border-zinc-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by roll no, name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          {!departmentScope && (
            <Select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              options={[
                { label: 'All Departments', value: 'all' },
                { label: 'Computer Science', value: 'Computer Science' },
                { label: 'Information Technology', value: 'Information Technology' },
                { label: 'Electronics & Communication', value: 'Electronics & Communication' },
                { label: 'Mechanical Engineering', value: 'Mechanical Engineering' },
              ]}
            />
          )}

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { label: 'All Placement Statuses', value: 'all' },
              { label: 'Unplaced', value: 'unplaced' },
              { label: 'Placed', value: 'placed' },
              { label: 'Opted Out', value: 'opted_out' },
            ]}
          />
        </div>
      </Card>

      {/* Data Table */}
      <Card className="overflow-hidden border-zinc-200">
        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500">Loading students...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            No student records found matching the criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-700">
              <thead className="bg-zinc-100 border-b border-zinc-200 uppercase text-[11px] font-semibold text-zinc-600 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">CGPA</th>
                  <th className="py-3 px-4">Backlogs</th>
                  <th className="py-3 px-4">Placement Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {filteredStudents.map((st) => (
                  <tr key={st.student_id} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-zinc-900">{st.roll_number}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-zinc-900">{st.name}</p>
                        <p className="text-[11px] text-zinc-500">{st.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-zinc-800">{st.department}</td>
                    <td className="py-3 px-4 font-semibold text-zinc-900">
                      {st.ug_cgpa ? st.ug_cgpa.toFixed(2) : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={st.backlogs_count > 0 ? 'text-rose-600 font-bold' : 'text-zinc-500'}>
                        {st.backlogs_count}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={st.placement_status as any}>
                        {st.placement_status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canCreateEdit && (
                          <button
                            onClick={() => {
                              setSelectedStudent(st);
                              setIsFormOpen(true);
                            }}
                            className="p-1 rounded hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                            title="Edit Profile"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteStudent(st.student_id)}
                            className="p-1 rounded hover:bg-rose-50 text-rose-600 hover:text-rose-700"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
