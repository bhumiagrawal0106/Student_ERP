import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import StatsCard from '../../components/StatsCard';
import Badge from '../../components/Badge';
import {
  LayoutDashboard,
  CalendarCheck,
  Award,
  FileCheck2,
  Users,
  CheckCircle,
  AlertCircle,
  Send,
  Save,
  Check,
  X,
  Clock,
  BookOpen
} from 'lucide-react';

export default function FacultyPortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Core data
  const [allocations, setAllocations] = useState([]);
  const [mentorSections, setMentorSections] = useState([]);
  const [leavesToReview, setLeavesToReview] = useState([]);

  // Attendance Marking State
  const [attForm, setAttForm] = useState({
    subjectCode: '',
    section: 'A',
    date: new Date().toISOString().split('T')[0],
    period: 1,
  });
  const [classStudents, setClassStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({}); // roll -> 'Present'|'Absent'|'Extra'
  const [attMsg, setAttMsg] = useState({ type: '', text: '' });
  const [attSaving, setAttSaving] = useState(false);

  // Sessional Marks Entry State
  const [marksForm, setMarksForm] = useState({
    subjectCode: '',
    section: 'A',
    examType: 'ST1',
  });
  const [marksStudents, setMarksStudents] = useState([]);
  const [marksInput, setMarksInput] = useState({}); // roll -> number
  const [marksMsg, setMarksMsg] = useState({ type: '', text: '' });
  const [marksSaving, setMarksSaving] = useState(false);

  // Leave Review State
  const [reviewRemarks, setReviewRemarks] = useState({});
  const [reviewMsg, setReviewMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchFacultyData();
  }, []);

  const fetchFacultyData = async () => {
    try {
      setLoading(true);
      const [allocRes, mentorRes, leavesRes] = await Promise.all([
        api.get('/faculty/allocations'),
        api.get('/faculty/mentor-batches'),
        api.get('/faculty/leaves-to-review'),
      ]);

      const allocs = allocRes.data.allocations || [];
      setAllocations(allocs);
      setMentorSections(mentorRes.data.batches || []);
      setLeavesToReview(leavesRes.data.leaves || []);

      if (allocs.length > 0) {
        setAttForm((prev) => ({
          ...prev,
          subjectCode: allocs[0].subject_code,
          section: allocs[0].section || 'A',
        }));
        setMarksForm((prev) => ({
          ...prev,
          subjectCode: allocs[0].subject_code,
          section: allocs[0].section || 'A',
        }));
        loadStudentsForAttendance(allocs[0].subject_code, allocs[0].section || 'A');
        loadStudentsForMarks(allocs[0].subject_code, allocs[0].section || 'A', 'ST1');
      }
    } catch (err) {
      console.error('Error fetching faculty details:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsForAttendance = async (subjectCode, section) => {
    try {
      const res = await api.get(`/faculty/students-for-class?subjectCode=${subjectCode}&section=${section}`);
      const students = res.data.students || [];
      setClassStudents(students);
      // Default all to Present
      const initial = {};
      students.forEach((s) => {
        initial[s.roll_number] = 'Present';
      });
      setAttendanceRecords(initial);
    } catch (err) {
      console.warn('Could not load students for attendance:', err.message);
    }
  };

  const loadStudentsForMarks = async (subjectCode, section, examType) => {
    try {
      const res = await api.get(
        `/faculty/students-for-marks?subjectCode=${subjectCode}&section=${section}&examType=${examType}`
      );
      const students = res.data.students || [];
      setMarksStudents(students);
      const initial = {};
      students.forEach((s) => {
        initial[s.roll_number] = s.marks_obtained !== null && s.marks_obtained !== undefined ? s.marks_obtained : '';
      });
      setMarksInput(initial);
    } catch (err) {
      console.warn('Could not load students for marks:', err.message);
    }
  };

  // Submit attendance
  const handleSaveAttendance = async () => {
    setAttMsg({ type: '', text: '' });
    if (!attForm.subjectCode || !attForm.date || !attForm.period) {
      setAttMsg({ type: 'error', text: 'Please choose subject, date and period.' });
      return;
    }

    try {
      setAttSaving(true);
      const records = Object.entries(attendanceRecords).map(([roll, status]) => ({
        studentRollNo: roll,
        status,
      }));

      await api.post('/faculty/attendance/mark', {
        subjectCode: attForm.subjectCode,
        section: attForm.section,
        date: attForm.date,
        periodNumber: Number(attForm.period),
        records,
      });

      setAttMsg({
        type: 'success',
        text: `Attendance for Period ${attForm.period} on ${attForm.date} successfully recorded in the database!`,
      });
    } catch (err) {
      setAttMsg({ type: 'error', text: err.response?.data?.message || 'Failed to record attendance.' });
    } finally {
      setAttSaving(false);
    }
  };

  // Bulk attendance toggles
  const markAllStatus = (status) => {
    const updated = { ...attendanceRecords };
    classStudents.forEach((s) => {
      updated[s.roll_number] = status;
    });
    setAttendanceRecords(updated);
  };

  // Save Sessional Marks
  const handleSaveMarks = async () => {
    setMarksMsg({ type: '', text: '' });
    const maxAllowed = marksForm.examType === 'PUT' ? 50 : 30;

    const entries = [];
    for (const s of marksStudents) {
      const val = marksInput[s.roll_number];
      if (val !== '' && val !== undefined) {
        const num = Number(val);
        if (num < 0 || num > maxAllowed) {
          setMarksMsg({
            type: 'error',
            text: `Marks for ${s.name} (${val}) exceed maximum allowed (${maxAllowed}) for ${marksForm.examType}.`,
          });
          return;
        }
        entries.push({
          studentRollNo: s.roll_number,
          marksObtained: num,
          maxMarks: maxAllowed,
        });
      }
    }

    try {
      setMarksSaving(true);
      await api.post('/faculty/marks/entry', {
        subjectCode: marksForm.subjectCode,
        semester: allocations.find((a) => a.subject_code === marksForm.subjectCode)?.semester || 5,
        examType: marksForm.examType,
        marks: entries,
      });

      setMarksMsg({
        type: 'success',
        text: `Successfully entered ${entries.length} student marks for ${marksForm.examType}!`,
      });
    } catch (err) {
      setMarksMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save marks.' });
    } finally {
      setMarksSaving(false);
    }
  };

  // Review Leave
  const handleReviewLeave = async (leaveId, decision) => {
    setReviewMsg({ type: '', text: '' });
    const remark = reviewRemarks[leaveId] || '';

    try {
      await api.post(`/faculty/leaves/${leaveId}/review`, {
        decision,
        remark,
      });
      setReviewMsg({
        type: 'success',
        text: `Leave #${leaveId} marked as ${decision}. Notification delivered.`,
      });
      // Refresh leaves
      const res = await api.get('/faculty/leaves-to-review');
      setLeavesToReview(res.data.leaves || []);
    } catch (err) {
      setReviewMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update leave.' });
    }
  };

  const navTabs = [
    { id: 'dashboard', label: 'Faculty Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Period-wise Attendance', icon: CalendarCheck },
    { id: 'marks', label: 'Sessional Marks Entry', icon: Award },
    { id: 'leaves', label: `Mentor Leave Review (${leavesToReview.length})`, icon: FileCheck2 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-earth-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">Loading faculty workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Faculty Welcome Banner */}
      <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-earth-900 via-earth-800 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-earth-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Employee ID: {user?.username}</span>
            <span>•</span>
            <span>{user?.profile?.department}</span>
            <span>•</span>
            <span>{user?.profile?.designation}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Faculty Workspace - {user?.profile?.name}
          </h2>
          <p className="text-sm text-earth-100/80 mt-1 max-w-xl">
            Mark 8-period timetable attendance, record continuous sessional evaluations (ST1, ST2, PUT), and conduct dual-mentor leave reviews.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15">
          <div className="text-right">
            <p className="text-[11px] text-earth-200 uppercase font-semibold">Allocated Classes</p>
            <p className="text-xl font-extrabold text-white">
              {allocations.length} Subjects
            </p>
          </div>
          <BookOpen className="w-8 h-8 text-earth-300" />
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-earth-800 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-earth-50 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatsCard
              title="Teaching Subjects"
              value={`${allocations.length} Courses`}
              subtitle="Current Semester Allocations"
              icon={BookOpen}
              color="earth"
            />
            <StatsCard
              title="Mentor Batches"
              value={`${mentorSections.length} Sections`}
              subtitle="Dual Mentor Assignment"
              icon={Users}
              color="forest"
            />
            <StatsCard
              title="Pending Leaves"
              value={`${leavesToReview.length} Requests`}
              subtitle="Requires Dual-Mentor Action"
              icon={FileCheck2}
              color={leavesToReview.length > 0 ? 'terracotta' : 'sage'}
            />
            <StatsCard
              title="8-Period Slots"
              value="Periods 1–8"
              subtitle="Regular Daily Schedule"
              icon={Clock}
              color="sage"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Allocated Subjects */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                Assigned Teaching Subjects & Sections
              </h3>
              <div className="space-y-3">
                {allocations.map((a) => (
                  <div key={a.id} className="p-4 rounded-2xl bg-earth-50/50 dark:bg-slate-800 border border-earth-200/60 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-0.5">
                        <span className="font-bold text-earth-800 dark:text-earth-300">{a.subject_code}</span>
                        <span>•</span>
                        <span>Sem {a.semester} (Sec {a.section})</span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{a.subject_name}</h4>
                      <p className="text-xs text-slate-500">{a.credits} Academic Credits</p>
                    </div>

                    <button
                      onClick={() => {
                        setAttForm((prev) => ({
                          ...prev,
                          subjectCode: a.subject_code,
                          section: a.section,
                        }));
                        loadStudentsForAttendance(a.subject_code, a.section);
                        setActiveTab('attendance');
                      }}
                      className="py-1.5 px-3 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-semibold text-xs transition"
                    >
                      Mark Attendance →
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Mentor Batches */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                Class Mentor Assignments (Dual Mentorship)
              </h3>
              <div className="space-y-3">
                {mentorSections.length === 0 ? (
                  <p className="text-xs text-slate-500">You are not designated as a Class Mentor this semester.</p>
                ) : (
                  mentorSections.map((b) => (
                    <div key={b.id} className="p-4 rounded-2xl bg-forest-50/50 dark:bg-slate-800 border border-forest-200/60 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {b.branch} • Semester {b.semester} (Sec {b.section})
                        </span>
                        <Badge variant="present">Assigned Mentor</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">
                        Dual Mentor Partner: {b.partner_name} ({b.partner_gender}, {b.partner_designation})
                      </p>
                      <button
                        onClick={() => setActiveTab('leaves')}
                        className="text-xs font-semibold text-forest-700 hover:text-forest-800"
                      >
                        Review Student Leave Applications ({leavesToReview.length}) →
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB CONTENT: PERIOD-WISE ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Period-by-Period Attendance Marker
                </h3>
                <p className="text-xs text-slate-500">
                  Select lecture slot (1 to 8), mark Present/Absent/Extra, and save records
                </p>
              </div>

              {/* Class Selectors */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Subject</label>
                  <select
                    value={attForm.subjectCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setAttForm({ ...attForm, subjectCode: code });
                      loadStudentsForAttendance(code, attForm.section);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white font-medium"
                  >
                    {allocations.map((a) => (
                      <option key={a.id} value={a.subject_code}>
                        {a.subject_code} - {a.subject_name.substring(0, 16)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Section</label>
                  <select
                    value={attForm.section}
                    onChange={(e) => {
                      const sec = e.target.value;
                      setAttForm({ ...attForm, section: sec });
                      loadStudentsForAttendance(attForm.subjectCode, sec);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white font-medium"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Date</label>
                  <input
                    type="date"
                    value={attForm.date}
                    onChange={(e) => setAttForm({ ...attForm, date: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Period</label>
                  <select
                    value={attForm.period}
                    onChange={(e) => setAttForm({ ...attForm, period: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white font-bold text-forest-800"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                      <option key={p} value={p}>Period {p}</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            {/* Quick Actions & Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Bulk Actions:</span>
                <button
                  type="button"
                  onClick={() => markAllStatus('Present')}
                  className="px-3 py-1 rounded-xl bg-forest-100 hover:bg-forest-200 text-forest-800 text-xs font-semibold transition"
                >
                  ✓ All Present
                </button>
                <button
                  type="button"
                  onClick={() => markAllStatus('Absent')}
                  className="px-3 py-1 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold transition"
                >
                  ✗ All Absent
                </button>
                <button
                  type="button"
                  onClick={() => markAllStatus('Extra')}
                  className="px-3 py-1 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-semibold transition"
                >
                  ✦ All Extra (Neutral)
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={attSaving || classStudents.length === 0}
                className="py-2.5 px-5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs shadow-md shadow-forest-800/20 transition flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{attSaving ? 'Saving...' : 'Save Period Attendance'}</span>
              </button>
            </div>

            {attMsg.text && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-start gap-2 ${
                  attMsg.type === 'success'
                    ? 'bg-forest-50 text-forest-800 border border-forest-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {attMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{attMsg.text}</span>
              </div>
            )}

            {/* Students Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Roll Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Current Attendance %</th>
                    <th className="py-3 px-4 text-center">Period Status Toggle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {classStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-slate-400">
                        No students enrolled in this subject and section.
                      </td>
                    </tr>
                  ) : (
                    classStudents.map((s) => {
                      const currentStatus = attendanceRecords[s.roll_number] || 'Present';
                      return (
                        <tr key={s.roll_number} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            {s.roll_number}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                            {s.name}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`font-bold ${s.attendance_percentage < 75 ? 'text-rose-600' : 'text-forest-700'}`}>
                              {s.attendance_percentage || 85}%
                            </span>
                            {s.attendance_percentage < 75 && (
                              <span className="ml-1 text-[10px] text-rose-500 font-medium">(Short Attendance)</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setAttendanceRecords({ ...attendanceRecords, [s.roll_number]: 'Present' })
                                }
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                                  currentStatus === 'Present'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                                }`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setAttendanceRecords({ ...attendanceRecords, [s.roll_number]: 'Absent' })
                                }
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                                  currentStatus === 'Absent'
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                                }`}
                              >
                                Absent
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setAttendanceRecords({ ...attendanceRecords, [s.roll_number]: 'Extra' })
                                }
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                                  currentStatus === 'Extra'
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                                }`}
                                title="Extra lecture / Remedial participation (Neutral weight)"
                              >
                                Extra
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* TAB CONTENT: SESSIONAL MARKS ENTRY */}
      {activeTab === 'marks' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Continuous Internal Evaluation & Sessional Marks Entry
                </h3>
                <p className="text-xs text-slate-500">
                  Enter student marks for ST1 (Max 30), ST2 (Max 30), or PUT (Max 50)
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Subject</label>
                  <select
                    value={marksForm.subjectCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setMarksForm({ ...marksForm, subjectCode: code });
                      loadStudentsForMarks(code, marksForm.section, marksForm.examType);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white font-medium"
                  >
                    {allocations.map((a) => (
                      <option key={a.id} value={a.subject_code}>
                        {a.subject_code} - {a.subject_name.substring(0, 14)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Section</label>
                  <select
                    value={marksForm.section}
                    onChange={(e) => {
                      const sec = e.target.value;
                      setMarksForm({ ...marksForm, section: sec });
                      loadStudentsForMarks(marksForm.subjectCode, sec, marksForm.examType);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white font-medium"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Exam Type</label>
                  <select
                    value={marksForm.examType}
                    onChange={(e) => {
                      const exam = e.target.value;
                      setMarksForm({ ...marksForm, examType: exam });
                      loadStudentsForMarks(marksForm.subjectCode, marksForm.section, exam);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white font-bold text-earth-800"
                  >
                    <option value="ST1">Sessional 1 (Max 30)</option>
                    <option value="ST2">Sessional 2 (Max 30)</option>
                    <option value="PUT">PUT / Pre-Univ (Max 50)</option>
                  </select>
                </div>
              </div>

            </div>

            {marksMsg.text && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-start gap-2 ${
                  marksMsg.type === 'success'
                    ? 'bg-forest-50 text-forest-800 border border-forest-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {marksMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{marksMsg.text}</span>
              </div>
            )}

            <div className="overflow-x-auto mb-6">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Roll Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4 text-center">
                      Marks Obtained (Max: {marksForm.examType === 'PUT' ? 50 : 30})
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {marksStudents.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-10 text-slate-400">
                        No students found for this subject and section.
                      </td>
                    </tr>
                  ) : (
                    marksStudents.map((s) => (
                      <tr key={s.roll_number} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {s.roll_number}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {s.name}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="0"
                            max={marksForm.examType === 'PUT' ? 50 : 30}
                            value={marksInput[s.roll_number] ?? ''}
                            onChange={(e) =>
                              setMarksInput({ ...marksInput, [s.roll_number]: e.target.value })
                            }
                            placeholder={`0 to ${marksForm.examType === 'PUT' ? 50 : 30}`}
                            className="w-32 px-3 py-1.5 rounded-xl border border-slate-300 text-center font-bold text-sm text-slate-900 focus:ring-2 focus:ring-forest-600 outline-none"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveMarks}
                disabled={marksSaving || marksStudents.length === 0}
                className="py-2.5 px-6 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs shadow-md shadow-forest-800/20 transition flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{marksSaving ? 'Saving Marks...' : 'Save All Marks'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* TAB CONTENT: MENTOR LEAVE REVIEW (DUAL MENTOR WORKFLOW) */}
      {activeTab === 'leaves' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Class Mentor Leave Applications Review Desk
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Review and approve absence requests submitted by students in your assigned mentor section.
            </p>

            {reviewMsg.text && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-start gap-2 ${
                  reviewMsg.type === 'success'
                    ? 'bg-forest-50 text-forest-800 border border-forest-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {reviewMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{reviewMsg.text}</span>
              </div>
            )}

            <div className="space-y-4">
              {leavesToReview.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No pending leave applications from your mentee students!
                </div>
              ) : (
                leavesToReview.map((l) => (
                  <div key={l.id} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {l.student_name} ({l.student_roll_no})
                        </span>
                        <p className="text-xs text-slate-500">
                          Applied Dates: <span className="font-semibold text-slate-700 dark:text-slate-300">{l.from_date} to {l.to_date}</span>
                        </p>
                      </div>
                      <Badge variant="pending">Pending Your Review</Badge>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 mb-4">
                      <span className="font-bold text-slate-900 dark:text-white block mb-1">Reason:</span>
                      {l.reason}
                    </div>

                    {/* Mentor Remark Input & Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <input
                        type="text"
                        placeholder="Add mentor observation / remark (e.g. Verified with parent)..."
                        value={reviewRemarks[l.id] || ''}
                        onChange={(e) => setReviewRemarks({ ...reviewRemarks, [l.id]: e.target.value })}
                        className="w-full sm:flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-forest-600"
                      />
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleReviewLeave(l.id, 'Approved')}
                          className="flex-1 sm:flex-none py-2 px-4 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewLeave(l.id, 'Rejected')}
                          className="flex-1 sm:flex-none py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
