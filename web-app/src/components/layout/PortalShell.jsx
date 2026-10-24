import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice.js';
import Sidebar from '../Sidebar.jsx';
import MobileHeader from './MobileHeader.jsx';
import MobileBottomNav from './MobileBottomNav.jsx';

export default function PortalShell({ children }) {
  const dispatch = useDispatch();
  const { user, role } = useSelector((state) => state.auth);

  const handleLogout = () => dispatch(logout());

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <MobileHeader role={role} user={user} onLogout={handleLogout} />

        <main className="flex-1 app-portal portal-main overflow-x-hidden overflow-y-auto">{children}</main>

        <footer className="hidden lg:block border-t border-slate-200 bg-white py-3 px-6 text-xs text-slate-500 shrink-0">
          TMLogistx © 2026 — Staff Movement & Fleet Management
        </footer>

        <MobileBottomNav role={role} user={user} onLogout={handleLogout} />
      </div>
    </div>
  );
}
