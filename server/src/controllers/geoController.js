import { getStore } from '../db/connection.js';
import { config } from '../config/index.js';
import { resolveProjectMapViewAsync, resolveProjectFromStore } from '../utils/projectMapFocus.js';

/** Public pk token for browser Mapbox tiles (never expose secret sk. tokens). */
export async function getPublicClientConfig(req, res) {
  const raw = String(config.mapboxAccessToken || '').trim();
  const mapboxPublicToken = raw.startsWith('pk.') ? raw : '';
  res.json({
    success: true,
    data: {
      mapboxPublicToken,
      mapboxStyle: process.env.MAPBOX_STYLE || 'mapbox/streets-v12',
    },
  });
}

export async function getProjectMapView(req, res, next) {
  try {
    const store = getStore();
    const { project_id: projectIdQuery } = req.query;
    let project = null;

    if (projectIdQuery) {
      project = resolveProjectFromStore(projectIdQuery, store);
    } else if (req.user?.projectId) {
      project = resolveProjectFromStore(req.user.projectId, store);
    }

    const view = await resolveProjectMapViewAsync(project, store);
    res.json({ success: true, data: view });
  } catch (err) {
    next(err);
  }
}
