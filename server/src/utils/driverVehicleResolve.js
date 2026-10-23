/**
 * Resolve which fleet vehicle a driver is reporting against (no active trip required).
 */
export function resolveDriverVehicleForIncident(store, driverRecord) {
  if (!driverRecord) {
    return { vehicleId: null, candidates: [] };
  }

  const candidates = [];
  const seen = new Set();

  const addVehicle = (vehicle) => {
    if (!vehicle || seen.has(vehicle.id)) return;
    seen.add(vehicle.id);
    candidates.push({
      id: vehicle.id,
      plate_number: vehicle.plate_number,
      make: vehicle.make,
      model: vehicle.model,
      operational_status: vehicle.operational_status || 'AVAILABLE',
      label: `${vehicle.plate_number} — ${vehicle.make} ${vehicle.model}`.trim()
    });
  };

  if (driverRecord.assigned_vehicle_id) {
    addVehicle(store.vehicles?.find((v) => v.id === driverRecord.assigned_vehicle_id));
  }

  const assignments = (store.trip_assignments || [])
    .filter((a) => a.driver_id === driverRecord.id && a.vehicle_id)
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at || 0).getTime() -
        new Date(a.updated_at || a.created_at || 0).getTime()
    );

  for (const a of assignments.slice(0, 15)) {
    addVehicle(store.vehicles?.find((v) => v.id === a.vehicle_id));
  }

  for (const v of store.vehicles || []) {
    if (v.project_id === driverRecord.project_id) {
      addVehicle(v);
    }
  }

  const defaultVehicleId =
    driverRecord.assigned_vehicle_id ||
    assignments[0]?.vehicle_id ||
    candidates[0]?.id ||
    null;

  return { vehicleId: defaultVehicleId, candidates };
}
