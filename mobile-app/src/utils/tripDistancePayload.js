import { estimateMapRouteKm } from './distance.js';
import { requiresRouteDistanceCounter } from './tripLocationRules.js';

/** Distance fields sent when driver completes a trip (GPS path / map / manual override). */
export function buildDistanceCompletionPayload(driveSession, manualMode, manualKmText, trip) {
  const manualVal = parseFloat(String(manualKmText).replace(',', '.'));
  const gpsKm = driveSession?.gpsTrackedKm || 0;
  const mapFromSession = driveSession?.mapEstimatedKm;
  const pickupLat = trip?.pickup_latitude ?? trip?.pickup_lat;
  const pickupLng = trip?.pickup_longitude ?? trip?.pickup_lng;
  const destLat = trip?.destination_latitude ?? trip?.destination_lat;
  const destLng = trip?.destination_longitude ?? trip?.destination_lng;
  const mapFromTrip =
    pickupLat != null && destLat != null
      ? estimateMapRouteKm(pickupLat, pickupLng, destLat, destLng)
      : null;
  const mapKm = mapFromSession ?? mapFromTrip ?? null;
  const needsRouteCounter = requiresRouteDistanceCounter(trip);

  if (manualMode && !Number.isNaN(manualVal) && manualVal > 0) {
    return {
      distance_source: 'MANUAL',
      manual_distance_km: manualVal,
      gps_tracked_distance_km: gpsKm,
      map_estimated_distance_km: mapKm,
      actual_distance_km: manualVal,
      drive_start_lat: driveSession?.startLat,
      drive_start_lng: driveSession?.startLng,
      drive_end_lat: driveSession?.endLat,
      drive_end_lng: driveSession?.endLng,
    };
  }

  const ended = !!driveSession?.isEnded;
  const gpsThreshold = needsRouteCounter ? 0.05 : 0.1;
  const useGps = ended && gpsKm > gpsThreshold;

  if (needsRouteCounter) {
    return {
      distance_source: useGps ? 'GPS_TRACKED' : 'MAP_ESTIMATE',
      gps_tracked_distance_km: gpsKm,
      map_estimated_distance_km: mapKm,
      manual_distance_km: null,
      actual_distance_km: useGps ? gpsKm : mapKm ?? gpsKm,
      drive_start_lat: driveSession?.startLat,
      drive_start_lng: driveSession?.startLng,
      drive_end_lat: driveSession?.endLat,
      drive_end_lng: driveSession?.endLng,
    };
  }

  const finalKm = useGps ? gpsKm : mapKm ?? gpsKm;
  return {
    distance_source: useGps ? 'GPS_TRACKED' : 'MAP_ESTIMATE',
    gps_tracked_distance_km: gpsKm,
    map_estimated_distance_km: mapKm,
    manual_distance_km: null,
    actual_distance_km: finalKm,
    drive_start_lat: driveSession?.startLat,
    drive_start_lng: driveSession?.startLng,
    drive_end_lat: driveSession?.endLat,
    drive_end_lng: driveSession?.endLng,
  };
}
