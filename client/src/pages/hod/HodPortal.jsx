import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import StatsCard from '../../components/StatsCard';
import Badge from '../../components/Badge';
import {
  ShieldAlert,
  Users,
  Award,
  AlertTriangle,
  BookOpen,
  CheckCircle,
  Clock,
  Check,
  Building,
  TrendingUp
} from 'lucide-react';

export default function HodPortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('feedback');
  const [loading, setLoading] = useState(true);

  const [department, setDepartment] = useState('');
  const [facultyList, setFacultyList] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [defaulters, setDefaulters] = useState([]);
  const [stats, setStats] = useState({ totalFaculty: 0, totalStudents: 0, pendingFeedback: 0 });

  const [hodNotes, setHodNotes] = useState({});
  const [actionMsg, setActionMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchHodData();
  }, []);

  const fetchHodData = async () => {
    try {
      setLoading(true);
      const [deptRes, feedbackRes, defaultersRes] = await Promise.all([
        api.get('/hod/department-overview'),
        api.get('/hod/feedback'),
        api.get('/hod/defaulters'),
      ]);

      setDepartment(deptRes.data.department || user?.profile?.department || 'Department');
      setFacultyList(deptRes.data.faculty || []);
      const fbs = feedbackRes.data.feedback || [];
      setFeedbackList(fbs);
      setDefaulters(defaultersRes.data.defaulters || []);

      setStats({
        totalFaculty: deptRes.data.faculty?.length || 0,
        totalStudents: deptRes.data.totalStudents || 120,
        pendingFeedback: fbs.filter((f) => f.status === 'Submitted').length,
      });
    } catch (err) {
      console.error('Error fetching HOD data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (feedbackId, status) => {
    setActionMsg({ type: '', text: '' });
    const note = hodNotes[feedbackId] || '';

    try {
      await api.patch(`/hod/feedback/${feedbackId}/status`, {
        status,
        notes: note,
      });

      setActionMsg({
        type: 'success',
        text: `Feedback #${feedbackId} marked as "${status}". Action recorded confidentially.`,
      });

      // Refresh feedback
      const res = await api.get('/hod/feedback');
      setFeedbackList(res.data.feedback || []);
    } catch (err) {
      setActionMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update feedback status.' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-terracotta-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">Loading HOD executive control center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* HOD Header Banner */}
      <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-terracotta-900 via-stone-900 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-terracotta-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Head of Department</span>
            <span>•</span>
            <span>{department}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Academic Governance - {user?.profile?.name}
          </h2>
          <p className="text-sm text-stone-200/80 mt-1 max-w-xl">
            Confidential student-faculty evaluations oversight, department attendance monitoring, and faculty workload management.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15">
          <div className="text-right">
            <p className="text-[11px] text-terracotta-200 uppercase font-semibold">Department</p>
            <p className="text-base font-extrabold text-white truncate max-w-[180px]">
              {department}
            </p>
          </div>
          <Building className="w-8 h-8 text-terracotta-300" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatsCard
          title="Department Faculty"
          value={`${stats.totalFaculty} Professors`}
          subtitle="Full-Time & Visiting"
          icon={Users}
          color="terracotta"
        />
        <StatsCard
          title="Confidential Feedback"
          value={`${feedbackList.length} Submissions`}
          subtitle={`${stats.pendingFeedback} Pending Action`}
          icon={ShieldAlert}
          color="forest"
        />
        <StatsCard
          title="Short Attendance"
          value={`${defaulters.length} Defaulters`}
          subtitle="Below 75% Threshold"
          icon={AlertTriangle}
          color="rose"
        />
        <StatsCard
          title="Department Compliance"
          value="98.2%"
          subtitle="Curriculum Completion"
          icon={TrendingUp}
          color="sage"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
        <button
          onClick={() => setActiveTab('feedback')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'feedback'
              ? 'bg-terracotta-700 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Confidential Faculty Feedback ({feedbackList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('defaulters')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'defaulters'
              ? 'bg-terracotta-700 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Short Attendance Defaulters ({defaulters.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('faculty')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'faculty'
              ? 'bg-terracotta-700 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Department Faculty Directory</span>
        </button>
      </div>

      {actionMsg.text && (
        <div
          className={`mb-6 p-4 rounded-2xl text-xs flex items-start gap-2.5 ${
            actionMsg.type === 'success'
              ? 'bg-forest-50 text-forest-800 border border-forest-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {actionMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* TAB: CONFIDENTIAL FACULTY FEEDBACK */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-terracotta-600" />
                  Confidential Faculty Feedback Center
                </h3>
                <p className="text-xs text-slate-500">
                  Strictly accessible to HOD {department}. Faculty cannot access these records.
                </p>
              </div>
              <Badge variant="terracotta">HOD Eyes Only</Badge>
            </div>

            <div className="space-y-4">
              {feedbackList.length === 0 ? (
                <p className="text-xs text-slate-400 py-12 text-center">
                  No confidential student feedback received yet for {department} faculty.
                </p>
              ) : (
                feedbackList.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          Evaluation for: {fb.faculty_name} ({fb.faculty_id})
                        </span>
                        <div className="text-[11px] text-slate-500">
                          From Student: <span className="font-mono font-semibold">{fb.student_roll_no}</span> • Submitted: {fb.submitted_on}
                        </div>
                      </div>
                      <Badge
                        variant={
                          fb.status === 'Action Taken'
                            ? 'present'
                            : fb.status === 'Reviewed'
                            ? 'earth'
                            : 'pending'
                        }
                      >
                        {fb.status}
                      </Badge>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 mb-4">
                      {fb.feedback_text}
                    </div>

                    {/* HOD Action and Notes */}
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <input
                        type="text"
                        placeholder="Confidential HOD Action note (e.g. Counseled faculty on pace)..."
                        value={hodNotes[fb.id] || ''}
                        onChange={(e) => setHodNotes({ ...hodNotes, [fb.id]: e.target.value })}
                        className="w-full sm:flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-terracotta-600"
                      />
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(fb.id, 'Reviewed')}
                          className="flex-1 sm:flex-none py-2 px-3.5 rounded-xl bg-earth-700 hover:bg-earth-800 text-white font-bold text-xs shadow-sm transition"
                        >
                          Mark Reviewed
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(fb.id, 'Action Taken')}
                          className="flex-1 sm:flex-none py-2 px-3.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs shadow-sm transition"
                        >
                          Action Taken ✓
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

      {/* TAB: SHORT ATTENDANCE DEFAULTERS */}
      {activeTab === 'defaulters' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Short Attendance Monitoring List (&lt; 75% Requirement)
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Official list of students at risk of detention under AKTU attendance guidelines
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Roll Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Sem & Section</th>
                    <th className="py-3 px-4">Attendance %</th>
                    <th className="py-3 px-4">Parent Mobile</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {defaulters.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-forest-700 font-semibold">
                        All department students meet the 75% attendance criterion!
                      </td>
                    </tr>
                  ) : (
                    defaulters.map((d) => (
                      <tr key={d.roll_number} className="hover:bg-rose-50/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{d.roll_number}</td>
                        <td className="py-3 px-4 font-semibold">{d.name}</td>
                        <td className="py-3 px-4">Sem {d.current_semester} - Sec {d.section}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-rose-600">{d.attendance_percentage}%</span>
                        </td>
                        <td className="py-3 px-4 font-mono">{d.father_mobile}</td>
                        <td className="py-3 px-4">
                          <Badge variant="danger">Critical Shortage</Badge>
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

      {/* TAB: DEPARTMENT FACULTY DIRECTORY */}
      {activeTab === 'faculty' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {facultyList.map((f) => (
            <div key={f.employee_id} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Badge variant={f.is_hod ? 'terracotta' : 'earth'}>
                  {f.is_hod ? 'Head of Department' : 'Faculty'}
                </Badge>
                <span className="font-mono text-[11px] text-slate-400">{f.employee_id}</span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">{f.name}</h4>
              <p className="text-xs text-slate-500">{f.designation}</p>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1 text-slate-600">
                <div>📧 {f.email}</div>
                <div>📞 {f.mobile}</div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
