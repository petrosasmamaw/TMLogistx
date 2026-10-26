import { getMapboxAccessToken, mapboxForwardGeocode } from './mapbox.js';

export const FALLBACK_MAP_CENTER = [9.02, 38.75];
export const FALLBACK_MAP_LABEL = 'Default map center';
export const CITY_MAP_ZOOM = 12;
export const COUNTRY_MAP_ZOOM = 5;

/**
 * Resolve initial map center: project city → project country → fallback.
 * @param {object|null} project — expects `city`, `country: { name, code }`
 */
export async function geocodeProjectMapView(project) {
  if (!project) {
    return {
      center: FALLBACK_MAP_CENTER,
      label: FALLBACK_MAP_LABEL,
      zoom: CITY_MAP_ZOOM,
      source: 'fallback'
    };
  }

  const city = String(project.city || '').trim();
  const countryName = String(project.country?.name || '').trim();
  const countryCode = String(project.country?.code || '').trim();
  const token = getMapboxAccessToken();

  if (token && city) {
    const queries = [
      countryName ? `${city}, ${countryName}` : city,
      countryCode ? `${city}, ${countryCode}` : null
    ].filter(Boolean);

    for (const query of queries) {
      const items = await mapboxForwardGeocode(query, {
        limit: 1,
        types: 'place,locality,region,district'
      });
      if (items[0]) {
        return {
          center: [items[0].lat, items[0].lon],
          label: items[0].label,
          zoom: CITY_MAP_ZOOM,
          source: 'city'
        };
      }
    }
  }

  if (token && countryName) {
    const items = await mapboxForwardGeocode(countryName, {
      limit: 1,
      types: 'country,region'
    });
    if (items[0]) {
      return {
        center: [items[0].lat, items[0].lon],
        label: items[0].label,
        zoom: COUNTRY_MAP_ZOOM,
        source: 'country'
      };
    }
  }

  const label = city || countryName || FALLBACK_MAP_LABEL;
  return {
    center: FALLBACK_MAP_CENTER,
    label,
    zoom: city ? CITY_MAP_ZOOM : COUNTRY_MAP_ZOOM,
    source: 'fallback'
  };
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
        country: { id: c.id, name: c.name, code: c.code }
      };
    }
  }
  return raw;
}
