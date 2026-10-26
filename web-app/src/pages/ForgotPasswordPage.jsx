import React, { useState } from 'react';
import BrandMark from '../components/BrandMark.jsx';
import LoadingButton from '../components/ui/LoadingButton.jsx';
import { fieldInput, fieldLabel } from '../components/ui/formClasses.js';
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
    <div className="login-shell min-h-[100dvh] bg-gradient-to-b from-brand-50 via-slate-50 to-slate-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <BrandMark size="lg" className="mb-3" />
          <h1 className="text-xl font-bold text-slate-900">Forgot password</h1>
        </div>
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          {message && <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{message}</div>}
          <div>
            <label className={fieldLabel}>Email</label>
            <input type="email" required className={fieldInput} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <LoadingButton type="submit" loading={loading} loadingLabel="Sending…" className="w-full bg-brand-600 text-white font-semibold rounded-xl py-3">
            Send reset link
          </LoadingButton>
          <button type="button" onClick={onBack} className="w-full text-sm text-brand-600 font-semibold py-2">
            Back to sign in
          </button>
        </form>
      </div>
    </div>
  );
}
