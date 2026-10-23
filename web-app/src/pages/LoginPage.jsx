import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearAuthError } from '../store/slices/authSlice.js';
import { Truck } from 'lucide-react';
import LoadingButton from '../components/ui/LoadingButton.jsx';
import PasswordField from '../components/ui/PasswordField.jsx';

export default function LoginPage() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(clearAuthError());
    dispatch(loginUser({ email, password }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-brand-600 flex items-center justify-center text-white mb-4">
            <Truck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">TMLogistx Portal</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">
            Sign in with the account your administrator created for you.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4"
        >
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-50"
              placeholder="you@organization.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
            <PasswordField
              autoComplete="current-password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              inputClassName="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-50"
              placeholder="••••••••••••"
            />
          </div>

          <LoadingButton
            type="submit"
            loading={loading}
            loadingLabel="Signing in…"
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
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
