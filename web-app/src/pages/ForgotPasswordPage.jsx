import React, { useState } from 'react';
import BrandMark from '../components/BrandMark.jsx';
import LoadingButton from '../components/ui/LoadingButton.jsx';
import { fieldInput, fieldLabel, btnPrimary, alertError, alertSuccess } from '../components/ui/formClasses.js';
import { apiRequest } from '../api/client.js';

export default function ForgotPasswordPage({ onBack }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: { email }
      });
      setMessage(res.message || 'Check your email for a reset link.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell min-h-[100dvh] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center mb-6">
          <BrandMark size="lg" className="mb-3" />
          <h1 className="text-2xl font-extrabold text-ink tracking-[-0.5px]">Forgot password</h1>
        </div>
        <form onSubmit={handleSubmit} className="login-auth-sheet space-y-4">
          {error && <div className={alertError}>{error}</div>}
          {message && <div className={alertSuccess}>{message}</div>}
          <div>
            <label className={fieldLabel}>Email</label>
            <input type="email" required className={fieldInput} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <LoadingButton type="submit" loading={loading} loadingLabel="Sending…" className={`w-full ${btnPrimary} min-h-[48px]`}>
            Send reset link
          </LoadingButton>
          <button type="button" onClick={onBack} className="w-full text-[13px] font-bold text-brand-600 py-2 min-h-[44px]">
            Back to sign in
          </button>
        </form>
      </div>
    </div>
  );
}
