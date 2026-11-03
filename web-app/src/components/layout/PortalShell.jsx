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
    <div className="min-h-screen bg-page text-ink flex font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <MobileHeader role={role} user={user} onLogout={handleLogout} />

        {showNotifBanner && (
          <div className="notification-banner w-full px-9 py-2.5 text-[13px] font-semibold flex flex-wrap items-center justify-between gap-2 shrink-0">
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
              className="underline hover:opacity-90 min-h-[44px] inline-flex items-center"
            >
              {permission === 'denied' ? 'How to enable' : 'Allow notifications'}
            </button>
          </div>
        )}

        <main className="flex-1 app-portal portal-main overflow-x-hidden overflow-y-auto">{children}</main>

        <footer className="py-2.5 px-5 lg:px-9 text-xs text-mute shrink-0 text-center lg:text-left mt-8 lg:mt-0 border-t-0 lg:border-0 bg-transparent">
          TMLogistx · Staff Movement & Fleet Management
        </footer>

        <MobileBottomNav role={role} user={user} onLogout={handleLogout} />
      </div>
    </div>
  );
}
