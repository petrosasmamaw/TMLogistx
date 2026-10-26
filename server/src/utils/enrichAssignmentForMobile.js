import { enrichMovementRequest } from './mobileTripMapper.js';

/** Enriched assignment for mobile clients + socket payloads. */
export function enrichAssignmentForMobile(store, assignment) {
  const request = store.movement_requests.find((r) => r.id === assignment.request_id);
  const vehicle = store.vehicles.find((v) => v.id === assignment.vehicle_id);
  const driver = store.drivers.find((d) => d.id === assignment.driver_id);
  const driverUser = driver ? store.users.find((u) => u.id === driver.user_id) : null;
  const staffUser = request ? store.users.find((u) => u.id === request.staff_id) : null;

  return {
    ...assignment,
    request,
    staff: staffUser
      ? {
          id: staffUser.id,
          full_name: staffUser.full_name,
          phone_number: staffUser.phone_number,
          avatar_url: staffUser.avatar_url || null
        }
      : null,
    vehicle: vehicle
      ? {
          id: vehicle.id,
          plate_number: vehicle.plate_number,
          make: vehicle.make,
          model: vehicle.model,
          current_lat: vehicle.current_lat,
          current_lng: vehicle.current_lng
        }
      : null,
    driver: driver
      ? {
          id: driver.id,
          user_id: driver.user_id,
          full_name: driverUser?.full_name,
          phone_number: driverUser?.phone_number,
          avatar_url: driverUser?.avatar_url || null
        }
      : null
  };
}

export function tripNotifyUserIds(store, assignment) {
  if (!assignment) return [];
  const request = store.movement_requests.find((r) => r.id === assignment.request_id);
  const driver = store.drivers.find((d) => d.id === assignment.driver_id);
  return [request?.staff_id, driver?.user_id].filter(Boolean);
}

export function projectPortalUserIds(store, projectId) {
  const portal = new Set([
    'LOGISTICS_COORDINATOR',
    'MOVEMENT_CENTER',
    'MOVEMENT_OFFICER',
    'MASTER_PERSON',
    'SYSTEM_ADMIN'
  ]);
  return (store.users || [])
    .filter((u) => portal.has(u.role) && (!projectId || u.project_id === projectId || u.role === 'SYSTEM_ADMIN' || u.role === 'MASTER_PERSON'))
    .map((u) => u.id);
}

export function buildTripStatusSocketPayload(store, assignment, newStatus, extra = {}) {
  const rawRequest = store.movement_requests.find((r) => r.id === assignment.request_id);
  const request =
    extra.request || (rawRequest ? enrichMovementRequest(store, rawRequest) : null);
  return {
    assignmentId: assignment.id,
    requestId: assignment.request_id,
    projectId: assignment.project_id,
    newStatus,
    assignment: enrichAssignmentForMobile(store, assignment),
    request,
    notifyUserIds: extra.notifyUserIds || tripNotifyUserIds(store, assignment),
    ...extra
  };
}
