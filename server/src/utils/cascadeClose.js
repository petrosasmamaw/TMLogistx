/**
 * Cascade is_active=false when admin closes country, project, or site.
 */
export function cascadeCloseSite(store, siteId) {
  const site = store.project_sites?.find((s) => s.id === siteId);
  if (!site) return;

  site.is_active = false;
  site.closed_at = new Date();
  site.updated_at = new Date();

  site.lead_logistics_coordinator_user_id = null;
  site.lead_movement_officer_user_id = null;
}

export function cascadeCloseProject(store, projectId) {
  const project = store.projects?.find((p) => p.id === projectId);
  if (!project) return;

  project.is_active = false;
  project.closed_at = new Date();
  project.updated_at = new Date();

  (store.project_sites || [])
    .filter((s) => s.project_id === projectId)
    .forEach((s) => cascadeCloseSite(store, s.id));

  store.users
    ?.filter((u) => u.project_id === projectId && u.role !== 'SYSTEM_ADMIN')
    .forEach((u) => {
      u.is_active = false;
      u.updated_at = new Date();
    });

  store.vehicles
    ?.filter((v) => v.project_id === projectId)
    .forEach((v) => {
      v.operational_status = 'INACTIVE';
      v.updated_at = new Date();
    });
}

export function cascadeCloseCountry(store, countryId) {
  const country = store.countries?.find((c) => c.id === countryId);
  if (!country) return;

  country.is_active = false;
  country.updated_at = new Date();

  (store.projects || [])
    .filter((p) => p.country_id === countryId)
    .forEach((p) => cascadeCloseProject(store, p.id));
}
