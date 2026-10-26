/** Trip leg: driver heading to pickup (start) vs heading to destination (end). */
export function isHeadingToDestination(status) {
  return ['IN_TRANSIT', 'PASSENGER_PICKED_UP'].includes(String(status || '').toUpperCase());
}

export function tripRoutePhase(status) {
  if (isTripNavigationEnded(status)) return 'ended';
  return isHeadingToDestination(status) ? 'to_dest' : 'to_pickup';
}

export function isTripNavigationEnded(status) {
  return ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(String(status || '').toUpperCase());
}

/**
 * In-app map navigation copy and behavior (no external maps).
 */
export function getInAppNavigationMeta(status, mode = 'driver') {
  const s = String(status || '').toUpperCase();
  const isStaff = mode === 'staff';

  if (isTripNavigationEnded(s)) {
    return {
      phase: 'ended',
      title: 'Trip ended',
      subtitle: 'Navigation finished',
      showLiveRoute: false,
      etaLabel: 'STATUS',
      etaValue: 'Complete'
    };
  }

  if (isHeadingToDestination(s)) {
    return {
      phase: 'to_dest',
      title: isStaff ? 'Driver en route to destination' : 'Navigate to destination',
      subtitle: 'Blue line · fastest driving route',
      showLiveRoute: true,
      etaLabel: 'TO DESTINATION',
      etaValue: null
    };
  }

  if (s === 'ARRIVED') {
    return {
      phase: 'to_pickup',
      title: isStaff ? 'Driver arrived at pickup' : 'At pickup — start when ready',
      subtitle: isStaff ? 'Waiting to depart' : 'Passenger pickup point',
      showLiveRoute: false,
      etaLabel: 'AT PICKUP',
      etaValue: 'Arrived'
    };
  }

  return {
    phase: 'to_pickup',
    title: isStaff ? 'Driver en route to pickup' : 'Navigate to pickup (start)',
    subtitle: 'Blue line · fastest driving route',
    showLiveRoute: true,
    etaLabel: 'TO PICKUP',
    etaValue: null
  };
}

export function resolveNavigationTarget(trip, status) {
  const toDest = isHeadingToDestination(status);
  const targetLat = toDest ? trip?.destination_latitude : trip?.pickup_latitude;
  const targetLng = toDest ? trip?.destination_longitude : trip?.pickup_longitude;
  const targetLabel = toDest ? trip?.destination_location : trip?.pickup_location;
  return { toDest, targetLat, targetLng, targetLabel };
}

export function buildGoogleMapsDirectionsUrl(fromLat, fromLng, toLat, toLng) {
  if (fromLat == null || fromLng == null || toLat == null || toLng == null) return null;
  return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=driving`;
}
