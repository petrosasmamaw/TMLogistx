import React from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { externalRideStatusLabel, isExternalRideRequest } from '../../utils/rideHelpers.js';

export default function TripRequestCard({ row }) {
  const status = isExternalRideRequest(row) ? externalRideStatusLabel(row) : row.status;
  const when = row.requested_datetime || row.created_at;

  return (
    <article className="p-4 space-y-3 active:bg-slate-50">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-bold text-brand-600">{row.request_code || row.id}</p>
          <p className="text-sm font-semibold text-slate-900 mt-0.5">{row.staff?.full_name || 'Staff'}</p>
        </div>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg bg-slate-100 text-slate-700">
          {status}
        </span>
      </div>
      <div className="space-y-2 text-xs text-slate-600">
        <div className="flex gap-2">
          <MapPin className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
          <span className="leading-snug">{row.pickup_address || '—'}</span>
        </div>
        <div className="flex gap-2">
          <Navigation className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span className="leading-snug">{row.destination_address || '—'}</span>
        </div>
      </div>
      {when && (
        <p className="text-[11px] text-slate-400">{new Date(when).toLocaleString()}</p>
      )}
    </article>
  );
}
