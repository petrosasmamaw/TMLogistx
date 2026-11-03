import React, { useState, useMemo } from 'react';
import BrandMark from '../components/BrandMark.jsx';
import LoadingButton from '../components/ui/LoadingButton.jsx';
import PasswordField from '../components/ui/PasswordField.jsx';
import { fieldInput, fieldLabel, btnPrimary, alertError, alertSuccess } from '../components/ui/formClasses.js';
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
      <div className="login-shell min-h-[100dvh] flex items-center justify-center p-6 text-center">
        <p className="text-base font-bold text-ink">Invalid reset link. Request a new one from the sign-in page.</p>
      </div>
    );
  }

  return (
    <div className="login-shell min-h-[100dvh] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center mb-6">
          <BrandMark size="lg" className="mb-3" />
          <h1 className="text-2xl font-extrabold text-ink tracking-[-0.5px]">Set new password</h1>
        </div>
        {done ? (
          <div className="login-auth-sheet text-center space-y-4">
            <p className={alertSuccess}>Password updated successfully.</p>
            <a href="/" className="inline-block text-[13px] font-bold text-brand-600 min-h-[44px] leading-[44px]">
              Sign in
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-auth-sheet space-y-4">
            {error && <div className={alertError}>{error}</div>}
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
            <LoadingButton type="submit" loading={loading} loadingLabel="Saving…" className={`w-full ${btnPrimary} min-h-[48px]`}>
              Update password
            </LoadingButton>
          </form>
        )}
      </div>
    </div>
  );
}
