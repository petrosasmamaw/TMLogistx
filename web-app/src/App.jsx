import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { bootstrapSession } from './store/slices/authSlice.js';
import { PortalNavProvider } from './context/PortalNavContext.jsx';
import PortalShell from './components/layout/PortalShell.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import AdminView from './views/AdminView.jsx';
import MasterView from './views/MasterView.jsx';
import { MasterScopeProvider } from './context/MasterScopeContext.jsx';
import LogisticsView from './views/LogisticsView.jsx';
import MovementView from './views/MovementView.jsx';
import { SessionLayoutSkeleton } from './components/ui/Skeleton.jsx';
import useFleetLiveSocket from './hooks/useFleetLiveSocket.js';

export default function App() {
  const dispatch = useDispatch();
  const { role, user, isAuthenticated, initializing } = useSelector((state) => state.auth);
  useFleetLiveSocket();

  useEffect(() => {
    if (localStorage.getItem('tmlogistx_token')) {
      dispatch(bootstrapSession());
    }
  }, [dispatch]);

  if (initializing) {
    return <SessionLayoutSkeleton />;
  }

  const resetToken = new URLSearchParams(window.location.search).get('reset_token');

  if (!isAuthenticated) {
    if (resetToken) {
      return (
        <ResetPasswordPage
          onDone={() => {
            window.history.replaceState({}, '', window.location.pathname || '/');
          }}
        />
      );
    }
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
      <PortalShell>{renderRoleView()}</PortalShell>
    </PortalNavProvider>
  );
}
