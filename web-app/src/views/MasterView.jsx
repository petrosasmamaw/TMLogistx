import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../api/client.js';
import {
  UserCheck,
  Users,
  Car,
  DollarSign,
  Truck,
  AlertTriangle
} from 'lucide-react';
import { usePortalNav } from '../context/PortalNavContext.jsx';
import { useMasterScope } from '../context/MasterScopeContext.jsx';
import { StatCardsSkeleton, TableSkeleton } from '../components/ui/Skeleton.jsx';
import AdminSectionHeader from '../components/admin/AdminSectionHeader.jsx';
import AdminStatCard from '../components/admin/AdminStatCard.jsx';
import MasterScopeBar from '../components/master/MasterScopeBar.jsx';
import MasterWorkersPanel from '../components/master/MasterWorkersPanel.jsx';
import ProjectTripsPanel from '../components/trips/ProjectTripsPanel.jsx';

export default function MasterView() {
  const { section: activeTab } = usePortalNav();
  const { loading: scopeLoading, activeProject, scopeQuery, activeProjectId } = useMasterScope();

  const [dataLoading, setDataLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [personalFuel, setPersonalFuel] = useState([]);
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [accidents, setAccidents] = useState([]);

  const qs = scopeQuery ? `?${scopeQuery}` : '';

  const loadData = useCallback(async () => {
    if (!activeProjectId) return;
    setDataLoading(true);
    try {
      const [uRes, vRes, dRes, rRes, eRes, pfRes, aRes] = await Promise.all([
        apiRequest(`/users${qs}`),
        apiRequest(`/vehicles${qs}`),
        apiRequest(`/drivers${qs}`),
        apiRequest(`/requests${qs}`),
        apiRequest(`/expenses/summary?project_id=${activeProjectId}`),
        apiRequest(`/personal-fuel${qs}`),
        apiRequest(`/accidents?project_id=${activeProjectId}`)
      ]);
      setUsers(uRes.data || []);
      setVehicles(vRes.data || []);
      setDrivers(dRes.data || []);
      setRequests(rRes.data || []);
      setExpenseSummary(eRes.data || null);
      setPersonalFuel(pfRes.data || []);
      setAccidents(aRes.data || []);
    } catch {
      /* keep prior */
    } finally {
      setDataLoading(false);
    }
  }, [qs, activeProjectId]);

  useEffect(() => {
    if (!scopeLoading && activeProjectId) {
      loadData();
    }
  }, [scopeLoading, activeProjectId, loadData, activeTab]);

  const projectWorkers = users.filter((u) => u.role !== 'MASTER_PERSON' && u.role !== 'SYSTEM_ADMIN');

  if (scopeLoading) {
    return (
      <div className="portal-page">
        <StatCardsSkeleton count={4} />
        <TableSkeleton rows={6} cols={5} />
      </div>
    );
  }

  if (activeTab === 'workers') {
    return (
      <div className="portal-page">
        <MasterScopeBar />
        <MasterWorkersPanel />
      </div>
    );
  }

  const sectionTitles = {
    overview: {
      title: 'Project overview',
      subtitle: 'Your assigned project scope (no platform-wide policies). Switch city/site to focus operations.'
    },
    rides: { title: 'Trips', subtitle: 'All movement requests in your project scope.' },
    fleet: {
      title: 'Fleet (view only)',
      subtitle: 'Read-only vehicle list. Register vehicles and drivers under Logistics Coordinator.'
    },
    'personal-fuel': { title: 'Personal fuel', subtitle: 'Staff personal-use fuel recoveries.' }
  };

  const meta = sectionTitles[activeTab] || sectionTitles.overview;

  return (
    <div className="portal-page">
      <AdminSectionHeader
        icon={UserCheck}
        title={meta.title}
        subtitle={meta.subtitle}
      />

      <MasterScopeBar />

      {dataLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <AdminStatCard icon={Users} label="Workers" value={projectWorkers.length} tone="brand" />
                <AdminStatCard icon={Car} label="Trips" value={requests.length} tone="purple" />
                <AdminStatCard icon={Truck} label="Vehicles" value={vehicles.length} tone="blue" />
                <AdminStatCard
                  icon={DollarSign}
                  label="Expenses (ETB)"
                  value={expenseSummary?.totalSpent != null ? expenseSummary.totalSpent.toLocaleString() : '—'}
                  tone="amber"
                />
              </div>
              <p className="text-xs text-slate-500">
                Use the sidebar for trips, workers, fleet, and personal fuel — limited to
                your assigned project{activeProject?.country?.name ? ` (${activeProject.country.name})` : ''}.
              </p>
            </div>
          )}

          {activeTab === 'rides' && <ProjectTripsPanel projectId={activeProjectId} />}

          {activeTab === 'fleet' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <AdminStatCard icon={Truck} label="Vehicles" value={vehicles.length} tone="blue" />
                <AdminStatCard icon={Users} label="Drivers" value={drivers.length} tone="emerald" />
              </div>
              <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
                <div className="p-3 border-b text-sm font-bold">Vehicles</div>
                <div className="portal-table-scroll overflow-x-auto lg:overflow-visible">
                <table className="w-full text-left text-xs min-w-[320px]">
                  <thead className="bg-slate-50 uppercase text-slate-500">
                    <tr>
                      <th className="p-3">Plate</th>
                      <th className="p-3">Model</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehicles.map((v) => (
                      <tr key={v.id}>
                        <td className="p-3 font-mono font-bold">{v.plate_number}</td>
                        <td className="p-3">{v.make} {v.model}</td>
                        <td className="p-3">{v.operational_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'accidents' && (
            <div className="space-y-4">
              <AdminStatCard icon={AlertTriangle} label="Incident reports" value={accidents.length} tone="rose" />
              <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
                <div className="p-3 border-b text-sm font-bold text-slate-900">Driver &amp; field accidents</div>
                {accidents.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500 text-center">No incidents reported for this project.</p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 uppercase text-slate-500">
                      <tr>
                        <th className="p-3">When</th>
                        <th className="p-3">Vehicle</th>
                        <th className="p-3">Driver</th>
                        <th className="p-3">Severity</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {accidents.map((acc) => (
                        <tr key={acc.id}>
                          <td className="p-3">{new Date(acc.created_at || acc.accident_date).toLocaleString()}</td>
                          <td className="p-3 font-mono">{acc.vehicle_plate}</td>
                          <td className="p-3">{acc.driver_name}</td>
                          <td className="p-3">{acc.severity}</td>
                          <td className="p-3">{acc.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === 'personal-fuel' && (
            <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Staff</th>
                    <th className="p-3">Amount (ETB)</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {personalFuel.map((row) => (
                    <tr key={row.id}>
                      <td className="p-3">{row.staff_name || row.staff?.full_name || '—'}</td>
                      <td className="p-3">{row.amount_billed_etb ?? row.total_amount_due ?? '—'}</td>
                      <td className="p-3">{row.settlement_status || row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

    </div>
  );
}
