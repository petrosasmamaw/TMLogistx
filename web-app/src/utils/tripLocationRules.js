export function normalizeLocationSource(src) {
  const s = String(src || '').toLowerCase();
  if (s === 'map' || s === 'gps' || s === 'manual') return s;
  return 'manual';
}

export function tripHasPickupCoords(trip) {
  const lat = trip?.pickup_lat ?? trip?.pickup_latitude;
  const lng = trip?.pickup_lng ?? trip?.pickup_longitude;
  return lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));
}

export function tripHasDestCoords(trip) {
  const lat = trip?.destination_lat ?? trip?.destination_latitude;
  const lng = trip?.destination_lng ?? trip?.destination_longitude;
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

export function shouldShowMovementCenterPickupPin(trip) {
  return tripHasPickupCoords(trip) && !isPickupManual(trip);
}

export function shouldShowMovementCenterDestPin(trip) {
  return tripHasDestCoords(trip) && !isDestManual(trip);
}

export function getMovementCenterCoordinationNote(trip) {
  if (!trip) return null;
  const pickupManual = isPickupManual(trip);
  const destManual = isDestManual(trip);
  if (pickupManual && !destManual) {
    return 'Staff entered start as text only — call them to confirm pickup. Map shows destination for assignment.';
  }
  if (!pickupManual && destManual) {
    return 'Destination is text only — assign using the mapped start point. Driver coordinates by phone after pickup.';
  }
  if (pickupManual && destManual) {
    return 'Start and destination are text only — call staff to assign. Driver records distance with GPS during the trip.';
  }
  return null;
}
