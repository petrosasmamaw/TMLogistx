import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice.js';
import { usePortalNav } from '../context/PortalNavContext.jsx';
import { getPortalNavItems } from '../constants/portalNav.js';
import { roleLabel } from '../constants/roles.js';
import { LogOut, LayoutDashboard, KeyRound } from 'lucide-react';
import BrandMark from './BrandMark.jsx';
import AccountSheet from './account/AccountSheet.jsx';

export default function Sidebar() {
  const dispatch = useDispatch();
  const [accountOpen, setAccountOpen] = useState(false);
  const { user, role } = useSelector((state) => state.auth);
  const { section, setSection } = usePortalNav();
  const navItems = getPortalNavItems(role);
  const accountRole = roleLabel(role || user?.role);

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-slate-200 min-h-screen">
      <div className="p-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <BrandMark size="md" />
          <div>
            <p className="text-sm font-bold text-brand-700 leading-tight">TMLogistx</p>
            <p className="text-[11px] text-slate-500 font-medium">Fleet & Movement</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {accountRole || 'Workspace'}
        </p>
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = section === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand-50 text-brand-700 border border-brand-200'
                  : 'text-brand-600 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-brand-700' : 'text-brand-500'}`} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 space-y-3">
        <div className="flex items-start gap-2 px-1">
          <LayoutDashboard className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{user?.full_name || 'User'}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            {accountRole && (
              <p className="text-[10px] font-semibold text-brand-700 mt-0.5 truncate">{accountRole}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAccountOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-brand-700 border border-brand-200 bg-brand-50 hover:bg-brand-100"
        >
          <KeyRound className="w-4 h-4" />
          Account & password
        </button>
        <button
          type="button"
          onClick={() => dispatch(logout())}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} user={user} />
    </aside>
  );
}
