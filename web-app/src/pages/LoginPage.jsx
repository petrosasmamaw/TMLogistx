import React, { useState } from 'react';
import ForgotPasswordPage from './ForgotPasswordPage.jsx';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearAuthError } from '../store/slices/authSlice.js';
import BrandMark from '../components/BrandMark.jsx';
import LoadingButton from '../components/ui/LoadingButton.jsx';
import PasswordField from '../components/ui/PasswordField.jsx';
import { fieldInput, fieldLabel, btnPrimary, alertError } from '../components/ui/formClasses.js';

export default function LoginPage() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState('login');

  if (view === 'forgot') {
    return <ForgotPasswordPage onBack={() => setView('login')} />;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(clearAuthError());
    dispatch(loginUser({ email, password }));
  };

  return (
    <div className="login-shell min-h-[100dvh] flex flex-col items-center justify-center p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-[420px] mx-auto flex flex-col">
        <div className="flex flex-col items-center mb-8">
          <BrandMark size="lg" className="mb-4" />
          <h1 className="text-2xl font-extrabold text-ink tracking-[-0.5px]">TMLogistx Portal</h1>
          <p className="text-sm text-mute mt-1 text-center max-w-[320px] font-medium">
            Sign in with the account your administrator created for you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-auth-sheet space-y-4">
          {error && <div className={alertError}>{error}</div>}

          <div>
            <label className={fieldLabel}>Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldInput}
              placeholder="you@organization.com"
            />
          </div>

          <div>
            <label className={fieldLabel}>Password</label>
            <PasswordField
              autoComplete="current-password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              inputClassName={fieldInput}
              placeholder="••••••••••••"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setView('forgot')}
              className="text-[13px] font-bold text-brand-600 hover:text-brand-700 my-2.5"
            >
              Forgot password?
            </button>
          </div>

          <LoadingButton
            type="submit"
            loading={loading}
            loadingLabel="Signing in…"
            className={`w-full ${btnPrimary} min-h-[48px]`}
          >
            Sign in
          </LoadingButton>
        </form>

        <p className="text-center text-[13px] text-mute mt-6 font-medium">
          Staff and drivers: use the TMLogistx mobile app with your assigned credentials.
        </p>
      </div>
    </div>
  );
}
