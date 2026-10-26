import React, { useState, useMemo } from 'react';
import BrandMark from '../components/BrandMark.jsx';
import LoadingButton from '../components/ui/LoadingButton.jsx';
import PasswordField from '../components/ui/PasswordField.jsx';
import { fieldInput, fieldLabel } from '../components/ui/formClasses.js';
import { apiRequest } from '../api/client.js';

export default function ResetPasswordPage({ onDone }) {
  const token = useMemo(
    () => new URLSearchParams(window.location.search).get('reset_token') || '',
    []
  );
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Missing reset token. Use the link from your email.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: { token, newPassword }
      });
      setDone(true);
      if (onDone) onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6 text-center text-slate-600">
        Invalid reset link. Request a new one from the sign-in page.
      </div>
    );
  }

  return (
    <div className="login-shell min-h-[100dvh] bg-gradient-to-b from-brand-50 via-slate-50 to-slate-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <BrandMark size="lg" className="mb-3" />
          <h1 className="text-xl font-bold text-slate-900">Set new password</h1>
        </div>
        {done ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4">
            <p className="text-slate-700">Password updated successfully.</p>
            <a href="/" className="inline-block text-brand-600 font-semibold">Sign in</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
            <div>
              <label className={fieldLabel}>New password</label>
              <PasswordField
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                inputClassName={fieldInput}
              />
            </div>
            <LoadingButton type="submit" loading={loading} loadingLabel="Saving…" className="w-full bg-brand-600 text-white font-semibold rounded-xl py-3">
              Update password
            </LoadingButton>
          </form>
        )}
      </div>
    </div>
  );
}
