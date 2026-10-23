import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Users } from 'lucide-react';
import { apiRequest } from '../../api/client.js';
import { useMasterScope } from '../../context/MasterScopeContext.jsx';
import AdminSectionHeader from '../admin/AdminSectionHeader.jsx';
import LoadingButton from '../ui/LoadingButton.jsx';
import PasswordField from '../ui/PasswordField.jsx';
import { TableSkeleton } from '../ui/Skeleton.jsx';
import { roleLabel } from '../../constants/roles.js';
import {
  DRIVER_SHIFT_DAY,
  DRIVER_SHIFT_OPTIONS,
  driverShiftLabel,
  normalizeDriverShiftType
} from '../../constants/driverShifts.js';

const WORKER_ROLES = [
  'LOGISTICS_COORDINATOR',
  'MOVEMENT_CENTER',
  'STAFF',
  'DRIVER'
];

function normalizeWorkerRole(role) {
  if (role === 'MOVEMENT_OFFICER') return 'MOVEMENT_CENTER';
  return role;
}

export default function MasterWorkersPanel() {
  const { activeProjectId, activeProject } = useMasterScope();
  const projectId = activeProjectId;
  const countryId = activeProject?.country_id;

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [savingWorker, setSavingWorker] = useState(false);
  const [driverByUserId, setDriverByUserId] = useState({});
  const [editingWorker, setEditingWorker] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [workerForm, setWorkerForm] = useState({
    role: 'LOGISTICS_COORDINATOR',
    full_name: '',
    email: '',
    password: '',
    phone_number: '',
    license_number: '',
    shift_type: DRIVER_SHIFT_DAY
  });
  const [editForm, setEditForm] = useState({
    role: 'LOGISTICS_COORDINATOR',
    full_name: '',
    phone_number: '',
    password: '',
    is_active: true,
    license_number: '',
    shift_type: DRIVER_SHIFT_DAY
  });

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setLoadError('');
    try {
      const [uRes, dRes] = await Promise.all([
        apiRequest(`/users?project_id=${projectId}`),
        apiRequest(`/drivers?project_id=${projectId}`)
      ]);
      setWorkers(
        (uRes.data || []).filter((u) => u.role !== 'SYSTEM_ADMIN' && u.role !== 'MASTER_PERSON')
      );
      const map = {};
      (dRes.data || []).forEach((d) => {
        map[d.user_id] = d;
      });
      setDriverByUserId(map);
    } catch (err) {
      setLoadError(err.message || 'Could not load workers. Try again.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateWorker = async (e) => {
    e.preventDefault();
    if (workerForm.role === 'DRIVER' && !workerForm.license_number?.trim()) {
      alert('License number is required for drivers.');
      return;
    }
    setSavingWorker(true);
    try {
      const body = {
        full_name: workerForm.full_name,
        email: workerForm.email,
        password: workerForm.password,
        phone_number: workerForm.phone_number,
        role: workerForm.role,
        project_id: projectId,
        country_id: countryId
      };
      if (workerForm.role === 'DRIVER') {
        body.license_number = workerForm.license_number.trim();
        body.shift_type = workerForm.shift_type;
      }
      await apiRequest('/users', { method: 'POST', body });
      setShowWorkerModal(false);
      setWorkerForm({
        role: 'LOGISTICS_COORDINATOR',
        full_name: '',
        email: '',
        password: '',
        phone_number: '',
        license_number: '',
        shift_type: DRIVER_SHIFT_DAY
      });
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingWorker(false);
    }
  };

  const openEdit = (w) => {
    const drv = driverByUserId[w.id];
    const role = normalizeWorkerRole(w.role);
    setEditingWorker(w);
    setEditForm({
      role: WORKER_ROLES.includes(role) ? role : 'STAFF',
      full_name: w.full_name || '',
      phone_number: w.phone_number || '',
      password: '',
      is_active: w.is_active !== false,
      license_number: drv?.license_number || '',
      shift_type: normalizeDriverShiftType(drv?.shift_type)
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingWorker) return;
    const role = editForm.role;
    if (role === 'DRIVER' && !editForm.license_number?.trim()) {
      alert('License number is required for drivers.');
      return;
    }
    setSavingEdit(true);
    try {
      const userBody = {
        full_name: editForm.full_name,
        phone_number: editForm.phone_number,
        role: editForm.role,
        is_active: editForm.is_active,
        project_id: projectId
      };
      if (editForm.password?.trim()) {
        userBody.password = editForm.password.trim();
      }
      if (role === 'DRIVER') {
        userBody.license_number = editForm.license_number.trim();
        userBody.shift_type = editForm.shift_type;
      }
      await apiRequest(`/users/${editingWorker.id}`, { method: 'PATCH', body: userBody });

      const drv = driverByUserId[editingWorker.id];
      if (role === 'DRIVER' && drv?.id) {
        await apiRequest(`/drivers/${drv.id}`, {
          method: 'PATCH',
          body: {
            license_number: editForm.license_number.trim(),
            shift_type: editForm.shift_type
          }
        });
      }

      setEditingWorker(null);
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  if (!projectId) {
    return <p className="text-sm text-slate-500">Select a project to manage workers.</p>;
  }

  return (
    <div className="space-y-4">
      <AdminSectionHeader
        icon={Users}
        title="Project workers"
        subtitle={`Register Logistics Coordinator, Movement Center, staff, and drivers for ${activeProject?.name || 'this project'}. City: ${activeProject?.city || '—'}`}
        actions={
          <button
            type="button"
            onClick={() => setShowWorkerModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold"
          >
            <Plus className="w-4 h-4" /> Add worker
          </button>
        }
      />

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm p-3 flex flex-wrap items-center justify-between gap-2">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={load}
            className="text-xs font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Role</th>
                <th className="p-3">Email</th>
                <th className="p-3">Phone</th>
                <th className="p-3">License / shift</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workers.map((w) => {
                const drv = driverByUserId[w.id];
                const inactive = w.is_active === false;
                return (
                  <tr key={w.id} className={`hover:bg-slate-50 ${inactive ? 'opacity-60' : ''}`}>
                    <td className="p-3 font-semibold text-slate-900">
                      {w.full_name}
                      {inactive && (
                        <span className="ml-2 text-[10px] font-bold uppercase text-red-600">Inactive</span>
                      )}
                    </td>
                    <td className="p-3">{roleLabel(w.role)}</td>
                    <td className="p-3 font-mono text-slate-600">{w.email}</td>
                    <td className="p-3">{w.phone_number || '—'}</td>
                    <td className="p-3 text-slate-600 font-mono text-[11px]">
                      {w.role === 'DRIVER' && drv
                        ? `${drv.license_number} · ${driverShiftLabel(drv.shift_type)}`
                        : w.role === 'DRIVER'
                          ? 'Profile pending — refresh'
                          : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(w)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
              {workers.length === 0 && !loadError && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-500 italic">
                    No workers for this project yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showWorkerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleCreateWorker}
            className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-3 shadow-xl border border-slate-200"
          >
            <h3 className="text-lg font-bold text-slate-900">Register worker</h3>
            <label className="block text-xs font-semibold text-slate-600">
              Role
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={workerForm.role}
                onChange={(e) => setWorkerForm({ ...workerForm, role: e.target.value })}
              >
                <option value="LOGISTICS_COORDINATOR">Logistics Coordinator</option>
                <option value="MOVEMENT_CENTER">Movement Center</option>
                <option value="STAFF">Staff</option>
                <option value="DRIVER">Driver</option>
              </select>
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Full name"
              value={workerForm.full_name}
              onChange={(e) => setWorkerForm({ ...workerForm, full_name: e.target.value })}
              required
            />
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Email"
              type="email"
              value={workerForm.email}
              onChange={(e) => setWorkerForm({ ...workerForm, email: e.target.value })}
              required
            />
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Phone"
              value={workerForm.phone_number}
              onChange={(e) => setWorkerForm({ ...workerForm, phone_number: e.target.value })}
            />
            <PasswordField
              required
              minLength={8}
              placeholder="Password"
              value={workerForm.password}
              onChange={(e) => setWorkerForm({ ...workerForm, password: e.target.value })}
              inputClassName="border rounded-lg px-3 py-2 text-sm"
            />
            {workerForm.role === 'DRIVER' && (
              <>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="License number *"
                  value={workerForm.license_number}
                  onChange={(e) => setWorkerForm({ ...workerForm, license_number: e.target.value })}
                  required
                />
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={workerForm.shift_type}
                  onChange={(e) => setWorkerForm({ ...workerForm, shift_type: e.target.value })}
                >
                  {DRIVER_SHIFT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </>
            )}
            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 mt-2">
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold text-slate-700 rounded-xl hover:bg-slate-100"
                onClick={() => setShowWorkerModal(false)}
              >
                Cancel
              </button>
              <LoadingButton
                type="submit"
                loading={savingWorker}
                loadingLabel="Creating…"
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold"
              >
                Create account
              </LoadingButton>
            </div>
          </form>
        </div>
      )}

      {editingWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-3 shadow-xl border border-slate-200"
          >
            <h3 className="text-lg font-bold text-slate-900">Edit worker</h3>
            <p className="text-xs text-slate-500 font-mono">{editingWorker.email}</p>
            <label className="block text-xs font-semibold text-slate-600">
              Role
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              >
                <option value="LOGISTICS_COORDINATOR">Logistics Coordinator</option>
                <option value="MOVEMENT_CENTER">Movement Center</option>
                <option value="STAFF">Staff</option>
                <option value="DRIVER">Driver</option>
              </select>
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Full name"
              value={editForm.full_name}
              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              required
            />
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Phone"
              value={editForm.phone_number}
              onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={editForm.is_active}
                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
              />
              Account active
            </label>
            <PasswordField
              minLength={8}
              placeholder="New password (optional)"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              inputClassName="border rounded-lg px-3 py-2 text-sm"
            />
            {editForm.role === 'DRIVER' && (
              <>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="License number *"
                  value={editForm.license_number}
                  onChange={(e) => setEditForm({ ...editForm, license_number: e.target.value })}
                  required
                />
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={editForm.shift_type}
                  onChange={(e) => setEditForm({ ...editForm, shift_type: e.target.value })}
                >
                  {DRIVER_SHIFT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </>
            )}
            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 mt-2">
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold text-slate-700 rounded-xl hover:bg-slate-100"
                onClick={() => setEditingWorker(null)}
              >
                Cancel
              </button>
              <LoadingButton
                type="submit"
                loading={savingEdit}
                loadingLabel="Saving…"
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold"
              >
                Save changes
              </LoadingButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
