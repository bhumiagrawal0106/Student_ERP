import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/auth/LoginPage';
import StudentPortal from './pages/student/StudentPortal';
import FacultyPortal from './pages/faculty/FacultyPortal';
import HodPortal from './pages/hod/HodPortal';
import AdminPortal from './pages/admin/AdminPortal';
import MaintenancePortal from './pages/maintenance/MaintenancePortal';
import Navbar from './components/Navbar';
import ChangePasswordModal from './components/ChangePasswordModal';

function MainApp() {
  const { isAuthenticated, loading, role, mustChangePassword } = useAuth();
  const [manualPasswordModal, setManualPasswordModal] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faf8]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-forest-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Initializing Academic ERP...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf8] text-slate-800">
      
      {/* Top Navigation */}
      <Navbar onOpenPasswordModal={() => setManualPasswordModal(true)} />

      {/* Mandatory / Optional Password Change Modal */}
      <ChangePasswordModal
        isOpen={mustChangePassword || manualPasswordModal}
        forced={mustChangePassword}
        onClose={() => setManualPasswordModal(false)}
      />

      {/* Main Role-Based Workspaces */}
      <main className="flex-1">
        {role === 'student' && <StudentPortal />}
        {role === 'faculty' && <FacultyPortal />}
        {role === 'hod' && <HodPortal />}
        {role === 'admin' && <AdminPortal />}
        {role === 'maintenance' && <MaintenancePortal />}
      </main>

      {/* College Institutional Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-1">
          <p className="font-semibold text-slate-700">
            APJ Abdul Kalam College of Technology & Engineering • Academic Session 2025–2026
          </p>
          <p>
            Affiliated to Dr. A.P.J. Abdul Kalam Technical University (AKTU) • AICTE Approved
          </p>
          <p className="text-[11px] text-slate-400">
            Automated Period Attendance (1–8) • Dual Mentorship Governance • Confidential HOD Feedback Framework
          </p>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
