/**
 * Project map center: known cities (offline) → Mapbox geocode (cached).
 */
import { mapboxGeocodeSearch } from './mapboxClient.js';

export const FALLBACK_MAP_CENTER = { lat: 9.02, lng: 38.75 };
export const CITY_MAP_ZOOM = 12;
export const COUNTRY_MAP_ZOOM = 5;

/** Normalized city name → { lat, lng, zoom? } */
const KNOWN_CITY_CENTERS = {
  'addis ababa': { lat: 8.9806, lng: 38.7578, zoom: 12 },
  'bahir dar': { lat: 11.5936, lng: 37.3908, zoom: 13 },
  bishoftu: { lat: 8.7524, lng: 38.9784, zoom: 13 },
  adama: { lat: 8.54, lng: 39.27, zoom: 13 },
  nazret: { lat: 8.54, lng: 39.27, zoom: 13 },
  hawassa: { lat: 7.062, lng: 38.476, zoom: 13 },
  gondar: { lat: 12.6, lng: 37.4667, zoom: 13 },
  mekelle: { lat: 13.4967, lng: 39.4753, zoom: 13 },
  'dire dawa': { lat: 9.6, lng: 41.8661, zoom: 13 },
  jimma: { lat: 7.673, lng: 36.834, zoom: 13 },
  dessie: { lat: 11.133, lng: 39.633, zoom: 13 },
};

const geocodeCache = new Map();

function normalizeCityKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function lookupKnownCityCenter(cityName) {
  const key = normalizeCityKey(cityName);
  if (!key) return null;
  return KNOWN_CITY_CENTERS[key] || null;
}

export function resolveProjectFromStore(projectOrId, store) {
  if (!projectOrId || !store) return null;
  if (typeof projectOrId === 'object') return projectOrId;
  return store.projects?.find((p) => p.id === projectOrId) || null;
}

export function countryForProject(project, store) {
  if (!project) return null;
  if (project.country?.name) return project.country;
  if (project.country_id && store?.countries) {
    const c = store.countries.find((x) => x.id === project.country_id);
    if (c) return { id: c.id, name: c.name, code: c.code };
  }
  return null;
}

/** Synchronous center for placeholders and instant UI (known city or Ethiopia fallback). */
export function resolveProjectCityCenterSync(project, store) {
  const proj = resolveProjectFromStore(project, store);
  const city = String(proj?.city || '').trim();
  const country = countryForProject(proj, store);
  const known = lookupKnownCityCenter(city);
  if (known) {
    return {
      lat: known.lat,
      lng: known.lng,
      label: country?.name ? `${city}, ${country.name}` : city,
      zoom: known.zoom ?? CITY_MAP_ZOOM,
      source: 'city-known',
    };
  }
  if (country?.code === 'ET' || normalizeCityKey(country?.name) === 'ethiopia') {
    return {
      lat: FALLBACK_MAP_CENTER.lat,
      lng: FALLBACK_MAP_CENTER.lng,
      label: city || country.name || 'Ethiopia',
      zoom: city ? CITY_MAP_ZOOM : COUNTRY_MAP_ZOOM,
      source: 'country-default',
    };
  }
  return {
    lat: FALLBACK_MAP_CENTER.lat,
    lng: FALLBACK_MAP_CENTER.lng,
    label: city || country?.name || 'Default map center',
    zoom: CITY_MAP_ZOOM,
    source: 'fallback',
  };
}

export async function resolveProjectMapViewAsync(project, store) {
  const proj = resolveProjectFromStore(project, store);
  const city = String(proj?.city || '').trim();
  const country = countryForProject(proj, store);
  const countryName = country?.name || '';
  const countryCode = country?.code || '';

  const known = lookupKnownCityCenter(city);
  if (known) {
    return {
      center: [known.lat, known.lng],
      label: countryName ? `${city}, ${countryName}` : city,
      zoom: known.zoom ?? CITY_MAP_ZOOM,
      source: 'city-known',
    };
  }

  const cacheKey = `${city}|${countryName}|${countryCode}`.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  const queries = [
    city && countryName ? `${city}, ${countryName}` : null,
    city && countryCode ? `${city}, ${countryCode}` : null,
    city || null,
    countryName || null,
  ].filter(Boolean);

  for (const q of queries) {
    const hit = await mapboxGeocodeSearch(q);
    if (hit?.latitude != null && hit?.longitude != null) {
      const view = {
        center: [hit.latitude, hit.longitude],
        label: hit.formatted || q,
        zoom: city ? CITY_MAP_ZOOM : COUNTRY_MAP_ZOOM,
        source: 'geocoded',
      };
      geocodeCache.set(cacheKey, view);
      return view;
    }
  }

  const sync = resolveProjectCityCenterSync(proj, store);
  const view = {
    center: [sync.lat, sync.lng],
    label: sync.label,
    zoom: sync.zoom,
    source: sync.source,
  };
  geocodeCache.set(cacheKey, view);
  return view;
}
