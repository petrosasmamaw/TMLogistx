import { getMapboxAccessToken } from './mapbox.js';
import { lookupKnownCityCenter } from './knownCityCenters.js';
import { apiRequest } from '../api/client.js';

export { lookupKnownCityCenter } from './knownCityCenters.js';

export const FALLBACK_MAP_CENTER = [9.02, 38.75];
export const FALLBACK_MAP_LABEL = 'Default map center';
export const CITY_MAP_ZOOM = 12;
export const COUNTRY_MAP_ZOOM = 5;

const mapViewCache = new Map();

/** Instant center when project city is in our registry (no network). */
export function getInstantProjectMapView(project) {
  if (!project) return null;
  const city = String(project.city || '').trim();
  const countryName = String(project.country?.name || '').trim();
  const known = lookupKnownCityCenter(city);
  if (!known) return null;
  return {
    center: [known.lat, known.lng],
    label: countryName ? `${city}, ${countryName}` : city,
    zoom: known.zoom ?? CITY_MAP_ZOOM,
    source: 'city-known',
  };
}

export async function geocodeProjectMapView(project) {
  if (!project) {
    return {
      center: FALLBACK_MAP_CENTER,
      label: FALLBACK_MAP_LABEL,
      zoom: CITY_MAP_ZOOM,
      source: 'fallback',
    };
  }

  const cacheKey = projectCacheKey(project);
  if (mapViewCache.has(cacheKey)) {
    return mapViewCache.get(cacheKey);
  }

  const instant = getInstantProjectMapView(project);
  if (instant) {
    mapViewCache.set(cacheKey, instant);
    return instant;
  }

  try {
    const q = project.id ? `?project_id=${encodeURIComponent(project.id)}` : '';
    const res = await apiRequest(`/geo/project-map-view${q}`);
    if (res.data?.center?.length === 2) {
      mapViewCache.set(cacheKey, res.data);
      return res.data;
    }
  } catch {
    /* fall through */
  }

  const clientToken = getMapboxAccessToken();
  if (clientToken && project.city) {
    const { mapboxForwardGeocode } = await import('./mapbox.js');
    const city = String(project.city).trim();
    const countryName = String(project.country?.name || '').trim();
    const queries = [
      countryName ? `${city}, ${countryName}` : city,
      project.country?.code ? `${city}, ${project.country.code}` : null,
    ].filter(Boolean);
    for (const query of queries) {
      const items = await mapboxForwardGeocode(query, {
        limit: 1,
        types: 'place,locality,region,district',
      });
      if (items[0]) {
        const view = {
          center: [items[0].lat, items[0].lon],
          label: items[0].label,
          zoom: CITY_MAP_ZOOM,
          source: 'geocoded',
        };
        mapViewCache.set(cacheKey, view);
        return view;
      }
    }
  }

  const city = String(project.city || '').trim();
  const countryName = String(project.country?.name || '').trim();
  return {
    center: FALLBACK_MAP_CENTER,
    label: city || countryName || FALLBACK_MAP_LABEL,
    zoom: city ? CITY_MAP_ZOOM : COUNTRY_MAP_ZOOM,
    source: 'fallback',
  };
}

function projectCacheKey(project) {
  return `${project.id}|${project.city}|${project.country?.id || ''}`;
}

export function pickProjectForUser(projects, projectId, countries = []) {
  if (!projectId || !Array.isArray(projects)) return null;
  const raw = projects.find((p) => p.id === projectId);
  if (!raw) return null;
  if (raw.country?.name) return raw;
  if (raw.country_id && countries.length) {
    const c = countries.find((x) => x.id === raw.country_id);
    if (c) {
      return {
        ...raw,
        country: { id: c.id, name: c.name, code: c.code },
      };
    }
  }
  return raw;
}
