import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { bootstrapSession } from './store/slices/authSlice.js';
import { PortalNavProvider } from './context/PortalNavContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import LoginPage from './pages/LoginPage.jsx';
import AdminView from './views/AdminView.jsx';
import MasterView from './views/MasterView.jsx';
import { MasterScopeProvider } from './context/MasterScopeContext.jsx';
import LogisticsView from './views/LogisticsView.jsx';
import MovementView from './views/MovementView.jsx';
import { SessionLayoutSkeleton } from './components/ui/Skeleton.jsx';

export default function App() {
  const dispatch = useDispatch();
  const { role, user, isAuthenticated, initializing } = useSelector((state) => state.auth);

  useEffect(() => {
    if (localStorage.getItem('tmlogistx_token')) {
      dispatch(bootstrapSession());
    }
  }, [dispatch]);

  if (initializing) {
    return <SessionLayoutSkeleton />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderRoleView = () => {
    switch (role) {
      case 'SYSTEM_ADMIN':
        return <AdminView />;
      case 'MASTER_PERSON':
        return (
          <MasterScopeProvider>
            <MasterView />
          </MasterScopeProvider>
        );
      case 'LOGISTICS_COORDINATOR':
        return <LogisticsView />;
      case 'MOVEMENT_CENTER':
      case 'MOVEMENT_OFFICER':
        return <MovementView />;
      default:
        return (
          <div className="text-sm text-slate-600">
            Your role is not configured for this portal. Contact your system administrator.
          </div>
        );
    }
  };

  return (
    <PortalNavProvider role={role} sessionKey={user?.id}>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 app-portal px-6 py-6 lg:px-8 overflow-auto">
            {renderRoleView()}
          </main>

          <footer className="border-t border-slate-200 bg-white py-3 px-6 text-xs text-slate-500">
            TMLogistx © 2026 — Staff Movement & Fleet Management
          </footer>
        </div>
      </div>
    </PortalNavProvider>
  );
}
