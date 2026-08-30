import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataStore } from '../lib/store';
import { Student } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { StudentInlineForm } from '../components/students/StudentInlineForm';
import { ExcelImporter } from '../components/common/ExcelImporter';
import { Pagination } from '../components/common/Pagination';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Search, Plus, Edit, Trash2, GraduationCap, Eye, CheckCircle2, Clock, UserX } from 'lucide-react';

export const Students: React.FC = () => {
  const navigate = useNavigate();
  const { departmentScope, canCreateEdit, canDelete } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState(departmentScope || 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [residencyFilter, setResidencyFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [cgpaFilter, setCgpaFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [search, deptFilter, statusFilter, residencyFilter, batchFilter, cgpaFilter]);

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
    const matchesResidency = residencyFilter === 'all' || st.residency === residencyFilter;
    const matchesBatch = batchFilter === 'all' || st.batch === batchFilter;
    const matchesCgpa = cgpaFilter === 'all' || (st.ug_cgpa !== null && st.ug_cgpa !== undefined && st.ug_cgpa >= parseFloat(cgpaFilter));
    
    return matchesSearch && matchesDept && matchesStatus && matchesResidency && matchesBatch && matchesCgpa;
  });

  const totalPages = Math.ceil(filteredStudents.length / pageSize);
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalCount = filteredStudents.length;
  const placedCount = filteredStudents.filter(s => s.placement_status === 'placed').length;
  const unplacedCount = filteredStudents.filter(s => s.placement_status === 'yet_to_be_placed').length;
  const optedOutCount = filteredStudents.filter(s => s.placement_status === 'opted_out').length;

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

      {/* Clickable KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={`text-left cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-zinc-900 rounded-xl' : 'hover:opacity-90'}`}
        >
          <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5 h-full">
            <div className="p-2.5 rounded-lg bg-zinc-900 text-white shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Total Registered</span>
              <span className="text-xl font-bold text-zinc-900 font-mono">{totalCount}</span>
            </div>
          </Card>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'placed' ? 'all' : 'placed')}
          className={`text-left cursor-pointer transition-all ${statusFilter === 'placed' ? 'ring-2 ring-emerald-600 rounded-xl' : 'hover:opacity-90'}`}
        >
          <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5 h-full">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Placed Candidates</span>
              <span className="text-xl font-bold text-emerald-700 font-mono">{placedCount}</span>
            </div>
          </Card>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'yet_to_be_placed' ? 'all' : 'yet_to_be_placed')}
          className={`text-left cursor-pointer transition-all ${statusFilter === 'yet_to_be_placed' ? 'ring-2 ring-amber-600 rounded-xl' : 'hover:opacity-90'}`}
        >
          <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5 h-full">
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Yet to be Placed</span>
              <span className="text-xl font-bold text-amber-700 font-mono">{unplacedCount}</span>
            </div>
          </Card>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'opted_out' ? 'all' : 'opted_out')}
          className={`text-left cursor-pointer transition-all ${statusFilter === 'opted_out' ? 'ring-2 ring-slate-600 rounded-xl' : 'hover:opacity-90'}`}
        >
          <Card className="p-4 bg-white border-zinc-200 flex items-center gap-3.5 h-full">
            <div className="p-2.5 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200 shrink-0">
              <UserX className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Opted Out</span>
              <span className="text-xl font-bold text-zinc-800 font-mono">{optedOutCount}</span>
            </div>
          </Card>
        </button>
      </div>

      {/* Inline Form Container */}
      {isFormOpen ? (
        <StudentInlineForm
          student={selectedStudent}
          onSave={handleSaveStudent}
          onClose={() => setIsFormOpen(false)}
        />
      ) : (
        <>
          {/* Filter Bar */}
          <Card className="p-4 bg-white border-zinc-200 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="relative md:col-span-2 lg:col-span-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search by roll, name, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
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
                    { label: 'Electronics and Communication', value: 'Electronics & Communication' },
                    { label: 'Mechanical Engineering', value: 'Mechanical Engineering' },
                    { label: 'Civil Engineering', value: 'Civil Engineering' },
                    { label: 'Artificial Intelligence & Data Science', value: 'Artificial Intelligence & Data Science' },
                    { label: 'Master of Computer Applications', value: 'Master of Computer Applications' },
                  ]}
                />
              )}

              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { label: 'All Placement Statuses', value: 'all' },
                  { label: 'Yet to be Placed Only', value: 'yet_to_be_placed' },
                  { label: 'Placed Only', value: 'placed' },
                  { label: 'Opted Out', value: 'opted_out' },
                ]}
              />

              <Select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                options={[
                  { label: 'All Student Batches', value: 'all' },
                  { label: 'Batch T', value: 'T' },
                  { label: 'Batch O', value: 'O' },
                  { label: 'Batch S', value: 'S' },
                  { label: 'Batch A', value: 'A' },
                  { label: 'Batch X', value: 'X' },
                ]}
              />

              <Select
                value={residencyFilter}
                onChange={(e) => setResidencyFilter(e.target.value)}
                options={[
                  { label: 'All Residencies', value: 'all' },
                  { label: 'Day Scholar', value: 'day_scholar' },
                  { label: 'Hosteller', value: 'hosteller' },
                ]}
              />

              <Select
                value={cgpaFilter}
                onChange={(e) => setCgpaFilter(e.target.value)}
                options={[
                  { label: 'All CGPA Scores', value: 'all' },
                  { label: 'CGPA >= 8.5 (High Performers)', value: '8.5' },
                  { label: 'CGPA >= 7.5 (First Class)', value: '7.5' },
                  { label: 'CGPA >= 6.5', value: '6.5' },
                  { label: 'CGPA >= 6.0', value: '6.0' },
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
                      <th className="py-3 px-4">Batch</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">CGPA</th>
                      <th className="py-3 px-4">Backlogs</th>
                      <th className="py-3 px-4">Placement Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {paginatedStudents.map((st) => (
                      <tr key={st.student_id} className="hover:bg-zinc-50 transition-colors">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => navigate(`/students/${st.student_id}`)}
                            className="font-mono font-bold text-zinc-900 hover:underline text-left"
                          >
                            {st.roll_number}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <button
                              onClick={() => navigate(`/students/${st.student_id}`)}
                              className="font-semibold text-zinc-900 hover:underline text-left"
                            >
                              {st.name}
                            </button>
                            <p className="text-[11px] text-zinc-500">{st.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                            Batch {st.batch || 'A'}
                          </span>
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
                            <button
                              onClick={() => navigate(`/students/${st.student_id}`)}
                              className="p-1 rounded hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                              title="View 70/30 Student Profile & Attended Drives"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
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

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredStudents.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </Card>
        </>
      )}
    </div>
  );
};
