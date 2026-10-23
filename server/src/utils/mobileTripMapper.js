/** Normalize movement requests for staff/driver mobile clients */
export function enrichMovementRequest(store, reqItem) {
  const staffUser = store.users.find((u) => u.id === reqItem.staff_id);
  const project = store.projects.find((p) => p.id === reqItem.project_id);
  const assignment = store.trip_assignments.find((t) => t.request_id === reqItem.id);
  const externalTransport = store.external_transports.find((e) => e.request_id === reqItem.id);

  let assignmentDetails = null;
  if (assignment) {
    const vehicle = store.vehicles.find((v) => v.id === assignment.vehicle_id);
    const driver = store.drivers.find((d) => d.id === assignment.driver_id);
    const driverUser = driver ? store.users.find((u) => u.id === driver.user_id) : null;
    assignmentDetails = {
      id: assignment.id,
      status: assignment.status,
      staff_meter_started_at: assignment.staff_meter_started_at,
      staff_meter_ended_at: assignment.staff_meter_ended_at,
      actual_distance_km: assignment.actual_distance_km,
      distance_source: assignment.distance_source,
      vehicle: vehicle
        ? {
            id: vehicle.id,
            plate_number: vehicle.plate_number,
            make: vehicle.make,
            model: vehicle.model,
            full_model: `${vehicle.make} ${vehicle.model}`,
            capacity: vehicle.capacity,
            color: vehicle.color || 'White / Fleet Silver',
            current_lat: vehicle.current_lat,
            current_lng: vehicle.current_lng
          }
        : null,
      driver: driver
        ? {
            id: driver.id,
            full_name: driverUser?.full_name,
            phone_number: driverUser?.phone_number,
            rating: driver.rating || 5.0,
            avatar_url: driverUser?.avatar_url || null
          }
        : null,
      estimated_pickup_time: assignment.estimated_pickup_time,
      actual_pickup_time: assignment.actual_pickup_time
    };
  }

  const externalRide = Boolean(
    reqItem.external_authorized ||
      reqItem.coordinator_booked_uber ||
      reqItem.external_provider ||
      reqItem.external_status
  );

  return {
    ...reqItem,
    request_number: reqItem.request_code,
    transport_mode: externalRide ? 'external' : assignmentDetails ? 'fleet' : 'unassigned',
    staff: staffUser
      ? {
          id: staffUser.id,
          full_name: staffUser.full_name,
          phone_number: staffUser.phone_number,
          email: staffUser.email
        }
      : null,
    project_name: project?.name,
    assignment: assignmentDetails,
    external_transport: externalTransport
      ? {
          id: externalTransport.id,
          provider_name: externalTransport.provider_name,
          fare_amount: externalTransport.fare_amount,
          currency: externalTransport.currency,
          reason: externalTransport.reason,
          receipt_url: externalTransport.receipt_url
        }
      : null
  };
}

export function mapRequestForMobile(enriched) {
  const a = enriched.assignment;
  const requestStatus = enriched.status;

  let status = requestStatus;
  if (requestStatus === 'EXTERNAL_AUTHORIZED') {
    status = 'EXTERNAL_AUTHORIZED';
  } else if (requestStatus === 'IN_TRANSIT' || requestStatus === 'COMPLETED') {
    status = requestStatus;
  } else if (requestStatus === 'PENDING' || requestStatus === 'ASSIGNED' || requestStatus === 'CANCELLED' || requestStatus === 'REJECTED') {
    status = requestStatus;
  } else if (a?.status && !['ASSIGNED'].includes(a.status)) {
    status = a.status;
  }

  const externalFromRequest = {
    external_authorized: Boolean(enriched.external_authorized),
    external_provider: enriched.external_provider || null,
    external_status: enriched.external_status || null,
    external_driver_name: enriched.external_driver_name || null,
    external_driver_phone: enriched.external_driver_phone || null,
    external_vehicle_plate: enriched.external_vehicle_plate || null,
    external_vehicle_model: enriched.external_vehicle_model || null,
    external_booking_ref: enriched.external_booking_ref || null,
    external_start_lat: enriched.external_start_lat ?? null,
    external_start_lng: enriched.external_start_lng ?? null,
    external_start_time: enriched.external_start_time || null,
    external_end_lat: enriched.external_end_lat ?? null,
    external_end_lng: enriched.external_end_lng ?? null,
    external_distance_km: enriched.external_distance_km ?? null,
    external_cost: enriched.external_cost ?? null,
    external_currency: enriched.external_currency || 'ETB',
    external_receipt_notes: enriched.external_receipt_notes || null,
    coordinator_booked_uber: Boolean(enriched.coordinator_booked_uber)
  };

  return {
    id: enriched.id,
    request_number: enriched.request_code,
    project_id: enriched.project_id,
    project_name: enriched.project_name,
    passenger_count: enriched.passenger_count,
    pickup_location: enriched.pickup_address,
    pickup_latitude: enriched.pickup_lat,
    pickup_longitude: enriched.pickup_lng,
    destination_location: enriched.destination_address,
    destination_latitude: enriched.destination_lat,
    destination_longitude: enriched.destination_lng,
    pickup_datetime: enriched.requested_datetime,
    purpose: enriched.purpose,
    trip_category: enriched.trip_category,
    status,
    assignment_id: a?.id,
    assigned_vehicle_id: a?.vehicle?.id,
    assigned_vehicle_plate: a?.vehicle?.plate_number,
    assigned_vehicle_model: a?.vehicle?.full_model,
    assigned_driver_id: a?.driver?.id,
    assigned_driver_name: a?.driver?.full_name,
    assigned_driver_phone: a?.driver?.phone_number,
    staff_meter_started: !!a?.staff_meter_started_at,
    staff_meter_ended: !!a?.staff_meter_ended_at,
    actual_distance_km: a?.actual_distance_km,
    distance_km: a?.actual_distance_km ?? a?.estimated_distance_km,
    pickup_location_source: enriched.pickup_location_source || 'gps',
    destination_location_source: enriched.destination_location_source || 'manual',
    map_estimated_distance_km: enriched.map_estimated_distance_km ?? null,
    ...externalFromRequest,
    external_transport: enriched.external_transport
  };
}
