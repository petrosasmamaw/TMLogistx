import { getAuthorizedProjectIds } from './projectScope.js';

function enrichProjectRow(store, project) {
  const countryMeta = project.country_id
    ? store.countries.find((c) => c.id === project.country_id)
    : null;
  const sites = (store.project_sites || [])
    .filter((s) => s.project_id === project.id && s.is_active !== false)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  return {
    ...project,
    country: countryMeta ? { id: countryMeta.id, name: countryMeta.name, code: countryMeta.code } : null,
    sites
  };
}

/**
 * In-memory dev store can lose projects after restart while JWT still references them.
 * If the master is authorized for projectId, ensure a project row exists before site mutations.
 */
export function ensureProjectInStore(store, projectId, reqUser) {
  if (!projectId) return null;

  let project = store.projects?.find((p) => p.id === projectId);
  if (project) {
    return project;
  }

  const authorized = getAuthorizedProjectIds(reqUser);
  if (!authorized.includes(projectId)) return null;

  const user = store.users?.find((u) => u.id === reqUser.userId);
  const countryId = user?.country_id || reqUser.countryId || null;

  project = {
    id: projectId,
    country_id: countryId,
    name: user?.project_name || `Assigned project (${projectId.slice(-6)})`,
    code: projectId.replace(/^proj-?/i, '').slice(0, 12).toUpperCase() || 'PROJ',
    description: 'Project restored for master person scope',
    allow_vehicle_sharing: true,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  };

  if (!store.projects) store.projects = [];
  store.projects.push(project);

  if (!store.master_person_projects) store.master_person_projects = [];
  const hasLink = store.master_person_projects.some(
    (m) => m.user_id === reqUser.userId && m.project_id === projectId
  );
  if (!hasLink) {
    store.master_person_projects.push({
      id: `mpp-restored-${projectId.slice(-6)}`,
      user_id: reqUser.userId,
      project_id: projectId
    });
  }

  return project;
}

/** Master scope: always return rows for every authorized project id (restore stubs if needed). */
export function listMasterAuthorizedProjects(store, reqUser) {
  const ids = getAuthorizedProjectIds(reqUser);
  const rows = [];
  for (const projectId of ids) {
    const project =
      ensureProjectInStore(store, projectId, reqUser) ||
      store.projects?.find((p) => p.id === projectId);
    if (project && project.is_active !== false) {
      rows.push(enrichProjectRow(store, project));
    }
  }
  return rows;
}
