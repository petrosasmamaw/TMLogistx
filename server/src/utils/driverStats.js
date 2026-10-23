const ON_TIME_GRACE_MS = 15 * 60 * 1000;

function assignmentDistanceKm(store, assignment) {
  const km = parseFloat(assignment.actual_distance_km);
  if (!Number.isNaN(km) && km > 0) return km;
  const req = store.movement_requests?.find((r) => r.id === assignment.request_id);
  const ext = parseFloat(req?.external_distance_km);
  if (!Number.isNaN(ext) && ext > 0) return ext;
  const est = parseFloat(assignment.estimated_distance_km ?? req?.map_estimated_distance_km);
  if (!Number.isNaN(est) && est > 0) return est;
  return 0;
}

function isPickupOnTime(store, assignment) {
  const req = store.movement_requests?.find((r) => r.id === assignment.request_id);
  const target = assignment.estimated_pickup_time || req?.requested_datetime;
  const actual = assignment.actual_pickup_time || assignment.actual_start_time;
  if (!target || !actual) return null;
  const diff = new Date(actual).getTime() - new Date(target).getTime();
  return diff <= ON_TIME_GRACE_MS;
}

export function computeDriverPerformance(store, driverRecord) {
  if (!driverRecord) {
    return {
      trips_completed: 0,
      on_time_rate_pct: null,
      total_distance_km: 0,
      staff_rating: 5.0,
      vehicle: null,
      completed_movements: []
    };
  }

  const assignments = (store.trip_assignments || []).filter((a) => a.driver_id === driverRecord.id);
  const completed = assignments.filter((a) => a.status === 'COMPLETED');

  let onTimeCount = 0;
  let onTimeMeasurable = 0;
  for (const a of completed) {
    const onTime = isPickupOnTime(store, a);
    if (onTime === null) continue;
    onTimeMeasurable += 1;
    if (onTime) onTimeCount += 1;
  }

  const onTimeRate =
    onTimeMeasurable > 0 ? Math.round((onTimeCount / onTimeMeasurable) * 1000) / 10 : null;

  const totalDistance = Math.round(
    completed.reduce((acc, a) => acc + assignmentDistanceKm(store, a), 0) * 10
  ) / 10;

  const tripsCompleted = Math.max(
    completed.length,
    Number(driverRecord.total_trips_completed) || 0
  );

  const vehicle = driverRecord.assigned_vehicle_id
    ? store.vehicles?.find((v) => v.id === driverRecord.assigned_vehicle_id)
    : null;

  const completedMovements = completed
    .map((a) => {
      const req = store.movement_requests?.find((r) => r.id === a.request_id);
      const km = assignmentDistanceKm(store, a);
      return {
        id: a.id,
        request_id: a.request_id,
        request_number: req?.request_code || a.request_id,
        pickup_location: req?.pickup_address || '',
        destination_location: req?.destination_address || '',
        pickup_datetime: req?.requested_datetime || a.created_at,
        completed_at: a.actual_completion_time || a.updated_at || a.created_at,
        distance_km: km > 0 ? km : null,
        status: a.status
      };
    })
    .sort(
      (a, b) =>
        new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
    );

  return {
    trips_completed: tripsCompleted,
    on_time_rate_pct: onTimeRate,
    total_distance_km: totalDistance,
    staff_rating: driverRecord.rating != null ? Number(driverRecord.rating) : 5.0,
    vehicle: vehicle
      ? {
          id: vehicle.id,
          make: vehicle.make,
          model: vehicle.model,
          plate_number: vehicle.plate_number,
          operational_status: vehicle.operational_status || 'AVAILABLE'
        }
      : null,
    completed_movements: completedMovements
  };
}

export function vehicleStatusLabel(operationalStatus) {
  switch (operationalStatus) {
    case 'BUSY':
      return 'ON TRIP';
    case 'MAINTENANCE':
      return 'MAINTENANCE';
    case 'OUT_OF_SERVICE':
      return 'OUT OF SERVICE';
    case 'AVAILABLE':
    default:
      return 'IN SERVICE';
  }
}
