import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { useSelector } from 'react-redux';
import { apiRequest } from '../../api/client.js';
import LoadingButton from '../ui/LoadingButton.jsx';
import PasswordField from '../ui/PasswordField.jsx';
import { TableSkeleton } from '../ui/Skeleton.jsx';
import {
  DRIVER_SHIFT_DAY,
  DRIVER_SHIFT_OPTIONS,
  driverShiftLabel,
  normalizeDriverShiftType
} from '../../constants/driverShifts.js';

function resolveCoordinatorProjectId(user) {
  if (!user) return null;
  return user.project_id || user.projectId || user.project?.id || null;
}

export default function FleetWorkersPanel({
  onCountsChange,
  onDriversChanged,
  /** Logistics coordinator: driver accounts only (staff → Master Person). */
  driversOnly = false
}) {
  const { user } = useSelector((state) => state.auth);
  const projectId = resolveCoordinatorProjectId(user);

  const [workers, setWorkers] = useState([]);
  const [driverByUserId, setDriverByUserId] = useState({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingShiftId, setSavingShiftId] = useState(null);
  const [createdCreds, setCreatedCreds] = useState(null);
  const [mode, setMode] = useState(driversOnly ? 'DRIVER' : 'STAFF');
  const [shiftModal, setShiftModal] = useState(null);
  const [shiftForm, setShiftForm] = useState({ shift_type: DRIVER_SHIFT_DAY });
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone_number: '',
    license_number: '',
    shift_type: DRIVER_SHIFT_DAY
  });
  const [avatarPreview, setAvatarPreview] = useState(null);

  const counts = useMemo(() => {
    const staff = workers.filter((w) => w.role === 'STAFF').length;
    const drivers = workers.filter((w) => w.role === 'DRIVER').length;
    return { staff, drivers, total: staff + drivers };
  }, [workers]);

  useEffect(() => {
    onCountsChange?.(counts);
  }, [counts, onCountsChange]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!projectId) return;
      if (isRefresh) setRefreshing(true);
      else setInitialLoading(true);
      try {
        const [uRes, dRes] = await Promise.all([
          apiRequest('/users'),
          apiRequest('/drivers')
        ]);
        const rows = (uRes.data || []).filter((u) =>
          driversOnly ? u.role === 'DRIVER' : ['STAFF', 'DRIVER'].includes(u.role)
        );
        setWorkers(rows);
        const map = {};
        (dRes.data || []).forEach((d) => {
          map[d.user_id] = d;
        });
        setDriverByUserId(map);
      } catch (err) {
        setWorkers([]);
        setDriverByUserId({});
        if (!isRefresh) {
          console.error('Failed to load staff/drivers:', err);
        }
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [projectId, driversOnly]
  );

  useEffect(() => {
    if (driversOnly) setMode('DRIVER');
  }, [driversOnly]);

  useEffect(() => {
    load(false);
  }, [load]);

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.phone_number?.trim()) {
      alert('Phone number is required for staff and drivers.');
      return;
    }
    if (mode === 'DRIVER' && !form.license_number?.trim()) {
      alert('License number is required for drivers.');
      return;
    }
    setSaving(true);
    setCreatedCreds(null);
    try {
      const body = {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        phone_number: form.phone_number,
        role: mode,
        project_id: projectId,
        country_id: user?.country_id
      };
      if (mode === 'DRIVER') {
        body.license_number = form.license_number;
        body.shift_type = form.shift_type;
      }
      if (avatarPreview) body.avatar_image = avatarPreview;
      await apiRequest('/users', { method: 'POST', body });
      setCreatedCreds({ email: form.email, password: form.password, role: mode });
      setForm({
        full_name: '',
        email: '',
        password: '',
        phone_number: '',
        license_number: '',
        shift_type: DRIVER_SHIFT_DAY
      });
      setAvatarPreview(null);
      await load(true);
      onDriversChanged?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openShiftEdit = (worker) => {
    const drv = driverByUserId[worker.id];
    if (!drv) {
      alert('Driver profile not found. Try refreshing the page.');
      return;
    }
    setShiftModal({ worker, driverId: drv.id });
    setShiftForm({
      shift_type: normalizeDriverShiftType(drv.shift_type)
    });
  };

  const handleSaveDriverShift = async (e) => {
    e.preventDefault();
    if (!shiftModal?.driverId) return;
    setSavingShiftId(shiftModal.driverId);
    try {
      await apiRequest(`/drivers/${shiftModal.driverId}`, {
        method: 'PATCH',
        body: { shift_type: shiftForm.shift_type }
      });
      setShiftModal(null);
      await load(true);
      onDriversChanged?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingShiftId(null);
    }
  };

  if (!projectId) {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-4">
        Your account is not linked to a project. Ask your master person or admin to assign a project.
      </p>
    );
  }

  if (initialLoading) return <TableSkeleton rows={5} cols={5} />;

  const formDisabled = saving || refreshing;

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl border border-slate-200 p-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
          <UserPlus className="w-4 h-4 text-brand-600" />
          {driversOnly ? 'Register driver mobile account' : 'Create mobile app login'}
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          {driversOnly
            ? `Drivers on project: ${counts.drivers}. Staff accounts are registered by your Master Person.`
            : `Staff: ${counts.staff} · Drivers: ${counts.drivers} · Total: ${counts.total}`}
          {refreshing && <span className="ml-2 text-brand-600">Updating list…</span>}
        </p>
        {!driversOnly && (
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              disabled={formDisabled}
              onClick={() => setMode('STAFF')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 ${mode === 'STAFF' ? 'bg-brand-600 text-white' : 'bg-slate-100'}`}
            >
              Staff ({counts.staff})
            </button>
            <button
              type="button"
              disabled={formDisabled}
              onClick={() => setMode('DRIVER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 ${mode === 'DRIVER' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}
            >
              Driver ({counts.drivers})
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <input
            required
            disabled={formDisabled}
            placeholder="Full name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="p-2.5 rounded-xl border disabled:bg-slate-50"
          />
          <input
            required
            disabled={formDisabled}
            type="email"
            placeholder="Email (login)"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="p-2.5 rounded-xl border disabled:bg-slate-50"
          />
          <PasswordField
            required
            disabled={formDisabled}
            minLength={8}
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            inputClassName="p-2.5 rounded-xl border disabled:bg-slate-50"
          />
          <input
            required
            disabled={formDisabled}
            placeholder="Phone (unique)"
            value={form.phone_number}
            onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            className="p-2.5 rounded-xl border disabled:bg-slate-50"
          />
          <label className="text-xs font-semibold text-slate-600">
            Profile photo (optional)
            <input type="file" accept="image/*" disabled={formDisabled} onChange={handleAvatarFile} className="mt-1 block text-xs" />
          </label>
          {avatarPreview ? (
            <img src={avatarPreview} alt="" className="w-12 h-12 rounded-full object-cover border border-slate-200" />
          ) : null}
          {mode === 'DRIVER' && (
            <>
              <input
                required
                disabled={formDisabled}
                placeholder="License number *"
                value={form.license_number}
                onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                className="p-2.5 rounded-xl border disabled:bg-slate-50"
              />
              <label className="block text-xs font-semibold text-slate-600">
                Shift
                <select
                  disabled={formDisabled}
                  value={form.shift_type}
                  onChange={(e) => setForm({ ...form, shift_type: e.target.value })}
                  className="mt-1 w-full p-2.5 rounded-xl border disabled:bg-slate-50"
                >
                  {DRIVER_SHIFT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          <div className="md:col-span-2 flex justify-end">
            <LoadingButton
              type="submit"
              loading={saving}
              loadingLabel="Creating…"
              disabled={refreshing}
              className="px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold disabled:opacity-50"
            >
              Create {mode === 'STAFF' ? 'staff' : 'driver'}
            </LoadingButton>
          </div>
        </form>
        {createdCreds && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <strong>Share with the worker:</strong> {createdCreds.email} / {createdCreds.password} ({createdCreds.role})
          </div>
        )}
      </div>

      <div className={`glass-panel rounded-2xl border border-slate-200 overflow-hidden ${refreshing ? 'opacity-80' : ''}`}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-bold text-slate-900">
              Project staff & drivers ({counts.total})
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            {counts.staff} staff · {counts.drivers} drivers
          </span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Shift</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {workers.map((w) => {
              const drv = driverByUserId[w.id];
              return (
                <tr key={w.id}>
                  <td className="p-3 font-medium">{w.full_name}</td>
                  <td className="p-3 font-mono text-slate-500">{w.email}</td>
                  <td className="p-3">{w.role}</td>
                  <td className="p-3 font-mono text-slate-600">
                    {w.role === 'DRIVER' && drv
                      ? driverShiftLabel(drv.shift_type)
                      : '—'}
                  </td>
                  <td className="p-3 text-right">
                    {w.role === 'DRIVER' && (
                      <button
                        type="button"
                        disabled={refreshing || savingShiftId === drv?.id}
                        onClick={() => openShiftEdit(w)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg disabled:opacity-50"
                      >
                        {savingShiftId === drv?.id ? 'Saving…' : 'Change shift'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {workers.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-slate-500 italic">No staff or drivers yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {shiftModal && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveDriverShift} className="glass-panel p-6 rounded-2xl w-full max-w-md border border-slate-300 space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900">Driver shift — {shiftModal.worker.full_name}</h3>
            <div>
              <label className="text-slate-700 block mb-1 font-medium">Shift</label>
              <select
                required
                disabled={!!savingShiftId}
                value={shiftForm.shift_type}
                onChange={(e) => setShiftForm({ shift_type: e.target.value })}
                className="w-full p-2.5 rounded-xl border"
              >
                {DRIVER_SHIFT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={!!savingShiftId}
                onClick={() => setShiftModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <LoadingButton
                type="submit"
                loading={!!savingShiftId}
                loadingLabel="Saving…"
                className="px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold"
              >
                Save shift
              </LoadingButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
