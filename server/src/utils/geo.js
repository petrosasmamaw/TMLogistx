/**
 * Geographic Utility Module
 * Computes road distances, driving duration estimates, and arrival times
 * using Mapbox APIs with intelligent Haversine mathematical fallback.
 */

import { config } from '../config/index.js';
import { mapboxDrivingRoute, mapboxGeocodeSearch } from './mapboxClient.js';

/**
 * Calculate Great-Circle distance between two coordinates in kilometers (Haversine formula)
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return 5.0; // fallback default
  }

  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLineDistance = R * c;

  // Add 25% road curvature factor for real urban road routing
  return parseFloat((straightLineDistance * 1.25).toFixed(1));
}

/**
 * Estimate driving time in minutes based on distance and average urban traffic speed (approx 28 km/h)
 */
export function estimateDrivingDurationMins(distanceKm, averageSpeedKmH = 28) {
  if (!distanceKm || distanceKm <= 0) return 5;
  const hours = distanceKm / averageSpeedKmH;
  const minutes = Math.round(hours * 60) + 3; // +3 minutes buffer for traffic lights & stops
  return Math.max(minutes, 5);
}

/**
 * Calculate Estimated Time of Arrival (Date object) - Synchronous Haversine
 */
export function calculateEta(fromLat, fromLng, toLat, toLng, fromDate = new Date()) {
  const distanceKm = calculateDistanceKm(fromLat, fromLng, toLat, toLng);
  const durationMins = estimateDrivingDurationMins(distanceKm);
  const etaDate = new Date(fromDate.getTime() + durationMins * 60 * 1000);

  return {
    distanceKm,
    durationMins,
    etaDate,
    provider: 'HAVERSINE_ESTIMATE'
  };
}

/**
 * Live Mapbox Directions (with Haversine fallback)
 */
export async function getMapboxRoute(fromLat, fromLng, toLat, toLng) {
  if (!fromLat || !fromLng || !toLat || !toLng) {
    return calculateEta(fromLat, fromLng, toLat, toLng);
  }
  try {
    const routed = await mapboxDrivingRoute(fromLat, fromLng, toLat, toLng);
    if (routed) return routed;
  } catch (err) {
    console.warn('[Mapbox Directions] failed, falling back to Haversine:', err.message);
  }
  return calculateEta(fromLat, fromLng, toLat, toLng);
}

/** @deprecated alias */
export const getGeoapifyRoute = getMapboxRoute;

/**
 * Mapbox forward geocoding
 */
export async function geocodeLocation(addressText) {
  if (!addressText) return null;
  try {
    return await mapboxGeocodeSearch(addressText);
  } catch (err) {
    console.warn('[Mapbox Geocoding] failed:', err.message);
  }
  return null;
}

export default {
  calculateDistanceKm,
  estimateDrivingDurationMins,
  calculateEta,
  getMapboxRoute,
  getGeoapifyRoute,
  geocodeLocation
};
