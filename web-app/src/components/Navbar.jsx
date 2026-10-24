import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, logout, DEMO_CREDENTIALS } from '../store/slices/authSlice.js';
import { Shield, Truck, Compass, UserCheck, LogOut, MapPin, Globe } from 'lucide-react';
import BrandMark from './BrandMark.jsx';

export default function Navbar() {
  const dispatch = useDispatch();
  const { user, role } = useSelector(state => state.auth);

  const handleRoleSwitch = (targetRoleKey) => {
    const creds = DEMO_CREDENTIALS[targetRoleKey];
    if (creds) {
      dispatch(loginUser(creds));
    }
  };

  const getRoleBadge = (r) => {
    switch (r) {
      case 'SYSTEM_ADMIN':
        return <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"><Shield className="w-3 h-3" /> System Admin</span>;
      case 'MASTER_PERSON':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"><UserCheck className="w-3 h-3" /> Master Person</span>;
      case 'LOGISTICS_COORDINATOR':
        return <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"><Truck className="w-3 h-3" /> Logistics Coordinator</span>;
      case 'MOVEMENT_OFFICER':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"><Compass className="w-3 h-3" /> Movement Officer</span>;
      default:
        return <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full text-xs font-semibold">{r}</span>;
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      {/* Top Demo Role Switcher Bar */}
      <div className="bg-gradient-to-r from-brand-950 via-slate-900 to-slate-950 px-4 py-1.5 border-b border-slate-800/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="font-semibold text-slate-200 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-brand-400" /> Switch Role:
          </span>
          <span className="hidden sm:inline text-slate-500">Test multi-role dashboards with 1 click:</span>
        </div>
        <div className="flex items-center gap-1.5">
          {Object.entries(DEMO_CREDENTIALS).map(([key, cred]) => (
            <button
              key={key}
              onClick={() => handleRoleSwitch(key)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                role === key
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25 ring-1 ring-brand-300'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
              }`}
            >
              {cred.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <BrandMark size="md" className="rounded-xl" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                TMLogistx
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Staff Movement & Fleet Management</p>
          </div>
        </div>

        {/* Current Active User & Project Context */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-200">{user?.full_name || 'Authenticated User'}</span>
              {getRoleBadge(role)}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>{user?.project_name || user?.project?.name || 'Ethiopia / Project A'}</span>
            </div>
          </div>

          <button
            onClick={() => dispatch(logout())}
            title="Sign out"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
