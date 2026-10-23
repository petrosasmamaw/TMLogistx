/**
 * Haversine distance (km) with optional road factor for map-style estimates.
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2, roadFactor = 1.0) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return null;
  }
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c * roadFactor).toFixed(2));
}

/** Sum segment lengths along a GPS breadcrumb path. */
export function sumPathDistanceKm(points) {
  if (!points || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const seg = calculateDistanceKm(
      points[i - 1].latitude,
      points[i - 1].longitude,
      points[i].latitude,
      points[i].longitude,
      1.0
    );
    if (seg != null) total += seg;
  }
  return parseFloat(total.toFixed(2));
}

/** Urban road estimate between two points (straight line × 1.25). */
export function estimateMapRouteKm(lat1, lon1, lat2, lon2) {
  return calculateDistanceKm(lat1, lon1, lat2, lon2, 1.25);
}
