import React, { useState } from 'react';
import { KeyRound, X, Camera } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { apiRequest } from '../../api/client.js';
import { patchStoredUser } from '../../store/slices/authSlice.js';
import LoadingButton from '../ui/LoadingButton.jsx';
import PasswordField from '../ui/PasswordField.jsx';
import { fieldInput, fieldLabel } from '../ui/formClasses.js';

export default function AccountSheet({ open, onClose, user }) {
  const dispatch = useDispatch();
  const isSuperAdmin = user?.role === 'SYSTEM_ADMIN';
  const [currentPassword, setCurrentPassword] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    setError('');
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await apiRequest('/auth/me', {
        method: 'PATCH',
        body: { avatar_image: dataUrl }
      });
      if (res.user) dispatch(patchStoredUser(res.user));
      setMessage('Profile photo updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setAvatarLoading(false);
      e.target.value = '';
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword }
      });
      setMessage(isSuperAdmin ? 'PIN updated.' : 'Password updated.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-label="Close" />
      <div className="absolute inset-x-0 bottom-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-md bg-white rounded-t-3xl lg:rounded-2xl border border-slate-200 shadow-2xl p-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900">Account</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isSuperAdmin && (
          <div className="flex items-center gap-3 mb-3">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-lg">
                {(user?.full_name || '?').charAt(0)}
              </div>
            )}
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 cursor-pointer">
              <Camera className="w-4 h-4" />
              {avatarLoading ? 'Uploading…' : 'Change photo'}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} disabled={avatarLoading} />
            </label>
          </div>
        )}

        <p className="text-sm text-slate-600 mb-1">{user?.full_name}</p>
        <p className="text-xs text-slate-500 mb-4">{user?.email}</p>
        {user?.phone_number && <p className="text-xs text-slate-500 mb-4">Phone: {user.phone_number}</p>}

        {isSuperAdmin ? (
          <p className="text-xs text-slate-500 mb-3">
            Platform admins use a sign-in PIN only. Forgot-password email is not available for this account.
          </p>
        ) : (
          <p className="text-xs text-slate-500 mb-3">
            Use &quot;Forgot password?&quot; on the sign-in page if you need a reset link by email.
          </p>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3">
          {error && <div className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
          {message && <div className="text-sm text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2">{message}</div>}
          <div>
            <label className={fieldLabel}>{isSuperAdmin ? 'Current PIN' : 'Current password'}</label>
            <PasswordField value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} inputClassName={fieldInput} required />
          </div>
          <div>
            <label className={fieldLabel}>{isSuperAdmin ? 'New PIN' : 'New password'}</label>
            <PasswordField
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              inputClassName={fieldInput}
              required
              minLength={isSuperAdmin ? 4 : 8}
            />
          </div>
          <LoadingButton type="submit" loading={loading} loadingLabel="Saving…" className="w-full bg-brand-600 text-white rounded-xl py-3 font-semibold">
            {isSuperAdmin ? 'Change PIN' : 'Change password'}
          </LoadingButton>
        </form>
      </div>
    </div>
  );
}
