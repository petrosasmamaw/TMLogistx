import React, { useCallback, useEffect, useState } from 'react';
import { MapPin, Plus, Users, Truck, Navigation, Edit, XCircle } from 'lucide-react';
import { apiRequest } from '../../api/client.js';
import { useMasterScope } from '../../context/MasterScopeContext.jsx';
import AdminSectionHeader from '../admin/AdminSectionHeader.jsx';
import LoadingButton from '../ui/LoadingButton.jsx';
import { TableSkeleton } from '../ui/Skeleton.jsx';

export default function MasterSitesPanel() {
  const { activeProjectId, activeProject, reload: reloadScope } = useMasterScope();
  const projectId = activeProjectId;
  const countryId = activeProject?.country_id;

  const [sites, setSites] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [siteForm, setSiteForm] = useState({ name: '', short_label: '' });
  const [savingSite, setSavingSite] = useState(false);

  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [workerMode, setWorkerMode] = useState('single'); // single | pair
  const [savingWorker, setSavingWorker] = useState(false);
  const [workerForm, setWorkerForm] = useState({
    role: 'LOGISTICS_COORDINATOR',
    site_id: '',
    full_name: '',
    email: '',
    password: '',
    phone_number: '',
    assign_site_lead: true
  });
  const [pairForm, setPairForm] = useState({
    site_id: '',
    coord_name: '',
    coord_email: '',
    coord_password: '',
    move_name: '',
    move_email: '',
    move_password: ''
  });

  const [assignModalSite, setAssignModalSite] = useState(null);
  const [leadForm, setLeadForm] = useState({
    logistics_coordinator_user_id: '',
    movement_officer_user_id: ''
  });
  const [savingLeads, setSavingLeads] = useState(false);
  const [includeClosed, setIncludeClosed] = useState(false);
  const [assigningWorkerId, setAssigningWorkerId] = useState(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const siteQuery = includeClosed ? '?include_closed=true' : '';
      const [sRes, uRes] = await Promise.all([
        apiRequest(`/projects/${projectId}/sites${siteQuery}`),
        apiRequest(`/users?project_id=${projectId}`)
      ]);
      setSites(sRes.data || []);
      setWorkers((uRes.data || []).filter((u) => u.role !== 'SYSTEM_ADMIN' && u.role !== 'MASTER_PERSON'));
    } catch {
      setSites([]);
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, includeClosed]);

  useEffect(() => {
    load();
  }, [load]);

  const coordinators = workers.filter((w) => w.role === 'LOGISTICS_COORDINATOR');
  const movementOfficers = workers.filter((w) => w.role === 'MOVEMENT_OFFICER');

  const handleCreateSite = async (e) => {
    e.preventDefault();
    setSavingSite(true);
    try {
      await apiRequest(`/projects/${projectId}/sites`, {
        method: 'POST',
        body: siteForm
      });
      setShowSiteModal(false);
      setSiteForm({ name: '', short_label: '' });
      await reloadScope();
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingSite(false);
    }
  };

  const handleCreateWorker = async (e) => {
    e.preventDefault();
    setSavingWorker(true);
    try {
      await apiRequest('/users', {
        method: 'POST',
        body: {
          ...workerForm,
          site_id: workerForm.site_id || null,
          project_id: projectId,
          country_id: countryId,
          assign_site_lead: workerForm.site_id ? workerForm.assign_site_lead : false
        }
      });
      setShowWorkerModal(false);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingWorker(false);
    }
  };

  const handleCreatePair = async (e) => {
    e.preventDefault();
    if (!pairForm.site_id) {
      alert('Select a site');
      return;
    }
    setSavingWorker(true);
    try {
      const coordRes = await apiRequest('/users', {
        method: 'POST',
        body: {
          full_name: pairForm.coord_name,
          email: pairForm.coord_email,
          password: pairForm.coord_password,
          role: 'LOGISTICS_COORDINATOR',
          project_id: projectId,
          site_id: pairForm.site_id,
          country_id: countryId,
          assign_site_lead: true
        }
      });
      const moveRes = await apiRequest('/users', {
        method: 'POST',
        body: {
          full_name: pairForm.move_name,
          email: pairForm.move_email,
          password: pairForm.move_password,
          role: 'MOVEMENT_OFFICER',
          project_id: projectId,
          site_id: pairForm.site_id,
          country_id: countryId,
          assign_site_lead: true
        }
      });
      await apiRequest(`/sites/${pairForm.site_id}/leads`, {
        method: 'PATCH',
        body: {
          logistics_coordinator_user_id: coordRes.data?.id,
          movement_officer_user_id: moveRes.data?.id,
          set_as_site_lead: true
        }
      });
      setShowWorkerModal(false);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingWorker(false);
    }
  };

  const openAssign = (site) => {
    setAssignModalSite(site);
    setLeadForm({
      logistics_coordinator_user_id: site.lead_logistics_coordinator_user_id || site.lead_logistics_coordinator?.id || '',
      movement_officer_user_id: site.lead_movement_officer_user_id || site.lead_movement_officer?.id || ''
    });
  };

  const handleCloseSite = async (site) => {
    if (!window.confirm(`Close site "${site.name}"? Workers stay active; you can reassign them to other sites.`)) return;
    try {
      await apiRequest(`/sites/${site.id}`, { method: 'PATCH', body: { is_active: false } });
      await reloadScope();
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAssignWorkerSite = async (workerId, siteId) => {
    setAssigningWorkerId(workerId);
    try {
      await apiRequest(`/users/${workerId}`, {
        method: 'PATCH',
        body: { site_id: siteId || null }
      });
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setAssigningWorkerId(null);
    }
  };

  const siteName = (siteId) => sites.find((s) => s.id === siteId)?.name || '— Unassigned —';
  const activeSites = sites.filter((s) => s.is_active !== false);

  const saveLeads = async (e) => {
    e.preventDefault();
    if (!assignModalSite) return;
    setSavingLeads(true);
    try {
      await apiRequest(`/sites/${assignModalSite.id}/leads`, {
        method: 'PATCH',
        body: {
          logistics_coordinator_user_id: leadForm.logistics_coordinator_user_id || null,
          movement_officer_user_id: leadForm.movement_officer_user_id || null,
          set_as_site_lead: true
        }
      });
      setAssignModalSite(null);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingLeads(false);
    }
  };

  if (!projectId) {
    return (
      <div className="glass-panel rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
        No assigned project in scope. Use the project switcher above, or sign out and back in if you were just assigned to a project.
      </div>
    );
  }

  if (loading) {
    return <TableSkeleton rows={6} cols={4} />;
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        icon={MapPin}
        title="Sites & worker assignment (Master Person)"
        subtitle="For your selected project: create cities/sites, onboard coordinators and movement officers, and assign site leads — coordinator only, officer only, or both."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowSiteModal(true)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> New site
            </button>
            <button
              type="button"
              onClick={() => {
                setWorkerMode('single');
                setShowWorkerModal(true);
              }}
              className="px-3 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
            >
              <Users className="w-4 h-4" /> New worker
            </button>
            <button
              type="button"
              onClick={() => {
                setWorkerMode('pair');
                setShowWorkerModal(true);
              }}
              className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
            >
              <Users className="w-4 h-4" /> Create coordinator + officer
            </button>
          </div>
        }
      />

      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={includeClosed}
          onChange={(e) => setIncludeClosed(e.target.checked)}
        />
        Show closed sites
      </label>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sites.map((site) => (
          <div
            key={site.id}
            className={`glass-panel rounded-2xl border p-4 space-y-3 ${
              site.is_active === false ? 'border-slate-300 opacity-75' : 'border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  {site.name}
                  {site.is_active === false && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      Closed
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">{site.short_label}</p>
              </div>
              <div className="flex flex-wrap gap-1 justify-end">
                {site.is_active !== false && (
                  <>
                    <button
                      type="button"
                      onClick={() => openAssign(site)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-brand-200 text-brand-700 bg-brand-50 flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" /> Assign leads
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCloseSite(site)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-rose-200 text-rose-700 bg-rose-50 flex items-center gap-1"
                    >
                      <XCircle className="w-3 h-3" /> Close site
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5">
                <div className="flex items-center gap-1 text-slate-500 font-semibold mb-1">
                  <Truck className="w-3.5 h-3.5" /> Coordinator
                </div>
                <div className="text-slate-800 font-medium">
                  {site.lead_logistics_coordinator?.full_name || '— Not assigned —'}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5">
                <div className="flex items-center gap-1 text-slate-500 font-semibold mb-1">
                  <Navigation className="w-3.5 h-3.5" /> Movement officer
                </div>
                <div className="text-slate-800 font-medium">
                  {site.lead_movement_officer?.full_name || '— Not assigned —'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80">
          <h3 className="text-sm font-bold text-slate-900">Project workers</h3>
          <p className="text-xs text-slate-500">Create without a site, then assign here. Moving coordinator or officer updates site lead and site.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="p-3 font-semibold">Name</th>
                <th className="p-3 font-semibold">Role</th>
                <th className="p-3 font-semibold">Site</th>
                <th className="p-3 font-semibold text-right">Assign site</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => (
                <tr key={w.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3 font-medium text-slate-800">{w.full_name}</td>
                  <td className="p-3 text-slate-600">{w.role.replace(/_/g, ' ')}</td>
                  <td className="p-3 text-slate-600">{siteName(w.site_id)}</td>
                  <td className="p-3 text-right">
                    <select
                      disabled={assigningWorkerId === w.id}
                      value={w.site_id || ''}
                      onChange={(e) => handleAssignWorkerSite(w.id, e.target.value)}
                      className="p-2 rounded-lg border border-slate-200 max-w-[200px]"
                    >
                      <option value="">— No site —</option>
                      {activeSites.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {workers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-500 italic">No workers yet for this project.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showSiteModal && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateSite} className="glass-panel p-5 rounded-2xl w-full max-w-md space-y-3 text-xs">
            <h3 className="font-bold text-slate-900">Create site / city</h3>
            <input
              required
              placeholder="Site name (e.g. Hawassa Outreach)"
              value={siteForm.name}
              onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
              className="w-full p-2.5 rounded-xl border"
            />
            <input
              placeholder="Short label for cards"
              value={siteForm.short_label}
              onChange={(e) => setSiteForm({ ...siteForm, short_label: e.target.value })}
              className="w-full p-2.5 rounded-xl border"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowSiteModal(false)} className="px-3 py-2 rounded-xl bg-slate-100">Cancel</button>
              <LoadingButton type="submit" loading={savingSite} loadingLabel="Creating…" className="px-3 py-2 rounded-xl bg-brand-600 text-white">
                Create site
              </LoadingButton>
            </div>
          </form>
        </div>
      )}

      {showWorkerModal && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel p-5 rounded-2xl w-full max-w-lg my-8 text-xs space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWorkerMode('single')}
                className={`px-3 py-1.5 rounded-lg font-semibold ${workerMode === 'single' ? 'bg-brand-600 text-white' : 'bg-slate-100'}`}
              >
                One worker
              </button>
              <button
                type="button"
                onClick={() => setWorkerMode('pair')}
                className={`px-3 py-1.5 rounded-lg font-semibold ${workerMode === 'pair' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}
              >
                Coordinator + officer (both)
              </button>
            </div>

            {workerMode === 'single' ? (
              <form onSubmit={handleCreateWorker} className="space-y-3">
                <select
                  value={workerForm.role}
                  onChange={(e) => setWorkerForm({ ...workerForm, role: e.target.value })}
                  className="w-full p-2.5 rounded-xl border"
                >
                  <option value="LOGISTICS_COORDINATOR">Logistics coordinator only</option>
                  <option value="MOVEMENT_OFFICER">Movement officer only</option>
                  <option value="STAFF">Staff</option>
                  <option value="DRIVER">Driver</option>
                </select>
                <select
                  value={workerForm.site_id}
                  onChange={(e) => setWorkerForm({ ...workerForm, site_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl border"
                >
                  <option value="">No site (assign later)</option>
                  {activeSites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {workerForm.site_id && ['LOGISTICS_COORDINATOR', 'MOVEMENT_OFFICER'].includes(workerForm.role) && (
                  <label className="flex items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={workerForm.assign_site_lead}
                      onChange={(e) => setWorkerForm({ ...workerForm, assign_site_lead: e.target.checked })}
                    />
                    Also set as site lead for this role
                  </label>
                )}
                <input required placeholder="Full name" value={workerForm.full_name} onChange={(e) => setWorkerForm({ ...workerForm, full_name: e.target.value })} className="w-full p-2.5 rounded-xl border" />
                <input required type="email" placeholder="Email" value={workerForm.email} onChange={(e) => setWorkerForm({ ...workerForm, email: e.target.value })} className="w-full p-2.5 rounded-xl border" />
                <input required type="password" minLength={8} value={workerForm.password} onChange={(e) => setWorkerForm({ ...workerForm, password: e.target.value })} className="w-full p-2.5 rounded-xl border" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowWorkerModal(false)} className="px-3 py-2 rounded-xl bg-slate-100">Cancel</button>
                  <LoadingButton type="submit" loading={savingWorker} loadingLabel="Creating…" className="px-3 py-2 rounded-xl bg-brand-600 text-white">Create</LoadingButton>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreatePair} className="space-y-3">
                <select
                  required
                  value={pairForm.site_id}
                  onChange={(e) => setPairForm({ ...pairForm, site_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl border"
                >
                  <option value="">Site for both roles…</option>
                  {activeSites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <p className="font-semibold text-slate-700">Logistics coordinator</p>
                <input required placeholder="Name" value={pairForm.coord_name} onChange={(e) => setPairForm({ ...pairForm, coord_name: e.target.value })} className="w-full p-2.5 rounded-xl border" />
                <input required type="email" placeholder="Email" value={pairForm.coord_email} onChange={(e) => setPairForm({ ...pairForm, coord_email: e.target.value })} className="w-full p-2.5 rounded-xl border" />
                <p className="font-semibold text-slate-700">Movement officer</p>
                <input required placeholder="Name" value={pairForm.move_name} onChange={(e) => setPairForm({ ...pairForm, move_name: e.target.value })} className="w-full p-2.5 rounded-xl border" />
                <input required type="email" placeholder="Email" value={pairForm.move_email} onChange={(e) => setPairForm({ ...pairForm, move_email: e.target.value })} className="w-full p-2.5 rounded-xl border" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowWorkerModal(false)} className="px-3 py-2 rounded-xl bg-slate-100">Cancel</button>
                  <LoadingButton type="submit" loading={savingWorker} loadingLabel="Creating…" className="px-3 py-2 rounded-xl bg-emerald-600 text-white">Create both</LoadingButton>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {assignModalSite && (
        <div className="portal-modal-backdrop fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={saveLeads} className="glass-panel p-5 rounded-2xl w-full max-w-md space-y-3 text-xs">
            <h3 className="font-bold text-slate-900">Assign site leads — {assignModalSite.name}</h3>
            <p className="text-slate-500">Pick coordinator only, movement officer only, or both (two people).</p>
            <label className="block font-medium text-slate-700">Logistics coordinator</label>
            <select
              value={leadForm.logistics_coordinator_user_id}
              onChange={(e) => setLeadForm({ ...leadForm, logistics_coordinator_user_id: e.target.value })}
              className="w-full p-2.5 rounded-xl border"
            >
              <option value="">— None —</option>
              {coordinators.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
            <label className="block font-medium text-slate-700">Movement officer</label>
            <select
              value={leadForm.movement_officer_user_id}
              onChange={(e) => setLeadForm({ ...leadForm, movement_officer_user_id: e.target.value })}
              className="w-full p-2.5 rounded-xl border"
            >
              <option value="">— None —</option>
              {movementOfficers.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAssignModalSite(null)} className="px-3 py-2 rounded-xl bg-slate-100">Cancel</button>
              <LoadingButton type="submit" loading={savingLeads} loadingLabel="Saving…" className="px-3 py-2 rounded-xl bg-brand-600 text-white">Save</LoadingButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
