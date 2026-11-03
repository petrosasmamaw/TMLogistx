import React from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { externalRideStatusLabel, isExternalRideRequest } from '../../utils/rideHelpers.js';

export default function TripRequestCard({ row }) {
  const status = isExternalRideRequest(row) ? externalRideStatusLabel(row) : row.status;
  const when = row.requested_datetime || row.created_at;
  const statusClass = isExternalRideRequest(row)
    ? 'status-ext'
    : row.status === 'PENDING'
      ? 'status-live-text'
      : 'text-brand-600';

  return (
    <article className="py-3.5 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[13px] font-semibold text-brand-600">{row.request_code || row.id}</p>
          <p className="text-sm font-bold text-ink mt-0.5">{row.staff?.full_name || 'Staff'}</p>
        </div>
        <span className={`status-dot shrink-0 ${statusClass}`}>{status}</span>
      </div>
      <div className="space-y-2 text-[13px] text-mute font-medium">
        <div className="flex gap-2">
          <MapPin className="w-4 h-4 text-mute shrink-0 mt-0.5" />
          <span className="leading-snug">{row.pickup_address || '—'}</span>
        </div>
        <div className="flex gap-2">
          <Navigation className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
          <span className="leading-snug">{row.destination_address || '—'}</span>
        </div>
      </div>
      {when && <p className="text-xs text-mute">{new Date(when).toLocaleString()}</p>}
    </article>
  );
}
