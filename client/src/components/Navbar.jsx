import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import Badge from './Badge';
import { 
  GraduationCap, 
  Bell, 
  User, 
  LogOut, 
  KeyRound, 
  Layers, 
  Check, 
  ExternalLink,
  ChevronDown
} from 'lucide-react';

export default function Navbar({ onOpenPasswordModal }) {
  const { user, role, logout, login } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [role]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/common/notices?limit=5');
      setNotifications(res.data.notices || []);
    } catch (err) {
      console.warn('Could not load notices for navbar:', err.message);
    }
  };

  const demoAccounts = [
    { role: 'Student (Sem 5)', label: 'Aman Singh', username: '210097010001', pass: 'AMAN SINGH4321', desc: 'B.Tech CSE Sem 5' },
    { role: 'Faculty / Mentor 1', label: 'Prof. Vikram Malhotra', username: 'FAC101', pass: 'FAC101@123', desc: 'Associate Prof & Mentor' },
    { role: 'Faculty / Mentor 2', label: 'Dr. Ananya Iyer', username: 'FAC102', pass: 'FAC102@123', desc: 'Assistant Prof & Mentor' },
    { role: 'HOD CSE', label: 'Dr. Rajesh Sharma', username: 'HOD_CSE', pass: 'HOD_CSE@123', desc: 'Head of Department' },
    { role: 'Super Admin', label: 'Master Admin', username: 'admin', pass: 'Admin@ERP2026', desc: 'Full System Control' },
    { role: 'Maintenance', label: 'Campus Maintenance Desk', username: 'maint01', pass: 'Maint@2026', desc: 'Classroom Repair Ops' },
  ];

  const handleQuickSwitch = async (account) => {
    try {
      setSwitching(true);
      setShowDemoMenu(false);
      await login(account.username, account.pass);
    } catch (err) {
      console.error('Quick switch error:', err);
    } finally {
      setSwitching(false);
    }
  };

  const getRoleBadgeVariant = (r) => {
    switch (r) {
      case 'student': return 'present';
      case 'faculty': return 'earth';
      case 'hod': return 'terracotta';
      case 'admin': return 'info';
      case 'maintenance': return 'warning';
      default: return 'default';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-forest-700 text-white flex items-center justify-center shadow-md shadow-forest-800/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                CAMPUS<span className="text-forest-700 dark:text-forest-400">ERP</span>
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-forest-100 text-forest-800 rounded">
                AKTU Affiliated
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none truncate max-w-[200px] sm:max-w-xs">
              College Student ERP System & Academic Portal
            </p>
          </div>
        </div>

        {/* Right: Quick Switcher, Notices, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Fast Role Switcher Dropdown (Demo Helper) */}
          <div className="relative">
            <button
              onClick={() => setShowDemoMenu(!showDemoMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-earth-300 dark:border-earth-700 bg-earth-50/80 hover:bg-earth-100 dark:bg-earth-950/40 text-xs font-semibold text-earth-800 dark:text-earth-200 transition"
              title="Quick Demo Role Switcher"
            >
              <Layers className="w-3.5 h-3.5 text-earth-600" />
              <span className="hidden md:inline">Switch Role:</span>
              <span className="font-bold capitalize">{role}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showDemoMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-800 dark:text-white">Quick Role Switcher (Demo)</p>
                  <p className="text-[11px] text-slate-500">Test any portal instantly with 1-click:</p>
                </div>
                <div className="py-1 space-y-0.5">
                  {demoAccounts.map((acc) => (
                    <button
                      key={acc.username}
                      onClick={() => handleQuickSwitch(acc)}
                      disabled={switching}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
                          {acc.label}
                          {user?.username === acc.username && (
                            <Check className="w-3.5 h-3.5 text-forest-600" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">{acc.role} • {acc.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              title="College Circulars & Notices"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-fadeIn">
                <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                    Recent Notices & Circulars
                  </h4>
                  <span className="text-[10px] text-slate-500">{notifications.length} updates</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto mt-2">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">No active notices</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="py-2.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg text-xs">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span className="font-medium text-forest-700 dark:text-forest-400">{n.category || 'General'}</span>
                          <span>{n.posted_date}</span>
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-white text-xs">{n.title}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <div className="w-7 h-7 rounded-lg bg-forest-100 text-forest-800 dark:bg-forest-950 dark:text-forest-200 flex items-center justify-center font-bold text-xs">
                {user?.profile?.name ? user.profile.name[0] : (user?.username?.[0]?.toUpperCase() || 'U')}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-800 dark:text-white leading-tight max-w-[120px] truncate">
                  {user?.profile?.name || user?.username}
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={getRoleBadgeVariant(role)} className="!px-1.5 !py-0 !text-[9px]">
                    {role?.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                    {user?.profile?.name || user?.username}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    ID: {user?.username}
                  </p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      if (onOpenPasswordModal) onOpenPasswordModal();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <KeyRound className="w-4 h-4 text-slate-500" />
                    Change Password
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}
