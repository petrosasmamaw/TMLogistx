import { getStore } from '../db/connection.js';
import { config } from '../config/index.js';
import { resolveProjectMapViewAsync, resolveProjectFromStore } from '../utils/projectMapFocus.js';
import { mapboxDrivingRouteLeaflet } from '../utils/mapboxClient.js';

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

export async function getDrivingRoute(req, res, next) {
  try {
    const fromLat = parseFloat(req.query.from_lat);
    const fromLng = parseFloat(req.query.from_lng);
    const toLat = parseFloat(req.query.to_lat);
    const toLng = parseFloat(req.query.to_lng);
    if ([fromLat, fromLng, toLat, toLng].some((v) => Number.isNaN(v))) {
      return res.status(400).json({ success: false, error: 'from_lat, from_lng, to_lat, to_lng required' });
    }
    const route = await mapboxDrivingRouteLeaflet(fromLat, fromLng, toLat, toLng);
    if (!route?.coordinates?.length) {
      return res.status(404).json({ success: false, error: 'Driving route not available' });
    }
    res.json({ success: true, data: route });
  } catch (err) {
    next(err);
  }
}
