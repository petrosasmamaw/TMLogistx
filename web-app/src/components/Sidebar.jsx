import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice.js';
import { usePortalNav } from '../context/PortalNavContext.jsx';
import { getPortalNavItems } from '../constants/portalNav.js';
import { roleLabel } from '../constants/roles.js';
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
    <aside className="hidden lg:flex w-[248px] shrink-0 flex-col bg-white border-r border-line min-h-screen py-5 px-3.5">
      <div className="px-2 pb-[22px]">
        <div className="flex items-center gap-3">
          <BrandMark size="sm" />
          <div>
            <p className="text-base font-extrabold text-ink tracking-[-0.3px] leading-tight">TMLogistx</p>
            <p className="text-xs text-mute font-medium">Fleet & Movement</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-0.5 px-0">
        <p className="px-2.5 pb-2 text-xs font-bold text-mute">{accountRole || 'Workspace'}</p>
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = section === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={`relative w-full flex items-center gap-3 min-h-[44px] px-2.5 rounded-[10px] text-sm font-semibold transition-colors duration-150 ${
                active
                  ? 'bg-brand-50 text-brand-600 sidebar-nav-active-bar'
                  : 'text-mute hover:bg-page hover:text-ink'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="pt-3.5 mt-auto border-t border-line px-2 space-y-2">
        <div className="min-w-0 px-0.5">
          <p className="text-sm font-bold text-ink truncate">{user?.full_name || 'User'}</p>
          <p className="text-xs text-mute truncate">{user?.email}</p>
          {accountRole && <p className="text-xs text-mute truncate mt-0.5">{accountRole}</p>}
        </div>
        <button
          type="button"
          onClick={() => setAccountOpen(true)}
          className="text-[13px] font-bold text-brand-600 hover:text-brand-700 min-h-[44px] flex items-center px-1"
        >
          Account & password
        </button>
        <button
          type="button"
          onClick={() => dispatch(logout())}
          className="text-[13px] font-bold text-brand-600 hover:text-brand-700 min-h-[44px] flex items-center px-1"
        >
          Sign out
        </button>
      </div>
      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} user={user} />
    </aside>
  );
}
