/** Driver assignment pipeline — higher rank = further along (never downgrade on merge). */
export const DRIVER_STATUS_RANK = {
  ASSIGNED: 10,
  ACCEPTED: 20,
  HEADING_TO_PICKUP: 30,
  ARRIVED: 40,
  PASSENGER_PICKED_UP: 50,
  IN_TRANSIT: 60,
  COMPLETED: 70,
  REJECTED: 0,
  CANCELLED: 0
};

export const DRIVER_ACTIVE_STATUSES = [
  'ASSIGNED',
  'ACCEPTED',
  'HEADING_TO_PICKUP',
  'ARRIVED',
  'PASSENGER_PICKED_UP',
  'IN_TRANSIT'
];

export function driverStatusRank(status) {
  return DRIVER_STATUS_RANK[String(status || '').toUpperCase()] ?? 0;
}

export function pickHigherDriverStatus(a, b) {
  return driverStatusRank(a) >= driverStatusRank(b) ? a : b;
}

export function mergeDriverAssignmentRecord(prev, incoming, serverAuthoritative = false) {
  if (!incoming) return prev;
  if (!prev) return incoming;
  const status = serverAuthoritative
    ? incoming.status
    : pickHigherDriverStatus(prev.status, incoming.status);
  return { ...prev, ...incoming, status };
}

/** API refresh: server status wins (avoids stale optimistic COMPLETED). */
export function mergeDriverAssignmentListsFromServer(existing = [], incoming = []) {
  const byId = new Map();
  for (const r of incoming) {
    const key = assignmentKeyFromRow(r);
    if (key) byId.set(key, r);
  }
  for (const r of existing) {
    const key = assignmentKeyFromRow(r);
    if (!key || byId.has(key)) continue;
    if (r.status === 'ASSIGNED' && r.created_at) {
      const ts = new Date(r.created_at).getTime();
      if (Date.now() - ts < 3 * 60 * 1000) byId.set(key, r);
    }
  }
  return Array.from(byId.values())
    .filter((t) => t?.status !== 'COMPLETED')
    .sort(
      (a, b) =>
        new Date(b.pickup_datetime || b.created_at || 0) -
        new Date(a.pickup_datetime || a.created_at || 0)
    );
}

function assignmentKeyFromRow(r) {
  return r?.assignment_id || r?.id;
}
