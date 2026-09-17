import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import StatsCard from '../../components/StatsCard';
import Badge from '../../components/Badge';
import {
  Users,
  GraduationCap,
  BookOpen,
  Bell,
  Wrench,
  Download,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Layers,
  Sparkles,
  Filter
} from 'lucide-react';

export default function AdminPortal() {
  const [activeTab, setActiveTab] = useState('students');
  const [loading, setLoading] = useState(true);

  // Core records
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [notices, setNotices] = useState([]);
  const [pyqs, setPyqs] = useState([]);
  const [complaints, setComplaints] = useState([]);

  // Filter & Search
  const [studentSearch, setStudentSearch] = useState('');
  const [semFilter, setSemFilter] = useState('');

  // Modals & Forms
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    rollNumber: '',
    name: '',
    course: 'B.Tech',
    branch: 'Computer Science & Engineering',
    section: 'A',
    currentSemester: 1,
    mobileNumber: '',
    collegeEmail: '',
    fatherName: '',
    fatherMobile: '',
    hostelType: 'Day Scholar',
  });

  const [showAddNoticeModal, setShowAddNoticeModal] = useState(false);
  const [newNotice, setNewNotice] = useState({
    title: '',
    description: '',
    category: 'Academic',
    targetAudience: 'all',
  });

  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newSubject, setNewSubject] = useState({
    code: '',
    name: '',
    branch: 'Computer Science & Engineering',
    semester: 1,
    credits: 4,
  });

  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [stRes, facRes, mentRes, subRes, notRes, pyqRes, compRes] = await Promise.all([
        api.get('/admin/students'),
        api.get('/admin/faculty'),
        api.get('/admin/mentors'),
        api.get('/admin/subjects'),
        api.get('/common/notices'),
        api.get('/common/pyqs'),
        api.get('/admin/complaints'),
      ]);

      setStudents(stRes.data.students || []);
      setFaculty(facRes.data.faculty || []);
      setMentors(mentRes.data.mentors || []);
      setSubjects(subRes.data.subjects || []);
      setNotices(notRes.data.notices || []);
      setPyqs(pyqRes.data.papers || []);
      setComplaints(compRes.data.complaints || []);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add Student Handler
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      const res = await api.post('/admin/students', newStudent);
      setMsg({
        type: 'success',
        text: `Student created! Default password: ${res.data.defaultPassword} (Name + last 4 mobile digits)`,
      });
      setShowAddStudentModal(false);
      // Refresh
      const r = await api.get('/admin/students');
      setStudents(r.data.students || []);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to create student.' });
    }
  };

  // Reset Student Password to Default
  const handleResetPassword = async (roll) => {
    try {
      const res = await api.post(`/admin/students/${roll}/reset-password`);
      setMsg({
        type: 'success',
        text: `Password for ${roll} reset to default: "${res.data.defaultPassword}"`,
      });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to reset password.' });
    }
  };

  // Publish Notice
  const handleCreateNotice = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      await api.post('/admin/notices', newNotice);
      setMsg({ type: 'success', text: 'Notice published successfully to campus portal!' });
      setShowAddNoticeModal(false);
      const res = await api.get('/common/notices');
      setNotices(res.data.notices || []);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to publish notice.' });
    }
  };

  // Create Subject
  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      await api.post('/admin/subjects', newSubject);
      setMsg({ type: 'success', text: `Subject ${newSubject.code} created successfully!` });
      setShowAddSubjectModal(false);
      const res = await api.get('/admin/subjects');
      setSubjects(res.data.subjects || []);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to create subject.' });
    }
  };

  // Update Complaint Status
  const handleUpdateComplaint = async (id, status) => {
    try {
      await api.patch(`/admin/complaints/${id}`, { status });
      setMsg({ type: 'success', text: `Complaint #${id} updated to ${status}` });
      const res = await api.get('/admin/complaints');
      setComplaints(res.data.complaints || []);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update complaint.' });
    }
  };

  const filteredStudents = students
    .filter((s) => !semFilter || String(s.current_semester) === String(semFilter))
    .filter(
      (s) =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.roll_number.toLowerCase().includes(studentSearch.toLowerCase())
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-forest-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">Loading system administration master...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Admin Header */}
      <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-forest-950 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-forest-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Enterprise Master Control Center</span>
            <span>•</span>
            <span>University Governance</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            System Administrator Master
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Manage student registrations, faculty allocations, class mentors, all 8 semester subjects, notices, and question paper repositories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddStudentModal(true)}
            className="py-2.5 px-4 rounded-xl bg-forest-600 hover:bg-forest-500 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
          <button
            onClick={() => setShowAddNoticeModal(true)}
            className="py-2.5 px-4 rounded-xl bg-earth-700 hover:bg-earth-600 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
          >
            <Bell className="w-4 h-4" />
            <span>Post Notice</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatsCard
          title="Total Students"
          value={students.length}
          subtitle="Semesters 1 to 8"
          icon={GraduationCap}
          color="forest"
        />
        <StatsCard
          title="Faculty Members"
          value={faculty.length}
          subtitle="Includes HODs"
          icon={Users}
          color="earth"
        />
        <StatsCard
          title="Class Mentors"
          value={mentors.length}
          subtitle="Dual Mentor Pairs"
          icon={Layers}
          color="terracotta"
        />
        <StatsCard
          title="Curriculum Subjects"
          value={subjects.length}
          subtitle="All 8 Semesters"
          icon={BookOpen}
          color="sage"
        />
      </div>

      {msg.text && (
        <div
          className={`mb-6 p-4 rounded-2xl text-xs flex items-start gap-2.5 ${
            msg.type === 'success'
              ? 'bg-forest-50 text-forest-800 border border-forest-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="font-medium">{msg.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'students'
              ? 'bg-forest-700 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Student Master ({students.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('faculty')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'faculty'
              ? 'bg-forest-700 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Faculty & Mentors</span>
        </button>

        <button
          onClick={() => setActiveTab('subjects')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'subjects'
              ? 'bg-forest-700 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Subjects Master (8 Semesters)</span>
        </button>

        <button
          onClick={() => setActiveTab('notices')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'notices'
              ? 'bg-forest-700 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notices & Circulars ({notices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('complaints')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'complaints'
              ? 'bg-forest-700 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Maintenance Complaints ({complaints.length})</span>
        </button>
      </div>

      {/* TAB: STUDENTS MASTER */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student by name or roll number..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-forest-600 outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={semFilter}
                  onChange={(e) => setSemFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium"
                >
                  <option value="">All Semesters (1–8)</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>

                <button
                  onClick={() => setShowAddStudentModal(true)}
                  className="py-2 px-3.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Student
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Roll Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Branch & Semester</th>
                    <th className="py-3 px-4">Section</th>
                    <th className="py-3 px-4">Mobile</th>
                    <th className="py-3 px-4">Default Password Policy</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        No students match the current criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => (
                      <tr key={s.roll_number} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {s.roll_number}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {s.name}
                        </td>
                        <td className="py-3 px-4">
                          {s.branch} • Sem {s.current_semester}
                        </td>
                        <td className="py-3 px-4">Sec {s.section}</td>
                        <td className="py-3 px-4 font-mono">{s.mobile_number}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                            {s.name.toUpperCase() + (s.mobile_number ? s.mobile_number.slice(-4) : '4321')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleResetPassword(s.roll_number)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-forest-700 hover:bg-forest-50 transition"
                            title="Reset password to default policy"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* TAB: FACULTY & MENTORS */}
      {activeTab === 'faculty' && (
        <div className="space-y-8">
          
          {/* Mentors Pairing List */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Class Mentors Pairing System (Dual Mentorship)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Pairs of Primary and Secondary mentors assigned to each branch, semester, and section. Supports Male+Male, Female+Female, or Male+Female pairings.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mentors.map((m) => (
                <div key={m.id} className="p-4 rounded-2xl bg-earth-50/50 dark:bg-slate-800 border border-earth-200/70 dark:border-slate-700 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      Sem {m.semester} - Sec {m.section}
                    </span>
                    <Badge variant="earth">{m.branch}</Badge>
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-earth-200/60 dark:border-slate-700">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Mentor 1 (Primary):</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{m.primary_mentor_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Mentor 2 (Secondary):</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{m.secondary_mentor_name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Faculty Master List */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Faculty Master Directory
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Gender</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4">HOD Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {faculty.map((f) => (
                    <tr key={f.employee_id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">{f.employee_id}</td>
                      <td className="py-3 px-4 font-semibold">{f.name}</td>
                      <td className="py-3 px-4">{f.gender}</td>
                      <td className="py-3 px-4">{f.department}</td>
                      <td className="py-3 px-4">{f.designation}</td>
                      <td className="py-3 px-4">
                        {f.is_hod ? <Badge variant="terracotta">HOD</Badge> : <Badge variant="default">Faculty</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB: SUBJECTS MASTER */}
      {activeTab === 'subjects' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  University Curriculum Master (Semesters 1 to 8)
                </h3>
                <p className="text-xs text-slate-500">
                  AKTU B.Tech Subject Codes, Credits, and Syllabus Allocations
                </p>
              </div>

              <button
                onClick={() => setShowAddSubjectModal(true)}
                className="py-2 px-3.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Subject
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Subject Code</th>
                    <th className="py-3 px-4">Subject Name</th>
                    <th className="py-3 px-4">Semester</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Credits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {subjects.map((sub) => (
                    <tr key={sub.code} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">{sub.code}</td>
                      <td className="py-3 px-4 font-semibold">{sub.name}</td>
                      <td className="py-3 px-4">Semester {sub.semester}</td>
                      <td className="py-3 px-4">{sub.branch}</td>
                      <td className="py-3 px-4 font-bold">{sub.credits} Credits</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* TAB: NOTICES */}
      {activeTab === 'notices' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  College Notices, Circulars & Announcements
                </h3>
                <p className="text-xs text-slate-500">
                  Published across student, faculty, and departmental dashboards
                </p>
              </div>

              <button
                onClick={() => setShowAddNoticeModal(true)}
                className="py-2 px-3.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Publish Notice
              </button>
            </div>

            <div className="space-y-3">
              {notices.map((n) => (
                <div key={n.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-bold text-forest-700">{n.category}</span>
                    <span>Audience: {n.target_audience} • {n.posted_date}</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{n.title}</h4>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">{n.description}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* TAB: MAINTENANCE COMPLAINTS */}
      {activeTab === 'complaints' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Classroom & Campus Maintenance Control
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Override and manage student reported classroom hardware faults
            </p>

            <div className="space-y-3">
              {complaints.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {c.category} • {c.location}
                      </span>
                      <span className="text-slate-400 text-[11px] ml-2">by {c.student_roll_no}</span>
                    </div>
                    <Badge variant={c.status === 'Resolved' ? 'present' : c.status === 'In Progress' ? 'warning' : 'pending'}>
                      {c.status}
                    </Badge>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mb-3">{c.description}</p>
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-500">Change Status:</span>
                    <button
                      onClick={() => handleUpdateComplaint(c.id, 'In Progress')}
                      className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold text-[10px]"
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => handleUpdateComplaint(c.id, 'Resolved')}
                      className="px-2.5 py-1 rounded-lg bg-forest-100 hover:bg-forest-200 text-forest-800 font-semibold text-[10px]"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* MODAL: ADD STUDENT */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Add New Student & Generate Credentials
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Account password will automatically generate according to standard institutional policy.
            </p>

            <form onSubmit={handleCreateStudent} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-0.5">Roll Number</label>
                  <input
                    type="text"
                    required
                    value={newStudent.rollNumber}
                    onChange={(e) => setNewStudent({ ...newStudent, rollNumber: e.target.value })}
                    placeholder="e.g. 210097010099"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-0.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-0.5">Semester</label>
                  <select
                    value={newStudent.currentSemester}
                    onChange={(e) => setNewStudent({ ...newStudent, currentSemester: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Sem {s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-0.5">Section</label>
                  <select
                    value={newStudent.section}
                    onChange={(e) => setNewStudent({ ...newStudent, section: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="A">Sec A</option>
                    <option value="B">Sec B</option>
                    <option value="C">Sec C</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-0.5">Residence</label>
                  <select
                    value={newStudent.hostelType}
                    onChange={(e) => setNewStudent({ ...newStudent, hostelType: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="Day Scholar">Day Scholar</option>
                    <option value="Hostel">Hostel</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-0.5">Mobile Number</label>
                  <input
                    type="text"
                    required
                    value={newStudent.mobileNumber}
                    onChange={(e) => setNewStudent({ ...newStudent, mobileNumber: e.target.value })}
                    placeholder="e.g. 9876501234"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-0.5">Father Name</label>
                  <input
                    type="text"
                    value={newStudent.fatherName}
                    onChange={(e) => setNewStudent({ ...newStudent, fatherName: e.target.value })}
                    placeholder="e.g. R. K. Sharma"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white text-xs font-bold shadow-sm"
                >
                  Register Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PUBLISH NOTICE */}
      {showAddNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Publish Notice / Circular
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Will broadcast on student and faculty notice feeds.
            </p>

            <form onSubmit={handleCreateNotice} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-0.5">Notice Title</label>
                <input
                  type="text"
                  required
                  value={newNotice.title}
                  onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                  placeholder="e.g. AKTU Odd Semester Exam Registration"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-0.5">Category</label>
                  <select
                    value={newNotice.category}
                    onChange={(e) => setNewNotice({ ...newNotice, category: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="Academic">Academic</option>
                    <option value="Examination">Examination</option>
                    <option value="Placement">Placement</option>
                    <option value="Sports">Sports</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-0.5">Audience</label>
                  <select
                    value={newNotice.targetAudience}
                    onChange={(e) => setNewNotice({ ...newNotice, targetAudience: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="all">All Students & Faculty</option>
                    <option value="CSE">Computer Science Only</option>
                    <option value="ECE">Electronics Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-0.5">Details</label>
                <textarea
                  rows={3}
                  required
                  value={newNotice.description}
                  onChange={(e) => setNewNotice({ ...newNotice, description: e.target.value })}
                  placeholder="Provide full description..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddNoticeModal(false)}
                  className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white text-xs font-bold shadow-sm"
                >
                  Broadcast Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SUBJECT */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Add New Curriculum Subject
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Add AKTU course code for continuous evaluation and attendance.
            </p>

            <form onSubmit={handleCreateSubject} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-0.5">Subject Code</label>
                  <input
                    type="text"
                    required
                    value={newSubject.code}
                    onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                    placeholder="e.g. KCS501"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-0.5">Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    required
                    value={newSubject.credits}
                    onChange={(e) => setNewSubject({ ...newSubject, credits: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-0.5">Subject Name</label>
                <input
                  type="text"
                  required
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  placeholder="e.g. Database Management Systems"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-0.5">Semester</label>
                <select
                  value={newSubject.semester}
                  onChange={(e) => setNewSubject({ ...newSubject, semester: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white text-xs font-bold shadow-sm"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
