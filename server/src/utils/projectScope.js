import { getStore } from '../db/connection.js';

/** User ids tied to a project (user.project_id or driver profile project). */
export function collectUserIdsForProject(store, projectId) {
  const ids = new Set();
  if (!projectId) return ids;
  for (const u of store.users || []) {
    if (u.project_id === projectId) ids.add(u.id);
  }
  for (const d of store.drivers || []) {
    if (d.project_id === projectId && d.user_id) ids.add(d.user_id);
  }
  return ids;
}

export function userBelongsToProject(store, user, projectId) {
  if (!user || !projectId) return false;
  if (user.project_id === projectId) return true;
  const drv = store.drivers?.find((d) => d.user_id === user.id);
  return drv?.project_id === projectId;
}

/** Project id for the authenticated user (JWT may be stale — prefer live store). */
export function getRequesterProjectId(reqUser, store = getStore()) {
  if (!reqUser) return null;
  const live = store.users?.find((u) => u.id === reqUser.userId);
  return live?.project_id || reqUser.projectId || reqUser.project_id || null;
}

export function getAuthorizedProjectIds(reqUser) {
  const store = getStore();
  if (reqUser.role === 'SYSTEM_ADMIN') {
    return store.projects.map((p) => p.id);
  }
  if (reqUser.role === 'MASTER_PERSON') {
    const assignedIds =
      store.master_person_projects
        ?.filter((m) => m.user_id === reqUser.userId)
        .map((m) => m.project_id) || [];
    const primary = getRequesterProjectId(reqUser, store);
    return [...new Set([primary, ...assignedIds].filter(Boolean))];
  }
  const pid = getRequesterProjectId(reqUser, store);
  return pid ? [pid] : [];
}

export function isProjectAuthorized(reqUser, projectId) {
  if (!projectId) return true;
  if (reqUser.role === 'SYSTEM_ADMIN') return true;
  return getAuthorizedProjectIds(reqUser).includes(projectId);
}

/** Sites removed — project-level scope only; ignore site_id filters. */
export function filterBySiteId(records, _siteId) {
  return records;
}

export function siteBelongsToProject() {
  return true;
}
