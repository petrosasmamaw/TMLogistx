import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice.js';
import Sidebar from '../Sidebar.jsx';
import MobileHeader from './MobileHeader.jsx';
import MobileBottomNav from './MobileBottomNav.jsx';
import usePortalNotifications from '../../hooks/usePortalNotifications.js';

export default function PortalShell({ children }) {
  const dispatch = useDispatch();
  const { user, role } = useSelector((state) => state.auth);
  const { permission, ask } = usePortalNotifications();

  const handleLogout = () => dispatch(logout());
  const showNotifBanner =
    ['LOGISTICS_COORDINATOR', 'MOVEMENT_CENTER', 'MOVEMENT_OFFICER', 'MASTER_PERSON'].includes(role) &&
    permission !== 'granted' &&
    permission !== 'unsupported';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <MobileHeader role={role} user={user} onLogout={handleLogout} />

        {showNotifBanner && (
          <div className="mx-4 mt-3 lg:mx-6 p-3 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2">
            <span>
              {permission === 'denied'
                ? 'Browser notifications are blocked. Allow them in site settings so new requests and arrivals appear instantly.'
                : 'Allow browser notifications so Movement Center gets alerts the moment staff request a trip.'}
            </span>
            <button
              type="button"
              onClick={() => {
                if (permission === 'denied') {
                  window.alert(
                    'Notifications are blocked for this site.\n\n1. Click the lock / site-info icon left of the address bar.\n2. Set Notifications to "Allow".\n3. Reload the page.'
                  );
                  return;
                }
                ask();
              }}
              className="font-semibold underline hover:text-amber-800"
            >
              {permission === 'denied' ? 'How to enable' : 'Allow notifications'}
            </button>
          </div>
        )}

        <main className="flex-1 app-portal portal-main overflow-x-hidden overflow-y-auto">{children}</main>

        <footer className="border-t border-slate-200 bg-white py-2.5 px-4 lg:px-6 text-[10px] lg:text-xs text-slate-500 shrink-0 text-center lg:text-left">
          TMLogistx · Staff Movement & Fleet Management
        </footer>

        <MobileBottomNav role={role} user={user} onLogout={handleLogout} />
      </div>
    </div>
  );
}
