import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import StatsCard from '../../components/StatsCard';
import Badge from '../../components/Badge';
import {
  Wrench,
  CheckCircle,
  Clock,
  AlertCircle,
  Building,
  Filter,
  Check
} from 'lucide-react';

export default function MaintenancePortal() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [notes, setNotes] = useState({});
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await api.get('/common/maintenance-desk');
      setComplaints(res.data.complaints || []);
    } catch (err) {
      console.error('Error fetching maintenance tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    setMsg({ type: '', text: '' });
    const note = notes[id] || '';

    try {
      await api.patch(`/common/maintenance-desk/${id}`, {
        status,
        resolutionNotes: note,
      });

      setMsg({
        type: 'success',
        text: `Ticket #${id} successfully marked as "${status}".`,
      });

      fetchComplaints();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update ticket.' });
    }
  };

  const filtered = complaints.filter((c) => !statusFilter || c.status === statusFilter);

  const openCount = complaints.filter((c) => c.status === 'Open').length;
  const inProgressCount = complaints.filter((c) => c.status === 'In Progress').length;
  const resolvedCount = complaints.filter((c) => c.status === 'Resolved').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">Loading campus maintenance tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Maintenance Header */}
      <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-amber-900 via-stone-900 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-amber-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Facilities & Infrastructure Management</span>
            <span>•</span>
            <span>Campus Maintenance Desk</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Classroom Hardware & Electrical Repair Desk
          </h2>
          <p className="text-sm text-amber-100/80 mt-1 max-w-xl">
            Real-time queue of student-reported lecture hall faults: fans, air conditioning, projector power, benches, and lighting.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15">
          <div className="text-right">
            <p className="text-[11px] text-amber-200 uppercase font-semibold">Active Work Orders</p>
            <p className="text-2xl font-extrabold text-white">
              {openCount + inProgressCount}
            </p>
          </div>
          <Wrench className="w-8 h-8 text-amber-300" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <StatsCard
          title="New Open Requests"
          value={openCount}
          subtitle="Awaiting Inspection"
          icon={AlertCircle}
          color="rose"
        />
        <StatsCard
          title="In-Progress Repairs"
          value={inProgressCount}
          subtitle="Technicians Dispatched"
          icon={Clock}
          color="terracotta"
        />
        <StatsCard
          title="Resolved Tickets"
          value={resolvedCount}
          subtitle="Fixed & Verified"
          icon={CheckCircle}
          color="forest"
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
          <span>{msg.text}</span>
        </div>
      )}

      {/* Tickets List */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Repair Request Queue ({filtered.length})
            </h3>
            <p className="text-xs text-slate-500">
              Update status and submit completion notes for student visibility
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white font-medium"
            >
              <option value="">All Tickets</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-400 py-12 text-center">
              No tickets matching the selected filter.
            </p>
          ) : (
            filtered.map((t) => (
              <div
                key={t.id}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {t.category} • Location: {t.location}
                    </span>
                    <div className="text-[11px] text-slate-500">
                      Reported by Roll No: <span className="font-mono font-semibold">{t.student_roll_no}</span> • {t.submitted_on}
                    </div>
                  </div>
                  <Badge
                    variant={
                      t.status === 'Resolved'
                        ? 'present'
                        : t.status === 'In Progress'
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {t.status}
                  </Badge>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 mb-4">
                  {t.description}
                </div>

                {/* Status Update Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <input
                    type="text"
                    placeholder="Resolution notes (e.g. Capacitor replaced, tested OK)..."
                    value={notes[t.id] || t.resolution_notes || ''}
                    onChange={(e) => setNotes({ ...notes, [t.id]: e.target.value })}
                    className="w-full sm:flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-amber-600"
                  />
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(t.id, 'In Progress')}
                      className="flex-1 sm:flex-none py-2 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition"
                    >
                      In Progress
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(t.id, 'Resolved')}
                      className="flex-1 sm:flex-none py-2 px-3.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Resolved
                    </button>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>

      </div>

    </div>
  );
}
