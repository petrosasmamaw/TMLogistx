import {
  shouldShowLiveNavToDest,
  shouldShowLiveNavToPickup,
  getCoordinationMessage,
} from './tripLocationRules';

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
export function getInAppNavigationMeta(status, mode = 'driver', trip = null) {
  const s = String(status || '').toUpperCase();
  const isStaff = mode === 'staff';
  const coordHint = trip ? getCoordinationMessage(trip, mode) : null;
  const liveToPickup = trip ? shouldShowLiveNavToPickup(trip, s) : !isHeadingToDestination(s) && s !== 'ARRIVED';
  const liveToDest = trip ? shouldShowLiveNavToDest(trip, s) : isHeadingToDestination(s);

  if (isTripNavigationEnded(s)) {
    return {
      phase: 'ended',
      title: 'Trip ended',
      subtitle: 'Navigation finished',
      showLiveRoute: false,
      etaLabel: 'STATUS',
      etaValue: 'Complete',
      coordinationHint: null,
    };
  }

  if (isHeadingToDestination(s)) {
    return {
      phase: 'to_dest',
      title: liveToDest
        ? isStaff
          ? 'Driver en route to destination'
          : 'Navigate to destination'
        : isStaff
          ? 'Trip in progress'
          : 'Coordinate destination by phone',
      subtitle: liveToDest
        ? 'Blue line · fastest driving route'
        : coordHint || 'Destination is text only — call staff passenger',
      showLiveRoute: liveToDest,
      etaLabel: liveToDest ? 'TO DESTINATION' : 'PHONE',
      etaValue: liveToDest ? null : 'No map route',
      coordinationHint: coordHint,
    };
  }

  if (s === 'ARRIVED') {
    return {
      phase: 'to_pickup',
      title: isStaff ? 'Driver arrived at pickup' : 'At pickup — start when ready',
      subtitle: isStaff ? 'Waiting to depart' : 'Passenger pickup point',
      showLiveRoute: false,
      etaLabel: 'AT PICKUP',
      etaValue: 'Arrived',
      coordinationHint: coordHint,
    };
  }

  return {
    phase: 'to_pickup',
    title: liveToPickup
      ? isStaff
        ? 'Driver en route to pickup'
        : 'Navigate to pickup (start)'
      : isStaff
        ? 'Driver assigned'
        : 'Find staff by phone',
    subtitle: liveToPickup
      ? 'Blue line · fastest driving route'
      : coordHint || 'Start is text only — call staff for location',
    showLiveRoute: liveToPickup,
    etaLabel: liveToPickup ? 'TO PICKUP' : 'PHONE',
    etaValue: liveToPickup ? null : 'No map route',
    coordinationHint: coordHint,
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
