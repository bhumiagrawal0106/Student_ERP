import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import StatsCard from '../../components/StatsCard';
import Badge from '../../components/Badge';
import {
  LayoutDashboard,
  CalendarCheck,
  GraduationCap,
  FileText,
  MessageSquareHeart,
  Download,
  Wrench,
  User,
  BookOpen,
  Send,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Clock,
  Printer,
  ShieldAlert,
  Users,
  Building,
  Info
} from 'lucide-react';

export default function StudentPortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Data states
  const [profile, setProfile] = useState(null);
  const [mentors, setMentors] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [marksData, setMarksData] = useState([]);
  const [selectedSem, setSelectedSem] = useState(5);
  const [leaves, setLeaves] = useState([]);
  const [pyqs, setPyqs] = useState([]);
  const [resources, setResources] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [notices, setNotices] = useState([]);
  const [facultyList, setFacultyList] = useState([]);

  // Form states
  const [leaveForm, setLeaveForm] = useState({
    fromDate: '',
    toDate: '',
    reason: '',
    file: null,
  });
  const [leaveMsg, setLeaveMsg] = useState({ type: '', text: '' });

  const [feedbackForm, setFeedbackForm] = useState({
    facultyId: '',
    rating: 5,
    feedbackText: '',
  });
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  const [complaintForm, setComplaintForm] = useState({
    location: '',
    category: 'Fan',
    description: '',
  });
  const [complaintMsg, setComplaintMsg] = useState({ type: '', text: '' });

  // Filters
  const [pyqSemFilter, setPyqSemFilter] = useState('');
  const [pyqTypeFilter, setPyqTypeFilter] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [
        profRes,
        mentorsRes,
        attSumRes,
        attLogsRes,
        marksRes,
        leavesRes,
        pyqsRes,
        resRes,
        compRes,
        notRes,
        facRes
      ] = await Promise.all([
        api.get('/student/profile'),
        api.get('/student/mentors'),
        api.get('/student/attendance-summary'),
        api.get('/student/attendance-logs'),
        api.get('/student/marks'),
        api.get('/student/leaves'),
        api.get('/common/pyqs'),
        api.get('/common/resources'),
        api.get('/student/complaints'),
        api.get('/common/notices'),
        api.get('/student/faculty-list'),
      ]);

      setProfile(profRes.data.profile);
      if (profRes.data.profile?.current_semester) {
        setSelectedSem(profRes.data.profile.current_semester);
      }
      setMentors(mentorsRes.data.mentors || []);
      setAttendanceSummary(attSumRes.data);
      setAttendanceLogs(attLogsRes.data.logs || []);
      setMarksData(marksRes.data.marks || []);
      setLeaves(leavesRes.data.leaves || []);
      setPyqs(pyqsRes.data.papers || []);
      setResources(resRes.data.resources || []);
      setComplaints(compRes.data.complaints || []);
      setNotices(notRes.data.notices || []);
      setFacultyList(facRes.data.faculty || []);
    } catch (err) {
      console.error('Error fetching student data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Leave submission
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setLeaveMsg({ type: '', text: '' });
    if (!leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason.trim()) {
      setLeaveMsg({ type: 'error', text: 'Please enter valid dates and a reason for leave.' });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('fromDate', leaveForm.fromDate);
      formData.append('toDate', leaveForm.toDate);
      formData.append('reason', leaveForm.reason);
      if (leaveForm.file) {
        formData.append('proof', leaveForm.file);
      }

      await api.post('/student/leaves', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setLeaveMsg({ type: 'success', text: 'Leave application submitted successfully! Sent to your Dual Mentors for review.' });
      setLeaveForm({ fromDate: '', toDate: '', reason: '', file: null });
      // Refresh leaves
      const res = await api.get('/student/leaves');
      setLeaves(res.data.leaves || []);
    } catch (err) {
      setLeaveMsg({ type: 'error', text: err.response?.data?.message || 'Failed to submit leave.' });
    }
  };

  // Feedback submission
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFeedbackMsg({ type: '', text: '' });
    if (!feedbackForm.facultyId || !feedbackForm.feedbackText.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Please select a faculty member and write feedback.' });
      return;
    }

    try {
      await api.post('/student/feedback', {
        facultyId: feedbackForm.facultyId,
        feedbackText: `[Rating: ${feedbackForm.rating}/5] ${feedbackForm.feedbackText}`,
      });
      setFeedbackMsg({
        type: 'success',
        text: 'Feedback securely submitted! It has been forwarded directly to the HOD and will remain completely confidential from faculty.',
      });
      setFeedbackForm({ facultyId: '', rating: 5, feedbackText: '' });
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Failed to submit feedback.' });
    }
  };

  // Complaint submission
  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    setComplaintMsg({ type: '', text: '' });
    if (!complaintForm.location || !complaintForm.description.trim()) {
      setComplaintMsg({ type: 'error', text: 'Please provide classroom location and problem description.' });
      return;
    }

    try {
      await api.post('/student/complaints', complaintForm);
      setComplaintMsg({ type: 'success', text: 'Classroom repair request logged! Maintenance team has been notified.' });
      setComplaintForm({ location: '', category: 'Fan', description: '' });
      const res = await api.get('/student/complaints');
      setComplaints(res.data.complaints || []);
    } catch (err) {
      setComplaintMsg({ type: 'error', text: err.response?.data?.message || 'Failed to submit complaint.' });
    }
  };

  // Calculate SGPA for selected semester
  const currentSemMarks = marksData.filter((m) => Number(m.semester) === Number(selectedSem));
  const semAggregate = currentSemMarks.length > 0
    ? (currentSemMarks.reduce((acc, m) => acc + (m.marks_obtained / m.max_marks) * 100, 0) / currentSemMarks.length).toFixed(1)
    : 'N/A';

  const navTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance Log', icon: CalendarCheck },
    { id: 'academics', label: 'Academic Records', icon: GraduationCap },
    { id: 'leaves', label: 'Leave Desk', icon: FileText },
    { id: 'feedback', label: 'Confidential Feedback', icon: MessageSquareHeart },
    { id: 'pyqs', label: 'University PYQs', icon: Download },
    { id: 'complaints', label: 'Maintenance Desk', icon: Wrench },
    { id: 'profile', label: 'Profile & ID Card', icon: User },
    { id: 'resources', label: 'Important Links', icon: BookOpen },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-forest-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">Loading your student portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Student Welcome Banner */}
      <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-forest-800 via-forest-900 to-slate-900 text-white shadow-xl shadow-forest-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-forest-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Roll No: {profile?.roll_number}</span>
            <span>•</span>
            <span>{profile?.course} {profile?.branch}</span>
            <span>•</span>
            <span>Semester {profile?.current_semester} (Sec {profile?.section})</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {profile?.name}!
          </h2>
          <p className="text-sm text-forest-100/80 mt-1 max-w-xl">
            Check your attendance, review all 8 semesters marks, submit leaves to your dual class mentors, and access official university question papers.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15">
          <div className="text-right">
            <p className="text-[11px] text-forest-200 uppercase font-semibold">Attendance Status</p>
            <p className="text-xl font-extrabold text-white">
              {attendanceSummary?.overallPercentage || '0'}%
            </p>
          </div>
          <div className={`w-3.5 h-3.5 rounded-full ${
            (attendanceSummary?.overallPercentage || 0) >= 75 ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'
          }`} />
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
                  ? 'bg-forest-700 text-white shadow-md shadow-forest-800/25'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-forest-50 hover:text-forest-800 border border-slate-200 dark:border-slate-700'
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
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatsCard
              title="Overall Attendance"
              value={`${attendanceSummary?.overallPercentage || 0}%`}
              subtitle={`${attendanceSummary?.presentCount || 0} Present / ${attendanceSummary?.totalConducted || 0} Periods`}
              icon={CalendarCheck}
              color="forest"
              trend={{
                text: (attendanceSummary?.overallPercentage || 0) >= 75 ? 'Eligibility Met (>= 75%)' : 'Short Attendance Alert',
                positive: (attendanceSummary?.overallPercentage || 0) >= 75,
              }}
            />
            <StatsCard
              title="Current Sem Aggregate"
              value={semAggregate !== 'N/A' ? `${semAggregate}%` : 'Sem In-Progress'}
              subtitle={`Semester ${profile?.current_semester} Mid-Terms / PUT`}
              icon={GraduationCap}
              color="terracotta"
            />
            <StatsCard
              title="Assigned Mentors"
              value={mentors.length > 0 ? `${mentors.length} Class Mentors` : 'Pending'}
              subtitle="Dual Mentor Support (M/F)"
              icon={Users}
              color="earth"
            />
            <StatsCard
              title="Hostel / Residence"
              value={profile?.hostel_type || 'Day Scholar'}
              subtitle={profile?.hostel_name_room || 'Local Transport'}
              icon={Building}
              color="sage"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left 2 Cols: Recent Attendance & Mentors */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Dual Class Mentors Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-forest-700" />
                      Assigned Class Mentors (Dual Mentors)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Your designated points of contact for academic mentorship and leave approvals
                    </p>
                  </div>
                  <Badge variant="earth">Sec {profile?.section}</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mentors.length === 0 ? (
                    <p className="text-xs text-slate-500 col-span-2">Mentors not yet assigned for this section.</p>
                  ) : (
                    mentors.map((m, idx) => (
                      <div
                        key={m.employee_id}
                        className="p-4 rounded-2xl bg-earth-50/50 dark:bg-earth-950/20 border border-earth-200/60 dark:border-earth-800"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold tracking-wider uppercase text-earth-800 dark:text-earth-300">
                            {idx === 0 ? 'Primary Mentor' : 'Secondary Mentor'}
                          </span>
                          <Badge variant={m.gender === 'Female' ? 'terracotta' : 'forest'} className="!text-[10px]">
                            {m.gender}
                          </Badge>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{m.name}</h4>
                        <p className="text-xs text-slate-500">{m.designation}</p>
                        <div className="mt-3 text-xs space-y-1 text-slate-600 dark:text-slate-400">
                          <div>📧 {m.email}</div>
                          <div>📞 {m.mobile}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Attendance Breakdown */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Subject-Wise Attendance Breakdown
                    </h3>
                    <p className="text-xs text-slate-500">8 Periods Daily • AKTU Compliance Track</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('attendance')}
                    className="text-xs font-semibold text-forest-700 hover:text-forest-800"
                  >
                    View 8-Period Log →
                  </button>
                </div>

                <div className="space-y-4">
                  {(attendanceSummary?.subjectBreakdown || []).length === 0 ? (
                    <p className="text-xs text-slate-500">No attendance records logged yet.</p>
                  ) : (
                    attendanceSummary.subjectBreakdown.map((sb) => {
                      const pct = sb.percentage;
                      return (
                        <div key={sb.subject_code} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 dark:text-white">
                              {sb.subject_name} ({sb.subject_code})
                            </span>
                            <span className={`font-bold ${pct >= 75 ? 'text-forest-700' : 'text-rose-600'}`}>
                              {pct}% ({sb.present}/{sb.total})
                            </span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                pct >= 75 ? 'bg-forest-600' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* Right Col: Announcements & Quick Links */}
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-forest-700" />
                  Official Notices & Circulars
                </h3>
                <div className="space-y-3">
                  {notices.slice(0, 4).map((n) => (
                    <div key={n.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-bold text-forest-700">{n.category}</span>
                        <span>{n.posted_date}</span>
                      </div>
                      <p className="font-semibold text-slate-800 dark:text-white">{n.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{n.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="p-6 rounded-3xl bg-earth-50 dark:bg-earth-950/40 border border-earth-200 dark:border-earth-800 shadow-sm">
                <h4 className="text-sm font-bold text-earth-900 dark:text-earth-200 mb-2">Student Fast Actions</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab('leaves')}
                    className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium text-xs border border-earth-200 hover:border-forest-600 transition flex items-center justify-between"
                  >
                    <span>Apply for Medical / Leave</span>
                    <span>→</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('pyqs')}
                    className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium text-xs border border-earth-200 hover:border-forest-600 transition flex items-center justify-between"
                  >
                    <span>Download AKTU PYQs</span>
                    <span>→</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('complaints')}
                    className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium text-xs border border-earth-200 hover:border-forest-600 transition flex items-center justify-between"
                  >
                    <span>Classroom Maintenance Desk</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* TAB CONTENT: ATTENDANCE LOG */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Comprehensive 8-Period Attendance Log
                </h3>
                <p className="text-xs text-slate-500">
                  Daily period-by-period record covering all 8 lecture slots per timetable
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="present">Present</Badge>
                <Badge variant="absent">Absent</Badge>
                <Badge variant="extra">Extra (Neutral / Bonus)</Badge>
              </div>
            </div>

            {/* Extra Attendance Rule Callout */}
            <div className="mb-6 p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-purple-600" />
              <div>
                <span className="font-bold">System Attendance Rule:</span> Classes marked with status <span className="font-semibold text-purple-700 dark:text-purple-300">"Extra"</span> are recorded for special participation, seminars, or remedial sessions. They carry neutral weight in the denominator so students are never penalized.
              </div>
            </div>

            {/* Attendance Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Faculty</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attendanceLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        No attendance entries found.
                      </td>
                    </tr>
                  ) : (
                    attendanceLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                          {log.date}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">
                          Period {log.period_number}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{log.subject_name}</div>
                          <div className="text-[10px] text-slate-400">{log.subject_code}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {log.faculty_name || 'Department Faculty'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              log.status === 'Present'
                                ? 'present'
                                : log.status === 'Absent'
                                ? 'absent'
                                : 'extra'
                            }
                          >
                            {log.status}
                          </Badge>
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

      {/* TAB CONTENT: ACADEMIC RECORDS (8 SEMESTERS) */}
      {activeTab === 'academics' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  University Sessional Marks & Performance (Semesters 1 – 8)
                </h3>
                <p className="text-xs text-slate-500">
                  Continuous Internal Evaluation (ST1, ST2, PUT / Pre-University Test)
                </p>
              </div>

              {/* Semester Switcher Tabs (1-8) */}
              <div className="flex items-center gap-1.5 overflow-x-auto p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <button
                    key={sem}
                    onClick={() => setSelectedSem(sem)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedSem === sem
                        ? 'bg-forest-700 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-forest-700'
                    }`}
                  >
                    Sem {sem}
                  </button>
                ))}
              </div>
            </div>

            {/* Marks Table for selected semester */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Subject Code & Name</th>
                    <th className="py-3 px-4 text-center">ST-1 (Max 30)</th>
                    <th className="py-3 px-4 text-center">ST-2 (Max 30)</th>
                    <th className="py-3 px-4 text-center">PUT / Pre-Univ (Max 50)</th>
                    <th className="py-3 px-4 text-center">Total Score</th>
                    <th className="py-3 px-4 text-center">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentSemMarks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        No sessional marks declared yet for Semester {selectedSem}.
                      </td>
                    </tr>
                  ) : (
                    currentSemMarks.map((sub) => {
                      const totalObtained = (sub.st1 || 0) + (sub.st2 || 0) + (sub.put || 0);
                      const totalMax = (sub.st1 ? 30 : 0) + (sub.st2 ? 30 : 0) + (sub.put ? 50 : 0) || 110;
                      const pct = Math.round((totalObtained / totalMax) * 100);
                      return (
                        <tr key={sub.code} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                            <div>{sub.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{sub.code} • {sub.credits} Credits</div>
                          </td>
                          <td className="py-3 px-4 text-center font-medium">
                            {sub.st1 !== undefined && sub.st1 !== null ? `${sub.st1} / 30` : '-'}
                          </td>
                          <td className="py-3 px-4 text-center font-medium">
                            {sub.st2 !== undefined && sub.st2 !== null ? `${sub.st2} / 30` : '-'}
                          </td>
                          <td className="py-3 px-4 text-center font-medium">
                            {sub.put !== undefined && sub.put !== null ? `${sub.put} / 50` : '-'}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">
                            {totalObtained} / {totalMax}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={pct >= 75 ? 'present' : pct >= 60 ? 'earth' : 'danger'}>
                              {pct}%
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {currentSemMarks.length > 0 && (
              <div className="mt-6 p-4 rounded-2xl bg-earth-50 dark:bg-earth-950/30 border border-earth-200 dark:border-earth-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-earth-900 dark:text-earth-200">
                  Semester {selectedSem} Overall Internal Aggregate:
                </span>
                <span className="font-bold text-base text-forest-700 dark:text-forest-400">
                  {semAggregate}%
                </span>
              </div>
            )}

          </div>
        </div>
      )}

      {/* TAB CONTENT: LEAVE DESK (DUAL MENTOR WORKFLOW) */}
      {activeTab === 'leaves' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Apply Leave Form */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Apply for Leave
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Dual-Mentor approval required. Upload medical proof if applicable.
            </p>

            {leaveMsg.text && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-start gap-2 ${
                  leaveMsg.type === 'success'
                    ? 'bg-forest-50 text-forest-800 border border-forest-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {leaveMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{leaveMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={leaveForm.fromDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-forest-600 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={leaveForm.toDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-forest-600 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Absence
                </label>
                <textarea
                  rows={3}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="Explain medical emergency, family event, or official college representation..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-forest-600 outline-none resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Medical Proof / Document (Optional, PDF or Image)
                </label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setLeaveForm({ ...leaveForm, file: e.target.files[0] })}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-forest-50 file:text-forest-700 hover:file:bg-forest-100"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-semibold text-xs shadow-md shadow-forest-800/20 transition flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                Submit to Dual Mentors
              </button>
            </form>
          </div>

          {/* Past Leaves & Status */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Leave Application Status & History
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Real-time dual-mentor review status. Both assigned mentors review your application.
            </p>

            <div className="space-y-3">
              {leaves.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No leave applications submitted yet.</p>
              ) : (
                leaves.map((l) => (
                  <div key={l.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {l.from_date} to {l.to_date}
                      </div>
                      <Badge
                        variant={
                          l.status === 'Approved'
                            ? 'present'
                            : l.status === 'Rejected'
                            ? 'danger'
                            : 'pending'
                        }
                      >
                        {l.status}
                      </Badge>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mb-3">{l.reason}</p>
                    
                    {/* Dual Mentor Review Breakdown */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px]">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="font-bold block text-slate-700 dark:text-slate-300">Mentor 1:</span>
                        <span className={`font-semibold ${l.mentor1_status === 'Approved' ? 'text-forest-700' : 'text-amber-700'}`}>
                          {l.mentor1_status || 'Pending'}
                        </span>
                        {l.mentor1_remark && <p className="text-slate-500 text-[10px] mt-0.5">"{l.mentor1_remark}"</p>}
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="font-bold block text-slate-700 dark:text-slate-300">Mentor 2:</span>
                        <span className={`font-semibold ${l.mentor2_status === 'Approved' ? 'text-forest-700' : 'text-amber-700'}`}>
                          {l.mentor2_status || 'Pending'}
                        </span>
                        {l.mentor2_remark && <p className="text-slate-500 text-[10px] mt-0.5">"{l.mentor2_remark}"</p>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: CONFIDENTIAL FACULTY FEEDBACK */}
      {activeTab === 'feedback' && (
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* Privacy Security Alert */}
          <div className="p-5 rounded-3xl bg-forest-900 text-forest-100 shadow-lg flex items-start gap-4">
            <ShieldAlert className="w-8 h-8 text-forest-300 shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-sm text-white">Strict Student Confidentiality Guaranteed</h4>
              <p className="text-xs text-forest-200/90 mt-1">
                Your feedback is <span className="underline font-semibold text-white">strictly routed only to the HOD (Head of Department)</span> and Super Admin. Faculty members have zero API or database access to this information. Feel free to provide genuine, constructive evaluation to improve teaching quality.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Submit Faculty Evaluation
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Select department professor and share your teaching-learning experience
            </p>

            {feedbackMsg.text && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-start gap-2 ${
                  feedbackMsg.type === 'success'
                    ? 'bg-forest-50 text-forest-800 border border-forest-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {feedbackMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Faculty Member
                </label>
                <select
                  value={feedbackForm.facultyId}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, facultyId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-forest-600 outline-none"
                  required
                >
                  <option value="">-- Choose Faculty --</option>
                  {facultyList.map((f) => (
                    <option key={f.employee_id} value={f.employee_id}>
                      {f.name} ({f.designation} - {f.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Overall Teaching & Explanation Rating
                </label>
                <div className="flex items-center gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                      className={`w-10 h-10 rounded-xl font-bold text-xs transition ${
                        feedbackForm.rating >= star
                          ? 'bg-amber-400 text-slate-900 shadow-sm'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      ★ {star}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Constructive Feedback (Syllabus coverage, speed, clarity, doubt resolution)
                </label>
                <textarea
                  rows={4}
                  value={feedbackForm.feedbackText}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, feedbackText: e.target.value })}
                  placeholder="Share details on course pace, lab sessions, practical examples, or suggestions..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-forest-600 outline-none resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-semibold text-xs shadow-md shadow-forest-800/20 transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Submit Confidential Feedback to HOD
              </button>
            </form>
          </div>

        </div>
      )}

      {/* TAB CONTENT: UNIVERSITY PYQS */}
      {activeTab === 'pyqs' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  AKTU 5-Year Previous Question Papers & Current Sets
                </h3>
                <p className="text-xs text-slate-500">
                  Verified semester exam question papers repository for exam preparation
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={pyqSemFilter}
                  onChange={(e) => setPyqSemFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="">All Semesters</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>

                <select
                  value={pyqTypeFilter}
                  onChange={(e) => setPyqTypeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="">All Types</option>
                  <option value="PYQ">PYQ (Past Year)</option>
                  <option value="Current Set">Current Set / Model</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pyqs
                .filter((p) => !pyqSemFilter || String(p.semester) === String(pyqSemFilter))
                .filter((p) => !pyqTypeFilter || p.exam_type === pyqTypeFilter)
                .map((paper) => (
                  <div
                    key={paper.id}
                    className="p-4 rounded-2xl bg-earth-50/60 dark:bg-slate-800 border border-earth-200/80 dark:border-slate-700 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                        <span className="font-bold text-forest-700">{paper.year} Examination</span>
                        <Badge variant="earth">{paper.exam_type}</Badge>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{paper.title}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {paper.subject_name} ({paper.subject_code})
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Sem {paper.semester} • {paper.branch}
                      </p>
                    </div>

                    <a
                      href={paper.file_path || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-semibold text-xs shadow-sm transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Question Paper (PDF)
                    </a>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: MAINTENANCE DESK */}
      {activeTab === 'complaints' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Complaint Submission Form */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Classroom Maintenance Request
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Report issues in lecture halls, laboratories, or seminar halls.
            </p>

            {complaintMsg.text && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-start gap-2 ${
                  complaintMsg.type === 'success'
                    ? 'bg-forest-50 text-forest-800 border border-forest-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {complaintMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{complaintMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleComplaintSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Location (Classroom / Lab Number)
                </label>
                <input
                  type="text"
                  value={complaintForm.location}
                  onChange={(e) => setComplaintForm({ ...complaintForm, location: e.target.value })}
                  placeholder="e.g. Room 304, CSE Block 2nd Floor"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-forest-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Issue Category
                </label>
                <select
                  value={complaintForm.category}
                  onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-forest-600 outline-none"
                >
                  <option value="Fan">Ceiling Fan Not Working</option>
                  <option value="AC">Air Conditioner (AC) Malfunction</option>
                  <option value="Chair">Broken Bench / Chair</option>
                  <option value="Furniture">Podium / Whiteboard Repair</option>
                  <option value="Electrical">Switchboard / Projector Power</option>
                  <option value="Other">Other Maintenance Work</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Description of Issue
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {complaintForm.description.trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={complaintForm.description}
                  onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                  placeholder="Describe the exact fault, noise, or electrical spark so technicians can bring correct equipment..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-forest-600 outline-none resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-semibold text-xs shadow-md shadow-forest-800/20 transition flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                Notify Maintenance Team
              </button>
            </form>
          </div>

          {/* Past Complaints List */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              My Logged Complaints & Status Tracker
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Real-time updates as maintenance team inspects and resolves repairs
            </p>

            <div className="space-y-3">
              {complaints.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No maintenance complaints registered.</p>
              ) : (
                complaints.map((c) => (
                  <div key={c.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Wrench className="w-3.5 h-3.5 text-slate-500" />
                        {c.category} • {c.location}
                      </div>
                      <Badge
                        variant={
                          c.status === 'Resolved'
                            ? 'present'
                            : c.status === 'In Progress'
                            ? 'warning'
                            : 'pending'
                        }
                      >
                        {c.status}
                      </Badge>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mb-2">{c.description}</p>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span>Submitted on: {c.submitted_on}</span>
                      {c.resolution_notes && (
                        <span className="text-forest-700 font-medium">Notes: {c.resolution_notes}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: PROFILE & DIGITAL ID CARD */}
      {activeTab === 'profile' && (
        <div className="space-y-8">
          
          {/* Printable Digital ID Card */}
          <div className="max-w-md mx-auto p-6 rounded-3xl bg-white border border-slate-300 shadow-2xl relative overflow-hidden print:m-0 print:border-none">
            {/* Header band */}
            <div className="absolute top-0 inset-x-0 h-3 bg-gradient-to-r from-forest-700 via-forest-800 to-slate-900" />
            
            <div className="text-center pt-2 pb-4 border-b border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">
                APJ ABDUL KALAM COLLEGE OF TECH
              </h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                Official Student Identity Card • Session 2025–2026
              </p>
            </div>

            <div className="flex items-center gap-4 py-5">
              <div className="w-20 h-24 rounded-2xl bg-forest-100 text-forest-800 flex items-center justify-center font-bold text-xl border border-forest-300 shadow-sm shrink-0">
                {profile?.name ? profile.name[0] : 'S'}
              </div>
              <div className="text-xs space-y-1">
                <h4 className="font-bold text-base text-slate-900">{profile?.name}</h4>
                <p className="text-slate-600 font-semibold">{profile?.course} - {profile?.branch}</p>
                <p className="text-slate-500">Roll No: <span className="font-mono font-bold text-slate-800">{profile?.roll_number}</span></p>
                <p className="text-slate-500">ERP ID: <span className="font-mono">{profile?.erp_id}</span></p>
                <p className="text-slate-500">Sec {profile?.section} • Sem {profile?.current_semester}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between">
              <span>Emergency: {profile?.father_mobile || profile?.mobile_number}</span>
              <span className="font-semibold text-forest-800">Status: {profile?.status || 'Active'}</span>
            </div>

            <div className="mt-4 pt-3 text-center border-t border-dashed border-slate-200">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1 text-xs font-bold text-forest-700 hover:text-forest-800"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Save ID Card & Bonafide
              </button>
            </div>
          </div>

          {/* Full Biodata Breakdown */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Complete Official Student Biodata & Records
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              
              {/* Personal */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] text-forest-700">
                  Personal Details
                </h4>
                <div><span className="text-slate-500">Full Name:</span> <span className="font-semibold">{profile?.name}</span></div>
                <div><span className="text-slate-500">DOB:</span> <span>{profile?.dob || '15-08-2003'}</span></div>
                <div><span className="text-slate-500">Gender:</span> <span>{profile?.gender || 'Male'}</span></div>
                <div><span className="text-slate-500">Aadhaar:</span> <span>{profile?.aadhaar_number || '•••• •••• 9812'}</span></div>
                <div><span className="text-slate-500">Category:</span> <span>{profile?.category || 'General'}</span></div>
                <div><span className="text-slate-500">Mobile:</span> <span>{profile?.mobile_number}</span></div>
                <div><span className="text-slate-500">College Email:</span> <span>{profile?.college_email}</span></div>
                <div><span className="text-slate-500">Personal Email:</span> <span>{profile?.personal_email}</span></div>
              </div>

              {/* Parents & Guardians */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] text-forest-700">
                  Parent & Guardian Details
                </h4>
                <div><span className="text-slate-500">Father's Name:</span> <span className="font-semibold">{profile?.father_name}</span></div>
                <div><span className="text-slate-500">Father's Phone:</span> <span>{profile?.father_mobile}</span></div>
                <div><span className="text-slate-500">Mother's Name:</span> <span>{profile?.mother_name}</span></div>
                <div><span className="text-slate-500">Guardian Name:</span> <span>{profile?.guardian_name || 'N/A'}</span></div>
                <div><span className="text-slate-500">Permanent Address:</span> <span>{profile?.permanent_address}</span></div>
                <div><span className="text-slate-500">Correspondence:</span> <span>{profile?.correspondence_address}</span></div>
              </div>

              {/* Academic & Hostel */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] text-forest-700">
                  Academic & Campus Stay
                </h4>
                <div><span className="text-slate-500">Course & Branch:</span> <span className="font-semibold">{profile?.course} - {profile?.branch}</span></div>
                <div><span className="text-slate-500">Semester & Sec:</span> <span>Sem {profile?.current_semester}, Sec {profile?.section}</span></div>
                <div><span className="text-slate-500">Registration Date:</span> <span>{profile?.registration_date}</span></div>
                <div><span className="text-slate-500">Hostel / Day Scholar:</span> <span>{profile?.hostel_type}</span></div>
                <div><span className="text-slate-500">Room / Transport:</span> <span>{profile?.hostel_name_room || 'Day Scholar Route 4'}</span></div>
                <div><span className="text-slate-500">Academic Status:</span> <Badge variant="present">{profile?.status || 'Active'}</Badge></div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: IMPORTANT RESOURCES & LINKS */}
      {activeTab === 'resources' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              College Resources, Circulars & AICTE Documents
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Download official calendars, strategic development plans, magazines, and emergency helplines
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((res) => (
                <div
                  key={res.id}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between"
                >
                  <div>
                    <Badge variant="earth" className="mb-2">{res.category}</Badge>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{res.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{res.description}</p>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <a
                      href={res.file_path || res.link_url || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest-700 hover:text-forest-800"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Official Document
                    </a>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
