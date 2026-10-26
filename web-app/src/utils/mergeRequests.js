/** Merge request rows by id; incoming fields win. Newest created_at first. */
export function mergeRequestRows(existing = [], incoming = []) {
  const byId = new Map();
  for (const row of existing) {
    if (row?.id) byId.set(row.id, row);
  }
  for (const row of incoming) {
    if (!row?.id) continue;
    const prev = byId.get(row.id);
    byId.set(row.id, prev ? { ...prev, ...row } : row);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.created_at || b.requested_datetime || 0) - new Date(a.created_at || a.requested_datetime || 0)
  );
}

export const PROJECT_REQUEST_UPSERT = 'tmlogistx:request-upsert';
export const PROJECT_REQUESTS_REFRESH = 'tmlogistx:requests-refresh';

export function broadcastRequestUpsert(request) {
  if (typeof window === 'undefined' || !request?.id) return;
  window.dispatchEvent(new CustomEvent(PROJECT_REQUEST_UPSERT, { detail: { request } }));
}

export function broadcastRequestsRefresh(projectId, requests) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(PROJECT_REQUESTS_REFRESH, { detail: { projectId, requests } })
  );
}
