/** Map API /requests/my rows to mobile trip shape */
export function mapApiRequestToMobile(row) {
  if (!row) return null;
  if (row.pickup_location && row.request_number) return row;

  const a = row.assignment;
  let status = row.status;
  if (row.status === 'EXTERNAL_AUTHORIZED') {
    status = 'EXTERNAL_AUTHORIZED';
  } else if (row.status === 'IN_TRANSIT' || row.status === 'COMPLETED') {
    status = row.status;
  } else if (['PENDING', 'ASSIGNED', 'CANCELLED', 'REJECTED'].includes(row.status)) {
    status = row.status;
  } else if (a?.status && !['ASSIGNED'].includes(a.status)) {
    status = a.status;
  }

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
    assigned_driver_phone: a?.driver?.phone_number,
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
  const req = assignment.request || {};
  return {
    id: assignment.id,
    assignment_id: assignment.id,
    request_number: req.request_code,
    pickup_location: req.pickup_address,
    pickup_latitude: req.pickup_lat,
    pickup_longitude: req.pickup_lng,
    destination_location: req.destination_address,
    destination_latitude: req.destination_lat,
    destination_longitude: req.destination_lng,
    purpose: req.purpose,
    status: assignment.status,
    passenger_count: req.passenger_count,
    staff_name: assignment.staff?.full_name,
    assigned_vehicle_plate: assignment.vehicle?.plate_number,
    assigned_vehicle_model: assignment.vehicle ? `${assignment.vehicle.make} ${assignment.vehicle.model}` : null
  };
}
