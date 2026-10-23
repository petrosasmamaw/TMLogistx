export function haversineKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((v) => v == null || Number.isNaN(Number(v)))) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

/** Distance shown only when pickup & destination were both chosen on map (not GPS/manual). */
export function resolveMapDistanceKm(trip) {
  const pickupSrc = trip?.pickup_location_source;
  const destSrc = trip?.destination_location_source;
  if (pickupSrc === 'map' && destSrc === 'map') {
    if (trip.map_estimated_distance_km != null) return trip.map_estimated_distance_km;
    return haversineKm(
      trip.pickup_latitude ?? trip.pickup_lat,
      trip.pickup_longitude ?? trip.pickup_lng,
      trip.destination_latitude ?? trip.destination_lat,
      trip.destination_longitude ?? trip.destination_lng
    );
  }
  return null;
}

export function formatDistanceDisplay(trip) {
  const km = resolveMapDistanceKm(trip);
  if (km == null) return '—';
  return `${km} km`;
}

const GEO_KEY =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GEOAPIFY_API_KEY
    ? process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY
    : '';

export async function reverseGeocode(lat, lng) {
  if (!GEO_KEY) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  try {
    const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${GEO_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const f = data?.features?.[0];
    return f?.properties?.formatted || f?.properties?.address_line1 || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export async function geocodeAddress(text) {
  if (!text?.trim()) return null;
  if (!GEO_KEY) return null;
  try {
    const params = new URLSearchParams({ text: text.trim(), limit: '1', apiKey: GEO_KEY });
    const res = await fetch(`https://api.geoapify.com/v1/geocode/search?${params}`);
    const data = await res.json();
    const f = data?.features?.[0];
    if (!f) return null;
    const p = f.properties;
    return {
      lat: p.lat ?? f.geometry?.coordinates?.[1],
      lng: p.lon ?? f.geometry?.coordinates?.[0],
      label: p.formatted || text.trim()
    };
  } catch {
    return null;
  }
}
