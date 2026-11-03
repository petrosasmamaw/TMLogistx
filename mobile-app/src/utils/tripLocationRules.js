const HEADING_DEST = new Set(['IN_TRANSIT', 'PASSENGER_PICKED_UP']);
const ENDED = new Set(['COMPLETED', 'CANCELLED', 'REJECTED']);

function headingToDest(status) {
  return HEADING_DEST.has(String(status || '').toUpperCase());
}

function navEnded(status) {
  return ENDED.has(String(status || '').toUpperCase());
}

export function normalizeLocationSource(src) {
  const s = String(src || '').toLowerCase();
  if (s === 'map' || s === 'gps' || s === 'manual') return s;
  return 'manual';
}

export function tripHasPickupCoords(trip) {
  const lat = trip?.pickup_latitude ?? trip?.pickup_lat;
  const lng = trip?.pickup_longitude ?? trip?.pickup_lng;
  return lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));
}

export function tripHasDestCoords(trip) {
  const lat = trip?.destination_latitude ?? trip?.destination_lat ?? trip?.dest_lat;
  const lng = trip?.destination_longitude ?? trip?.destination_lng ?? trip?.dest_lng;
  return lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));
}

export function isPickupManual(trip) {
  if (!trip) return false;
  if (normalizeLocationSource(trip.pickup_location_source) === 'manual') return true;
  return !tripHasPickupCoords(trip);
}

export function isDestManual(trip) {
  if (!trip) return false;
  if (normalizeLocationSource(trip.destination_location_source) === 'manual') return true;
  return !tripHasDestCoords(trip);
}

/** GPS odometer-style counter when map routing is incomplete (text-only leg or external). */
export function requiresRouteDistanceCounter(trip) {
  if (!trip) return false;
  if (trip.external_authorized || trip.external_provider) return false;
  return isPickupManual(trip) || isDestManual(trip);
}

export function shouldShowMovementCenterPickupPin(trip) {
  return tripHasPickupCoords(trip) && !isPickupManual(trip);
}

export function shouldShowMovementCenterDestPin(trip) {
  return tripHasDestCoords(trip) && !isDestManual(trip);
}

export function shouldShowLiveNavToPickup(trip, status) {
  const s = String(status || '').toUpperCase();
  if (navEnded(s)) return false;
  if (headingToDest(s)) return false;
  if (s === 'ARRIVED') return false;
  if (!tripHasPickupCoords(trip)) return false;
  if (isPickupManual(trip)) return false;
  return true;
}

export function shouldShowLiveNavToDest(trip, status) {
  const s = String(status || '').toUpperCase();
  if (navEnded(s)) return false;
  if (!headingToDest(s)) return false;
  if (!tripHasDestCoords(trip)) return false;
  if (isDestManual(trip)) return false;
  return true;
}

export function buildTripLocationContext(trip) {
  if (!trip) return null;
  return {
    pickup_location_source: trip.pickup_location_source,
    destination_location_source: trip.destination_location_source,
    pickup_latitude: trip.pickup_latitude ?? trip.pickup_lat,
    pickup_longitude: trip.pickup_longitude ?? trip.pickup_lng,
    destination_latitude: trip.destination_latitude ?? trip.destination_lat,
    destination_longitude: trip.destination_longitude ?? trip.destination_lng,
    external_authorized: trip.external_authorized,
    external_provider: trip.external_provider,
  };
}

export function getCoordinationMessage(trip, mode = 'staff') {
  if (!trip) return null;
  const pickupManual = isPickupManual(trip);
  const destManual = isDestManual(trip);
  if (pickupManual && !destManual) {
    return mode === 'staff'
      ? 'Start is text only — coordinator may call you. Navigation opens to destination after the driver starts the trip.'
      : 'Pickup is text only — call staff to find them. After you start the trip, map navigation to destination is available.';
  }
  if (!pickupManual && destManual) {
    return mode === 'staff'
      ? 'Destination is text only — after pickup, coordinate by phone (no map to destination).'
      : 'Navigate to the mapped start point, then call staff for the destination address.';
  }
  if (pickupManual && destManual) {
    return 'Start and destination are text only — use phone coordination. Distance is recorded from GPS during the trip.';
  }
  return null;
}
