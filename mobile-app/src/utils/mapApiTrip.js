const FLOW_ORDER = [
  'PENDING',
  'ASSIGNED',
  'ACCEPTED',
  'HEADING_TO_PICKUP',
  'ARRIVED',
  'IN_TRANSIT',
  'PASSENGER_PICKED_UP',
  'COMPLETED'
];

export function flowRank(s) {
  const i = FLOW_ORDER.indexOf(String(s || '').toUpperCase());
  return i >= 0 ? i : -1;
}

/** Single status for staff UI: request + assignment (COMPLETED wins over IN_TRANSIT). */
export function resolveMobileTripStatus(requestStatus, assignmentStatus) {
  const req = String(requestStatus || '').toUpperCase();
  const asn = String(assignmentStatus || '').toUpperCase();
  const terminal = new Set(['COMPLETED', 'CANCELLED', 'REJECTED']);
  if (terminal.has(req)) return req;
  if (terminal.has(asn)) return asn;
  if (req === 'EXTERNAL_AUTHORIZED') return req;
  if (flowRank(asn) > flowRank(req)) return asn;
  if (flowRank(asn) >= 0 && flowRank(req) < 0) return asn;
  return req || asn || 'PENDING';
}

export function normalizeAssignmentForMobileMap(assignment) {
  if (!assignment) return null;
  return {
    id: assignment.id,
    status: assignment.status,
    staff_meter_started_at: assignment.staff_meter_started_at,
    staff_meter_ended_at: assignment.staff_meter_ended_at,
    actual_distance_km: assignment.actual_distance_km,
    distance_source: assignment.distance_source,
    vehicle: assignment.vehicle,
    driver: assignment.driver
  };
}

/** Map API /requests/my rows to mobile trip shape */
export function mapApiRequestToMobile(row) {
  if (!row) return null;
  if (row.pickup_location && row.request_number && row.assignment === undefined) return row;

  const a = row.assignment;
  const status = resolveMobileTripStatus(row.status, a?.status);

  return {
    id: row.id,
    request_number: row.request_code || row.request_number,
    project_id: row.project_id,
    project_name: row.project_name,
    passenger_count: row.passenger_count,
    pickup_location: row.pickup_address || row.pickup_location,
    pickup_latitude: row.pickup_lat ?? row.pickup_latitude,
    pickup_longitude: row.pickup_lng ?? row.pickup_longitude,
    destination_location: row.destination_address || row.destination_location,
    destination_latitude: row.destination_lat ?? row.destination_latitude,
    destination_longitude: row.destination_lng ?? row.destination_longitude,
    pickup_datetime: row.requested_datetime || row.pickup_datetime,
    purpose: row.purpose,
    trip_category: row.trip_category,
    status,
    assignment_id: a?.id,
    assigned_vehicle_id: a?.vehicle?.id,
    assigned_vehicle_plate: a?.vehicle?.plate_number,
    assigned_vehicle_model: a?.vehicle?.full_model || (a?.vehicle ? `${a.vehicle.make} ${a.vehicle.model}` : null),
    assigned_driver_id: a?.driver?.id,
    assigned_driver_name: a?.driver?.full_name,
    assigned_driver_phone: a?.driver?.phone_number || row.assigned_driver_phone,
    assigned_driver_avatar_url:
      row.assigned_driver_avatar_url ?? a?.driver?.avatar_url ?? null,
    staff_name: row.staff?.full_name || row.staff_name,
    staff_phone: row.staff?.phone_number || row.staff_phone,
    staff_avatar_url: row.staff?.avatar_url ?? row.staff_avatar_url ?? null,
    assigned_driver_latitude:
      row.assigned_driver_latitude ??
      a?.driver?.current_lat ??
      a?.vehicle?.current_lat ??
      null,
    assigned_driver_longitude:
      row.assigned_driver_longitude ??
      a?.driver?.current_lng ??
      a?.vehicle?.current_lng ??
      null,
    staff_meter_started: !!a?.staff_meter_started_at,
    staff_meter_ended: !!a?.staff_meter_ended_at,
    actual_distance_km: a?.actual_distance_km,
    distance_km: a?.actual_distance_km ?? row.distance_km,
    external_authorized: row.external_authorized,
    external_provider: row.external_provider,
    external_status: row.external_status,
    external_driver_name: row.external_driver_name,
    external_driver_phone: row.external_driver_phone,
    external_vehicle_plate: row.external_vehicle_plate,
    external_vehicle_model: row.external_vehicle_model,
    external_booking_ref: row.external_booking_ref,
    external_start_lat: row.external_start_lat,
    external_start_lng: row.external_start_lng,
    external_start_time: row.external_start_time,
    external_distance_km: row.external_distance_km,
    external_cost: row.external_cost,
    external_currency: row.external_currency,
    external_receipt_notes: row.external_receipt_notes,
    coordinator_booked_uber: row.coordinator_booked_uber,
    pickup_location_source: row.pickup_location_source,
    destination_location_source: row.destination_location_source,
    map_estimated_distance_km: row.map_estimated_distance_km
  };
}

export function mapDriverAssignmentToMobile(assignment) {
  if (!assignment) return null;
  const req = assignment.request || {};
  return {
    id: assignment.id,
    assignment_id: assignment.id,
    request_id: assignment.request_id || req.id,
    project_id: assignment.project_id || req.project_id,
    request_number: req.request_code || req.request_number,
    pickup_location: req.pickup_address || req.pickup_location,
    pickup_latitude: req.pickup_lat,
    pickup_longitude: req.pickup_lng,
    destination_location: req.destination_address,
    destination_latitude: req.destination_lat,
    destination_longitude: req.destination_lng,
    purpose: req.purpose,
    status: assignment.status,
    passenger_count: req.passenger_count,
    staff_name: assignment.staff?.full_name,
    staff_phone: assignment.staff?.phone_number,
    staff_avatar_url: assignment.staff?.avatar_url || null,
    assigned_vehicle_plate: assignment.vehicle?.plate_number,
    assigned_vehicle_model: assignment.vehicle ? `${assignment.vehicle.make} ${assignment.vehicle.model}` : null,
    pickup_datetime: req.requested_datetime || req.pickup_datetime,
    created_at: assignment.created_at || req.created_at
  };
}
