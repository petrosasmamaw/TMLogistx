/** Shared known city coordinates (Ethiopia-focused logistics deployments). */
export const KNOWN_CITY_CENTERS = {
  'addis ababa': { lat: 8.9806, lng: 38.7578, zoom: 12 },
  'bahir dar': { lat: 11.5936, lng: 37.3908, zoom: 13 },
  bishoftu: { lat: 8.7524, lng: 38.9784, zoom: 13 },
  adama: { lat: 8.54, lng: 39.27, zoom: 13 },
  nazret: { lat: 8.54, lng: 39.27, zoom: 13 },
  hawassa: { lat: 7.062, lng: 38.476, zoom: 13 },
  gondar: { lat: 12.6, lng: 37.4667, zoom: 13 },
  mekelle: { lat: 13.4967, lng: 39.4753, zoom: 13 },
  'dire dawa': { lat: 9.6, lng: 41.8661, zoom: 13 },
};

export function lookupKnownCityCenter(cityName) {
  const key = String(cityName || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (!key) return null;
  return KNOWN_CITY_CENTERS[key] || null;
}
