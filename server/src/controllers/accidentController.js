import { v4 as uuidv4 } from 'uuid';
import { getStore } from '../db/connection.js';
import { logAudit } from '../middleware/audit.js';
import { emitToProject } from '../socket.js';
import { getAuthorizedProjectIds } from '../utils/projectScope.js';
import { resolveDriverVehicleForIncident } from '../utils/driverVehicleResolve.js';

function resolveUserProjectId(reqUser) {
  return reqUser.projectId || reqUser.project_id || null;
}

/** Driver mobile: default vehicle + selectable fleet (works when not on an active trip). */
export async function getDriverAccidentContext(req, res, next) {
  try {
    const store = getStore();
    const driverRecord = store.drivers?.find((d) => d.user_id === req.user.userId);
    if (!driverRecord) {
      return res.status(404).json({
        success: false,
        error: 'Driver profile not found. Ask your coordinator to complete your driver setup.'
      });
    }

    const { vehicleId, candidates } = resolveDriverVehicleForIncident(store, driverRecord);
    const defaultVehicle = vehicleId ? store.vehicles.find((v) => v.id === vehicleId) : null;

    res.json({
      success: true,
      data: {
        driver_id: driverRecord.id,
        default_vehicle_id: vehicleId,
        default_vehicle: defaultVehicle
          ? {
              id: defaultVehicle.id,
              plate_number: defaultVehicle.plate_number,
              make: defaultVehicle.make,
              model: defaultVehicle.model,
              operational_status: defaultVehicle.operational_status
            }
          : null,
        selectable_vehicles: candidates
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Record a vehicle accident or safety incident
 * Accessible by Drivers, Movement Officers, Logistics Coordinators, Master Persons, and Admins
 */
export async function recordAccident(req, res, next) {
  try {
    const {
      vehicle_id,
      driver_id,
      accident_date = new Date(),
      location_address,
      location_description,
      location_lat,
      location_lng,
      latitude,
      longitude,
      severity = 'MINOR',
      description,
      damage_details = '',
      third_party_info = '',
      third_party_involved,
      police_report_number = '',
      set_vehicle_status = 'IN_ACCIDENT'
    } = req.body;

    const finalAddress = location_address || location_description || (latitude && longitude ? `${latitude}, ${longitude}` : 'Field Incident Location');
    const finalLat = location_lat !== undefined ? location_lat : latitude;
    const finalLng = location_lng !== undefined ? location_lng : longitude;
    const finalThirdParty = third_party_info || (third_party_involved ? 'Third party vehicle/person involved' : '');

    if (!finalAddress || !description) {
      return res.status(400).json({
        success: false,
        error: 'location address/description and description are required'
      });
    }

    const store = getStore();

    let finalVehicleId = vehicle_id;
    let driverRecord = null;
    if (req.user.role === 'DRIVER') {
      driverRecord = store.drivers.find((d) => d.user_id === req.user.userId);
      if (!driverRecord) {
        return res.status(404).json({
          success: false,
          error: 'Driver profile not found. Contact your coordinator.'
        });
      }
      if (!finalVehicleId) {
        const resolved = resolveDriverVehicleForIncident(store, driverRecord);
        finalVehicleId = resolved.vehicleId;
      }
    }

    if (!finalVehicleId) {
      return res.status(400).json({
        success: false,
        error:
          'No fleet vehicle linked to your account. Select a vehicle on the accident form or ask your coordinator to assign you a vehicle.'
      });
    }

    const vehicle = store.vehicles.find((v) => v.id === finalVehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    let finalDriverId = driver_id;
    if (!finalDriverId && driverRecord) {
      finalDriverId = driverRecord.id;
    }
    if (!finalDriverId && req.user.role === 'DRIVER') {
      finalDriverId = driverRecord?.id || null;
    }

    const validSeverities = ['MINOR', 'MODERATE', 'SEVERE', 'CRITICAL'];
    const chosenSeverity = validSeverities.includes(severity.toUpperCase())
      ? severity.toUpperCase()
      : 'MINOR';

    const newAccident = {
      id: 'acc-' + uuidv4().substring(0, 6),
      vehicle_id: finalVehicleId,
      driver_id: finalDriverId,
      project_id: vehicle.project_id,
      reported_by_user_id: req.user.userId,
      accident_date: new Date(accident_date),
      location_address: finalAddress.trim(),
      location_description: finalAddress.trim(),
      location_lat: finalLat ? parseFloat(finalLat) : vehicle.current_lat || null,
      location_lng: finalLng ? parseFloat(finalLng) : vehicle.current_lng || null,
      latitude: finalLat ? parseFloat(finalLat) : vehicle.current_lat || null,
      longitude: finalLng ? parseFloat(finalLng) : vehicle.current_lng || null,
      severity: chosenSeverity,
      description: description.trim(),
      damage_details: damage_details ? damage_details.trim() : '',
      third_party_info: finalThirdParty.trim(),
      third_party_involved: Boolean(third_party_involved || finalThirdParty),
      police_report_number: police_report_number ? police_report_number.trim() : '',
      status: 'REPORTED',
      resolved_at: null,
      notes: `Reported by ${req.user.role} (${req.user.email})`,
      created_at: new Date()
    };

    if (!store.vehicle_accidents) store.vehicle_accidents = [];
    store.vehicle_accidents.unshift(newAccident);

    // Update vehicle status to indicate accident/repair
    const oldVehicleStatus = vehicle.operational_status;
    const allowedStatuses = ['IN_ACCIDENT', 'IN_REPAIR', 'MAINTENANCE', 'OUT_OF_SERVICE'];
    const newStatus = allowedStatuses.includes(set_vehicle_status) ? set_vehicle_status : 'IN_ACCIDENT';

    vehicle.operational_status = newStatus;
    vehicle.updated_at = new Date();

    // Log Audit
    await logAudit({
      userId: req.user.userId,
      action: 'VEHICLE_ACCIDENT_REPORTED',
      entityType: 'ACCIDENT',
      entityId: newAccident.id,
      projectId: vehicle.project_id,
      oldValues: { vehicle_operational_status: oldVehicleStatus },
      newValues: {
        accident_id: newAccident.id,
        severity: chosenSeverity,
        vehicle_operational_status: newStatus
      },
      ipAddress: req.ip || '127.0.0.1'
    });

    try {
      emitToProject(vehicle.project_id, 'accident_reported', {
        accident: newAccident,
        vehiclePlate: vehicle.plate_number,
        newStatus
      });
    } catch {
      /* non-fatal */
    }

    res.status(201).json({
      success: true,
      message: `Accident recorded successfully. Vehicle status changed to '${newStatus}'.`,
      data: newAccident
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List recorded accidents with vehicle & reporter details
 */
export async function getAccidents(req, res, next) {
  try {
    const store = getStore();
    const { project_id, vehicle_id, severity, status } = req.query;

    let accidents = store.vehicle_accidents || [];

    const scopedUser = {
      role: req.user.role,
      userId: req.user.userId,
      projectId: resolveUserProjectId(req.user)
    };
    const authorized = getAuthorizedProjectIds(scopedUser);

    if (req.user.role === 'SYSTEM_ADMIN') {
      if (project_id) accidents = accidents.filter((a) => a.project_id === project_id);
    } else {
      accidents = accidents.filter((a) => authorized.includes(a.project_id));
      if (project_id && authorized.includes(project_id)) {
        accidents = accidents.filter((a) => a.project_id === project_id);
      }
    }

    if (vehicle_id) accidents = accidents.filter(a => a.vehicle_id === vehicle_id);
    if (severity) accidents = accidents.filter(a => a.severity === severity.toUpperCase());
    if (status) accidents = accidents.filter(a => a.status === status.toUpperCase());

    const enriched = accidents.map(acc => {
      const vehicle = store.vehicles.find(v => v.id === acc.vehicle_id);
      const reporter = store.users.find(u => u.id === acc.reported_by_user_id);
      const driverRecord = acc.driver_id ? store.drivers.find(d => d.id === acc.driver_id) : null;
      const driverUser = driverRecord ? store.users.find(u => u.id === driverRecord.user_id) : null;

      return {
        ...acc,
        vehicle_plate: vehicle?.plate_number || 'Unknown',
        vehicle_model: vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown',
        vehicle_operational_status: vehicle?.operational_status || 'UNKNOWN',
        driver_name: driverUser?.full_name || 'Unassigned / Not Specified',
        driver_phone: driverUser?.phone_number || null,
        reported_by_name: reporter?.full_name || 'System'
      };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
}

/**
 * Update accident status (e.g. UNDER_INVESTIGATION, IN_REPAIR, RESOLVED)
 * Can also restore vehicle back to AVAILABLE upon resolution
 */
export async function updateAccidentStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, notes = '', restore_vehicle_available = false } = req.body;

    const validStatuses = ['REPORTED', 'UNDER_INVESTIGATION', 'IN_REPAIR', 'RESOLVED'];
    if (!status || !validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const store = getStore();
    const accident = (store.vehicle_accidents || []).find(a => a.id === id);
    if (!accident) {
      return res.status(404).json({ success: false, error: 'Accident record not found' });
    }

    const oldStatus = accident.status;
    accident.status = status.toUpperCase();
    if (notes) {
      accident.notes = (accident.notes ? accident.notes + ' | ' : '') + notes;
    }
    if (accident.status === 'RESOLVED') {
      accident.resolved_at = new Date();
    }

    // Optionally restore vehicle operational status
    const vehicle = store.vehicles.find(v => v.id === accident.vehicle_id);
    let vehicleStatusUpdated = false;
    if (vehicle && restore_vehicle_available) {
      vehicle.operational_status = 'AVAILABLE';
      vehicle.updated_at = new Date();
      vehicleStatusUpdated = true;
    }

    await logAudit({
      userId: req.user.userId,
      action: 'ACCIDENT_STATUS_UPDATED',
      entityType: 'ACCIDENT',
      entityId: accident.id,
      projectId: accident.project_id,
      oldValues: { status: oldStatus },
      newValues: { status: accident.status, notes, vehicle_restored: vehicleStatusUpdated },
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({
      success: true,
      message: `Accident status updated to ${accident.status}.${vehicleStatusUpdated ? ' Vehicle restored to AVAILABLE.' : ''}`,
      data: accident
    });
  } catch (err) {
    next(err);
  }
}
