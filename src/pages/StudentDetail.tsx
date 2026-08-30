import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DataStore } from '../lib/store';
import { Student, DriveApplication, Offer } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { StudentInlineForm } from '../components/students/StudentInlineForm';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { 
  ArrowLeft, Edit, Mail, Phone, 
  FileText, Github, Linkedin, Globe, Briefcase, Calendar, Video, AlertCircle, ExternalLink, Copy, Check 
} from 'lucide-react';

export const StudentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role, departmentScope, canCreateEdit } = useAuth();

  const [student, setStudent] = useState<Student | null>(null);
  const [applications, setApplications] = useState<DriveApplication[]>([]);
  const [offersMap, setOffersMap] = useState<Record<string, Offer>>({});
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const students = await DataStore.getStudents();
      const match = students.find(s => s.student_id === id);
      setStudent(match || null);

      if (match) {
        // Fetch all drive applications for this student
        const allApps = await DataStore.getApplications();
        const studentApps = allApps.filter(a => a.student_id === match.student_id);
        setApplications(studentApps);

        // Fetch offer details for attended drives
        const allOffers = await DataStore.getOffers();
        const oMap: Record<string, Offer> = {};
        allOffers.forEach(o => {
          oMap[o.offer_id] = o;
        });
        setOffersMap(oMap);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleSaveStudent = async (studentData: Partial<Student> & { name: string; roll_number: string; email: string; department: string }) => {
    await DataStore.saveStudent(studentData);
    setIsEditOpen(false);
    await loadData();
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-zinc-500">Loading student profile...</div>;
  }

  if (!student) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-zinc-200">
        <h2 className="text-base font-bold text-zinc-900 mb-2">Student Record Not Found</h2>
        <Button variant="outline" size="sm" onClick={() => navigate('/students')}>
          Back to Students Directory
        </Button>
      </div>
    );
  }

  // Security Check: Dept Coordinators cannot view candidate profiles outside their department scope
  if (role === 'dept_coordinator' && departmentScope && student.department.toLowerCase() !== departmentScope.toLowerCase()) {
    return (
      <div className="p-8 text-center max-w-md mx-auto my-12 bg-white rounded-xl border border-zinc-200 shadow-xs space-y-4">
        <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto font-bold text-xl">
          !
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-900 mb-1">Access Restricted</h2>
          <p className="text-xs text-zinc-500">
            As Department Coordinator for <span className="font-semibold text-zinc-800">{departmentScope}</span>, you are not authorized to view candidates from <span className="font-semibold text-zinc-800">{student.department}</span>.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/students')}>
          Return to My Department Directory
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/students')} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Students Directory</span>
        </Button>

        <div className="flex items-center gap-3">
          {canCreateEdit && (
            <Button size="sm" variant="outline" onClick={() => setIsEditOpen(!isEditOpen)} className="gap-1.5">
              <Edit className="h-4 w-4" />
              <span>Edit Student Profile</span>
            </Button>
          )}
          <Badge variant={student.placement_status as any}>
            {student.placement_status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Inline Edit Form */}
      {isEditOpen && (
        <StudentInlineForm
          student={student}
          onSave={handleSaveStudent}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      {/* 70% Left / 30% Right Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        
        {/* LEFT 70% COLUMN: Attended Drives & Status Matrix */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Attended Drives Card */}
          <Card className="p-6 bg-white border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-zinc-700" />
                  <span>Attended Recruitment Drives</span>
                </h2>
                <p className="text-xs text-zinc-500">
                  Drive application matrix and stage-wise recruitment status for {student.name}.
                </p>
              </div>
              <span className="text-xs font-bold bg-zinc-100 px-2.5 py-1 rounded text-zinc-800">
                {applications.length} Drive(s) Registered
              </span>
            </div>

            {applications.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500 space-y-3">
                <AlertCircle className="h-8 w-8 text-zinc-300 mx-auto" />
                <p>This candidate has not registered for or attended any recruitment drives yet.</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/offers')}>
                  View Active Offers Directory
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto border border-zinc-200 rounded-lg">
                <table className="w-full text-left text-xs text-zinc-700">
                  <thead className="bg-zinc-100 uppercase text-[11px] font-semibold text-zinc-600 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Company & Drive</th>
                      <th className="py-3 px-4">CTC Package</th>
                      <th className="py-3 px-4">Drive Date & Mode</th>
                      <th className="py-3 px-4 text-center">Application Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {applications.map((app) => {
                      const offer = offersMap[app.offer_id];
                      return (
                        <tr key={app.application_id} className="hover:bg-zinc-50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div>
                              <button
                                onClick={() => navigate(`/offers/${app.offer_id}`)}
                                className="font-bold text-zinc-900 hover:underline text-sm text-left"
                              >
                                {offer?.company?.name || 'Recruitment Drive'}
                              </button>
                              <p className="text-[11px] text-zinc-500">
                                {offer?.job_location || 'Flexible Location'}
                              </p>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">
                            {offer?.ctc_lpa ? `${offer.ctc_lpa} LPA` : 'TBD'}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5 text-[11px]">
                              <div className="flex items-center gap-1 text-zinc-800 font-medium">
                                <Calendar className="h-3 w-3 text-zinc-400" />
                                <span>{offer?.drive_date || 'TBD'}</span>
                              </div>
                              <span className="uppercase text-[10px] text-zinc-500 font-semibold">
                                {offer?.drive_mode?.replace('_', ' ') || 'On Campus'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Badge variant={app.final_status as any}>
                              {app.final_status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Academic & Performance Snapshot */}
          <Card className="p-6 bg-white border-zinc-200 space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider border-b border-zinc-100 pb-2">
              Academic Scorecard & Metrics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <span className="text-[10px] uppercase font-semibold text-zinc-500 block">10th (SSLC) %</span>
                <span className="text-base font-bold text-zinc-900 font-mono">
                  {student.sslc_percentage ? `${student.sslc_percentage}%` : 'N/A'}
                </span>
              </div>

              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <span className="text-[10px] uppercase font-semibold text-zinc-500 block">12th (HSC) %</span>
                <span className="text-base font-bold text-zinc-900 font-mono">
                  {student.hsc_percentage ? `${student.hsc_percentage}%` : 'N/A'}
                </span>
              </div>

              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Primary UG CGPA</span>
                <span className="text-base font-bold text-emerald-700 font-mono">
                  {student.ug_cgpa ? student.ug_cgpa.toFixed(2) : 'N/A'}
                </span>
              </div>

              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Active Backlogs</span>
                <span className={`text-base font-bold font-mono ${student.backlogs_count > 0 ? 'text-rose-600' : 'text-zinc-900'}`}>
                  {student.backlogs_count}
                </span>
              </div>
            </div>

            {/* Additional Academic Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-xs border-t border-zinc-100">
              <div>
                <span className="text-zinc-500 block">UG Graduation Year</span>
                <span className="font-semibold text-zinc-900">{student.ug_graduation_year || '2026'}</span>
              </div>

              <div>
                <span className="text-zinc-500 block">UG Grade Percentage</span>
                <span className="font-semibold text-zinc-900">{student.ug_percentage ? `${student.ug_percentage}%` : 'N/A'}</span>
              </div>

              <div>
                <span className="text-zinc-500 block">PG Status</span>
                <span className="font-semibold text-zinc-900 capitalize">{student.pg_status?.replace('_', ' ') || 'Not Applicable'}</span>
              </div>

              <div>
                <span className="text-zinc-500 block">PG CGPA / Grad Year</span>
                <span className="font-semibold text-zinc-900">
                  {student.pg_cgpa ? `${student.pg_cgpa} CGPA (${student.pg_graduation_year || 'N/A'})` : 'N/A'}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT 30% COLUMN: Photo & Student Profile Details */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-6 bg-white border-zinc-200 space-y-6 text-center shadow-xs">
            
            {/* Photo Placeholder at Top Right */}
            <div className="space-y-3">
              {student.photo_file ? (
                <img
                  src={student.photo_file}
                  alt={student.name}
                  className="w-36 h-36 rounded-full object-cover border-4 border-zinc-100 shadow-md mx-auto"
                />
              ) : (
                <div className="w-36 h-36 rounded-full bg-zinc-900 text-white font-bold text-3xl flex items-center justify-center border-4 border-zinc-100 shadow-md mx-auto">
                  {student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
              )}

              <div>
                <h2 className="text-lg font-bold text-zinc-900">{student.name}</h2>
                <p className="text-xs font-mono font-bold text-zinc-500">{student.roll_number}</p>
                <p className="text-xs font-semibold text-emerald-700 mt-1">{student.department}</p>
                
                <div className="mt-2.5 flex items-center justify-center gap-1.5">
                  <span className="text-[11px] font-semibold px-3 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 uppercase">
                    Batch {student.batch || 'A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Details List */}
            <div className="border-t border-zinc-100 pt-4 text-left space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-zinc-50">
                <span className="text-zinc-500 font-medium">Source Column</span>
                <span className="font-bold text-zinc-900">{student.source || 'Direct Entry'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-zinc-50">
                <span className="text-zinc-500 font-medium">Gender</span>
                <span className="font-semibold text-zinc-900">{student.gender || 'Not specified'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-zinc-50">
                <span className="text-zinc-500 font-medium">Student Type / Residency</span>
                <span className="font-semibold text-zinc-900 capitalize">{student.residency?.replace('_', ' ') || 'Day Scholar'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-zinc-50">
                <span className="text-zinc-500 font-medium">Graduation Date</span>
                <span className="font-semibold text-zinc-900">{student.graduation_date || student.ug_graduation_year || '2026'}</span>
              </div>

              {/* College Email */}
              <div className="space-y-1 py-1 border-b border-zinc-50">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium">College Email</span>
                  {student.email && (
                    <button
                      onClick={() => handleCopy(student.email, 'email')}
                      className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors"
                      title="Copy College Email"
                    >
                      {copiedKey === 'email' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
                <a href={`mailto:${student.email}`} className="font-semibold text-blue-600 hover:underline truncate block">
                  <Mail className="h-3.5 w-3.5 inline mr-1.5 text-blue-500" />
                  <span>{student.email}</span>
                </a>
              </div>

              {/* Personal Email */}
              <div className="space-y-1 py-1 border-b border-zinc-50">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium">Personal Email</span>
                  {student.personal_email && (
                    <button
                      onClick={() => handleCopy(student.personal_email!, 'personal_email')}
                      className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors"
                      title="Copy Personal Email"
                    >
                      {copiedKey === 'personal_email' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
                {student.personal_email ? (
                  <a href={`mailto:${student.personal_email}`} className="font-semibold text-zinc-900 hover:underline truncate block">
                    <Mail className="h-3.5 w-3.5 inline mr-1.5 text-zinc-500" />
                    <span>{student.personal_email}</span>
                  </a>
                ) : (
                  <span className="text-zinc-400 italic">Not provided</span>
                )}
              </div>

              {/* Mobile */}
              <div className="space-y-1 py-1 border-b border-zinc-50">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium">Mobile Number</span>
                  {student.mobile_number && (
                    <button
                      onClick={() => handleCopy(student.mobile_number!, 'mobile_number')}
                      className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors"
                      title="Copy Mobile Number"
                    >
                      {copiedKey === 'mobile_number' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
                {student.mobile_number ? (
                  <a href={`tel:${student.mobile_number}`} className="font-semibold text-zinc-900 hover:underline flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-zinc-500" />
                    <span>{student.mobile_number}</span>
                  </a>
                ) : (
                  <span className="text-zinc-400 font-mono">-</span>
                )}
              </div>

              {/* GitHub Link */}
              <div className="space-y-1 py-1 border-b border-zinc-50">
                <span className="text-zinc-500 font-medium block">GitHub Profile</span>
                {student.github_url ? (
                  <a href={student.github_url} target="_blank" rel="noreferrer" className="font-semibold text-zinc-900 hover:text-emerald-600 hover:underline flex items-center gap-1.5 truncate">
                    <Github className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{student.github_url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-zinc-400" />
                  </a>
                ) : (
                  <span className="text-zinc-400 italic">Not provided</span>
                )}
              </div>

              {/* LinkedIn Link */}
              <div className="space-y-1 py-1 border-b border-zinc-50">
                <span className="text-zinc-500 font-medium block">LinkedIn Profile</span>
                {student.linkedin_url ? (
                  <a href={student.linkedin_url} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 hover:underline flex items-center gap-1.5 truncate">
                    <Linkedin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{student.linkedin_url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-zinc-400" />
                  </a>
                ) : (
                  <span className="text-zinc-400 italic">Not provided</span>
                )}
              </div>

              {/* Portfolio Link */}
              <div className="space-y-1 py-1 border-b border-zinc-50">
                <span className="text-zinc-500 font-medium block">Portfolio Website</span>
                {student.portfolio_url ? (
                  <a href={student.portfolio_url} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 hover:underline flex items-center gap-1.5 truncate">
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{student.portfolio_url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-zinc-400" />
                  </a>
                ) : (
                  <span className="text-zinc-400 italic">Not provided</span>
                )}
              </div>

              {/* Video Intro Link */}
              <div className="space-y-1 py-1 border-b border-zinc-50">
                <span className="text-zinc-500 font-medium block">Video Introduction</span>
                {student.video_intro_link ? (
                  <a href={student.video_intro_link} target="_blank" rel="noreferrer" className="font-semibold text-purple-700 hover:underline flex items-center gap-1.5 truncate">
                    <Video className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{student.video_intro_link}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-zinc-400" />
                  </a>
                ) : (
                  <span className="text-zinc-400 italic">Not provided</span>
                )}
              </div>

              {/* Resume File Button */}
              {student.resume_file ? (
                <div className="pt-2">
                  <a
                    href={student.resume_file}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 text-xs transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    <span>View Resume Document</span>
                  </a>
                </div>
              ) : (
                <div className="pt-2 text-center text-[11px] text-zinc-400 italic">
                  No resume attached to profile
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
