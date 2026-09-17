import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  GraduationCap, 
  Lock, 
  User, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  BookOpen, 
  Sparkles 
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const demoPresets = [
    { label: 'Student', name: 'Aman Singh (Sem 5)', user: '210097010001', pass: 'AMAN SINGH4321', role: 'student' },
    { label: 'Faculty Mentor 1', name: 'Prof. Vikram Malhotra', user: 'FAC101', pass: 'FAC101@123', role: 'faculty' },
    { label: 'Faculty Mentor 2', name: 'Dr. Ananya Iyer', user: 'FAC102', pass: 'FAC102@123', role: 'faculty' },
    { label: 'HOD CSE', name: 'Dr. Rajesh Sharma', user: 'HOD_CSE', pass: 'HOD_CSE@123', role: 'hod' },
    { label: 'System Admin', name: 'Master Administrator', user: 'admin', pass: 'Admin@ERP2026', role: 'admin' },
    { label: 'Maintenance Desk', name: 'Campus Maintenance', user: 'maint01', pass: 'Maint@2026', role: 'maintenance' },
  ];

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Please enter your username and password.');
      return;
    }

    try {
      setLoading(true);
      await login(username.trim(), password);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillPreset = (preset) => {
    setUsername(preset.user);
    setPassword(preset.pass);
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#f2f7f2] via-[#faf8f5] to-[#eef4ee]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-forest-700 text-white shadow-xl shadow-forest-800/25 mb-4">
          <GraduationCap className="w-9 h-9" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          CAMPUS<span className="text-forest-700">ERP</span>
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          College Student ERP System & Academic Governance Portal
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white/90 backdrop-blur-md py-8 px-6 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-200/80 sm:px-10">
          
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800">Sign in to your account</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your college credentials to access academic records & services.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username / Roll Number / Employee ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. 210097010001 or FAC101 or admin"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-semibold text-sm shadow-md shadow-forest-800/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Presets */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Quick 1-Click Demo Accounts
              </span>
              <span className="text-[10px] text-slate-500">Tap to autofill</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {demoPresets.map((preset) => (
                <button
                  key={preset.user}
                  type="button"
                  onClick={() => fillPreset(preset)}
                  className="text-left p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-forest-50 hover:border-forest-300 transition text-xs group"
                >
                  <div className="font-semibold text-slate-800 group-hover:text-forest-800">
                    {preset.label}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {preset.name}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-xl bg-earth-50 border border-earth-200/80 text-[11px] text-earth-800 space-y-1">
              <div className="font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-earth-600" />
                Default Password Policy:
              </div>
              <p>• Students: <code>NAME IN CAPS + last 4 digits of phone</code> (e.g. <code>AMAN SINGH4321</code>)</p>
              <p>• Faculty / HOD: <code>EMPID + @123</code> (e.g. <code>FAC101@123</code>, <code>HOD_CSE@123</code>)</p>
              <p>• Mandatory password change prompt on first login</p>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
