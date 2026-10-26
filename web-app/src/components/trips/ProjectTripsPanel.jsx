import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Car, Navigation, TrendingUp } from 'lucide-react';
import { apiRequest } from '../../api/client.js';
import AdminStatCard from '../admin/AdminStatCard.jsx';
import { TableSkeleton } from '../ui/Skeleton.jsx';
import {
  countExternalRidesForDashboard,
  matchesExternalRideFilter,
  externalRideStatusLabel,
  isExternalRideRequest
} from '../../utils/rideHelpers.js';
import TripRequestCard from './TripRequestCard.jsx';
import { mergeRequestRows, PROJECT_REQUEST_UPSERT } from '../../utils/mergeRequests.js';

export default function ProjectTripsPanel({ projectId }) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [rideFilter, setRideFilter] = useState('ALL');

  const load = useCallback(async () => {
    if (!projectId) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest(`/requests?project_id=${projectId}`);
      setRequests((prev) => mergeRequestRows(prev, res.data || []));
    } catch {
      /* keep prior list */
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const onUpsert = (event) => {
      const req = event.detail?.request;
      if (!req?.id || String(req.project_id) !== String(projectId)) return;
      setRequests((prev) => mergeRequestRows(prev, [req]));
      setLoading(false);
    };
    window.addEventListener(PROJECT_REQUEST_UPSERT, onUpsert);
    return () => window.removeEventListener(PROJECT_REQUEST_UPSERT, onUpsert);
  }, [projectId]);

  const rideStats = useMemo(
    () => ({
      all: requests.length,
      pending: requests.filter((r) => r.status === 'PENDING').length,
      active: requests.filter((r) =>
        ['ASSIGNED', 'IN_TRANSIT', 'EXTERNAL_AUTHORIZED', 'ACCEPTED', 'HEADING_TO_PICKUP', 'ARRIVED'].includes(
          r.status
        )
      ).length,
      external: countExternalRidesForDashboard(requests),
      completed: requests.filter((r) => r.status === 'COMPLETED').length
    }),
    [requests]
  );

  const filteredRides = useMemo(() => {
    if (rideFilter === 'ALL') return requests;
    if (rideFilter === 'EXTERNAL') return requests.filter(matchesExternalRideFilter);
    if (rideFilter === 'ACTIVE') {
      return requests.filter((r) =>
        ['ASSIGNED', 'IN_TRANSIT', 'EXTERNAL_AUTHORIZED', 'ACCEPTED', 'HEADING_TO_PICKUP', 'ARRIVED'].includes(
          r.status
        )
      );
    }
    return requests.filter((r) => r.status === rideFilter);
  }, [requests, rideFilter]);

  const tableRows =
    rideFilter === 'ACTIVE'
      ? filteredRides.filter((r) =>
          ['ASSIGNED', 'IN_TRANSIT', 'EXTERNAL_AUTHORIZED', 'ACCEPTED', 'HEADING_TO_PICKUP', 'ARRIVED'].includes(
            r.status
          )
        )
      : rideFilter === 'ALL'
        ? requests
        : filteredRides;

  if (!projectId) {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-4">
        Your account is not linked to a project. Ask your master person or admin to assign a project.
      </p>
    );
  }

  if (loading && requests.length === 0) {
    return <TableSkeleton rows={8} cols={5} />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        <AdminStatCard
          icon={TrendingUp}
          label="All"
          value={rideStats.all}
          tone="brand"
          active={rideFilter === 'ALL'}
          onClick={() => setRideFilter('ALL')}
        />
        <AdminStatCard
          icon={Car}
          label="Pending"
          value={rideStats.pending}
          tone="amber"
          active={rideFilter === 'PENDING'}
          onClick={() => setRideFilter('PENDING')}
        />
        <AdminStatCard
          icon={Navigation}
          label="Active"
          value={rideStats.active}
          tone="blue"
          active={rideFilter === 'ACTIVE'}
          onClick={() => setRideFilter('ACTIVE')}
        />
        <AdminStatCard
          icon={Navigation}
          label="Uber / RIDE"
          value={rideStats.external}
          tone="rose"
          active={rideFilter === 'EXTERNAL'}
          onClick={() => setRideFilter('EXTERNAL')}
        />
        <AdminStatCard
          icon={Car}
          label="Completed"
          value={rideStats.completed}
          tone="emerald"
          active={rideFilter === 'COMPLETED'}
          onClick={() => setRideFilter('COMPLETED')}
        />
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900">Movement requests</span>
          <button
            type="button"
            onClick={load}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            Refresh
          </button>
        </div>
        <div className="portal-mobile-only portal-data-cards">
          {tableRows.length === 0 ? (
            <p className="p-6 text-center text-slate-500 italic text-sm">No trips match this filter.</p>
          ) : (
            tableRows.map((r) => <TripRequestCard key={r.id} row={r} />)
          )}
        </div>
        <div className="portal-table-scroll hidden lg:block">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Staff</th>
              <th className="p-3">Pickup</th>
              <th className="p-3">Destination</th>
              <th className="p-3">Status</th>
              <th className="p-3">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tableRows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="p-3 font-mono text-brand-600 font-bold">{r.request_code || r.id}</td>
                <td className="p-3">{r.staff?.full_name || '—'}</td>
                <td className="p-3 max-w-[140px] truncate">{r.pickup_address || '—'}</td>
                <td className="p-3 max-w-[160px] truncate">{r.destination_address || '—'}</td>
                <td className="p-3">
                  {isExternalRideRequest(r) ? externalRideStatusLabel(r) : r.status}
                </td>
                <td className="p-3 text-slate-500 whitespace-nowrap">
                  {r.requested_datetime || r.created_at
                    ? new Date(r.requested_datetime || r.created_at).toLocaleString()
                    : '—'}
                </td>
              </tr>
            ))}
            {tableRows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500 italic">
                  No trips match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
