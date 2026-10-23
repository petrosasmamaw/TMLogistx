/** Movement request was dispatched via Uber / RIDE / external taxi (not internal fleet). */
export function isExternalRideRequest(ride) {
  if (!ride) return false;
  return Boolean(
    ride.external_authorized ||
    ride.coordinator_booked_uber ||
    ride.external_provider ||
    ride.external_transport ||
    ride.external_driver_name ||
    ride.external_vehicle_plate ||
    ride.external_booking_ref ||
    (ride.external_status && !['', 'CANCELLED'].includes(String(ride.external_status))) ||
    (ride.status === 'COMPLETED' &&
      (ride.external_provider ||
        ride.external_cost != null ||
        ride.external_distance_km != null ||
        ride.external_status === 'COMPLETED'))
  );
}

/** Count for dashboard Uber / RIDE card (active + completed, not cancelled). */
export function countExternalRidesForDashboard(rides = []) {
  return countAllExternalRides(rides);
}

/** Active external rides (authorized or in progress, not cancelled). */
export function isActiveExternalRide(ride) {
  if (!isExternalRideRequest(ride)) return false;
  if (['CANCELLED', 'REJECTED'].includes(ride.status)) return false;
  if (ride.status === 'COMPLETED') return false;
  return (
    ride.status === 'EXTERNAL_AUTHORIZED' ||
    ride.status === 'IN_TRANSIT' ||
    ride.external_status === 'AUTHORIZED' ||
    ride.external_status === 'IN_TRANSIT'
  );
}

export function countActiveExternalRides(rides = []) {
  return rides.filter(isActiveExternalRide).length;
}

export function countAllExternalRides(rides = []) {
  return rides.filter(
    (r) => isExternalRideRequest(r) && !['CANCELLED', 'REJECTED'].includes(r.status)
  ).length;
}

export function matchesExternalRideFilter(ride) {
  return isExternalRideRequest(ride) && !['CANCELLED', 'REJECTED'].includes(ride.status);
}

export function externalRideStatusLabel(ride) {
  if (!isExternalRideRequest(ride)) return ride?.status || '—';
  if (ride.status === 'IN_TRANSIT' || ride.external_status === 'IN_TRANSIT') return 'UBER IN TRANSIT';
  if (ride.status === 'COMPLETED') return 'UBER COMPLETED';
  if (ride.status === 'EXTERNAL_AUTHORIZED' || ride.external_status === 'AUTHORIZED') return 'UBER / RIDE SENT';
  return ride.status;
}

export function externalRideDriverLine(ride) {
  if (!isExternalRideRequest(ride)) return null;
  const name = ride.external_driver_name || ride.external_provider || 'External taxi';
  const plate = ride.external_vehicle_plate || '';
  const model = ride.external_vehicle_model || '';
  return { name, plate, model, provider: ride.external_provider };
}
