import React, { useState } from 'react';
import ForgotPasswordPage from './ForgotPasswordPage.jsx';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearAuthError } from '../store/slices/authSlice.js';
import BrandMark from '../components/BrandMark.jsx';
import LoadingButton from '../components/ui/LoadingButton.jsx';
import PasswordField from '../components/ui/PasswordField.jsx';
import { fieldInput, fieldLabel } from '../components/ui/formClasses.js';

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
    <div className="login-shell min-h-[100dvh] bg-gradient-to-b from-brand-50 via-slate-50 to-slate-100 flex flex-col lg:items-center lg:justify-center p-4 sm:p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center lg:flex-none lg:justify-start">
        <div className="flex flex-col items-center mb-8">
          <BrandMark size="lg" className="mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">TMLogistx Portal</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">
            Sign in with the account your administrator created for you.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 space-y-4"
        >
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

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
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Forgot password?
            </button>
          </div>

          <LoadingButton
            type="submit"
            loading={loading}
            loadingLabel="Signing in…"
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl py-3 text-sm transition-colors shadow-md shadow-brand-500/20"
          >
            Sign in
          </LoadingButton>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Staff and drivers: use the TMLogistx mobile app with your assigned credentials.
        </p>
      </div>
    </div>
  );
}
