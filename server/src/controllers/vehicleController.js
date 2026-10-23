import { v4 as uuidv4 } from 'uuid';
import { getStore } from '../db/connection.js';
import { logAudit } from '../middleware/audit.js';
import { getAuthorizedProjectIds, getRequesterProjectId } from '../utils/projectScope.js';

export async function getVehicles(req, res, next) {
  try {
    const store = getStore();
    const { status, project_id, site_id } = req.query;

    let targetProjectIds = [];

    if (req.user.role === 'SYSTEM_ADMIN') {
      if (project_id) {
        targetProjectIds = [project_id];
      } else {
        targetProjectIds = store.projects.map(p => p.id);
      }
    } else if (req.user.role === 'MASTER_PERSON') {
      const authorized = getAuthorizedProjectIds(req.user);
      if (project_id) {
        if (!authorized.includes(project_id)) {
          return res.status(403).json({
            success: false,
            error: 'Cannot list vehicles outside your assigned projects'
          });
        }
        targetProjectIds = [project_id];
      } else {
        targetProjectIds = authorized;
      }
    } else {
      const scopeId = getRequesterProjectId(req.user, store);
      if (project_id && scopeId && project_id !== scopeId) {
        return res.status(403).json({
          success: false,
          error: 'Cannot list vehicles outside your assigned project'
        });
      }
      targetProjectIds = scopeId ? [scopeId] : [];
    }

    let vehicles = store.vehicles.filter(v => targetProjectIds.includes(v.project_id));

    if (status) {
      vehicles = vehicles.filter(v => v.operational_status === status.toUpperCase());
    }

    if (site_id && site_id !== 'ALL') {
      vehicles = vehicles.filter((v) => v.site_id === site_id);
    }

    // Enrich vehicles with driver information and active trip assignment
    const enriched = vehicles.map(veh => {
      const driver = store.drivers.find(d => d.assigned_vehicle_id === veh.id);
      const driverUser = driver ? store.users.find(u => u.id === driver.user_id) : null;
      const project = store.projects.find(p => p.id === veh.project_id);

      // Check for active trip assignment
      const activeAssignment = store.trip_assignments.find(
        ta => ta.vehicle_id === veh.id && 
        ['ASSIGNED', 'ACCEPTED', 'HEADING_TO_PICKUP', 'ARRIVED', 'PASSENGER_PICKED_UP', 'IN_TRANSIT'].includes(ta.status)
      );

      return {
        ...veh,
        project_name: project?.name || null,
        driver: driver ? {
          id: driver.id,
          user_id: driver.user_id,
          full_name: driverUser?.full_name || 'Assigned Driver',
          phone_number: driverUser?.phone_number || null,
          license_number: driver.license_number,
          availability_status: driver.availability_status
        } : null,
        active_assignment: activeAssignment ? {
          id: activeAssignment.id,
          request_id: activeAssignment.request_id,
          status: activeAssignment.status,
          estimated_pickup_time: activeAssignment.estimated_pickup_time
        } : null
      };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
}

export async function getVehicleById(req, res, next) {
  try {
    const { id } = req.params;
    const store = getStore();
    const vehicle = store.vehicles.find(v => v.id === id);

    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    // Project scope check
    if (req.user.role !== 'SYSTEM_ADMIN') {
      const authorized =
        req.user.role === 'MASTER_PERSON'
          ? getAuthorizedProjectIds(req.user)
          : [getRequesterProjectId(req.user, store)].filter(Boolean);
      if (!authorized.includes(vehicle.project_id)) {
        return res.status(403).json({ success: false, error: 'Forbidden: Vehicle belongs to another project' });
      }
    }

    const driver = store.drivers.find(d => d.assigned_vehicle_id === vehicle.id);
    const driverUser = driver ? store.users.find(u => u.id === driver.user_id) : null;
    const schedules = store.vehicle_schedules.filter(s => s.vehicle_id === vehicle.id);
    const expenses = store.vehicle_expenses.filter(e => e.vehicle_id === vehicle.id);

    res.json({
      success: true,
      data: {
        ...vehicle,
        driver: driver ? {
          id: driver.id,
          full_name: driverUser?.full_name,
          phone: driverUser?.phone_number,
          license: driver.license_number,
          status: driver.availability_status
        } : null,
        schedules,
        expenses
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function createVehicle(req, res, next) {
  try {
    const {
      plate_number,
      make,
      model,
      year,
      capacity = 4,
      fuel_type = 'Diesel',
      odometer_km = 0,
      project_id,
      insurance_expiry,
      technical_inspection_expiry
    } = req.body;

    if (!plate_number || !make || !model) {
      return res.status(400).json({ success: false, error: 'plate_number, make, and model are required' });
    }

    const store = getStore();
    const targetProjectId = project_id || getRequesterProjectId(req.user, store);
    if (!targetProjectId) {
      return res.status(400).json({ success: false, error: 'project_id is required' });
    }

    if (req.user.role === 'MASTER_PERSON') {
      if (!getAuthorizedProjectIds(req.user).includes(targetProjectId)) {
        return res.status(403).json({
          success: false,
          error: 'Cannot register vehicles outside your assigned projects'
        });
      }
    } else if (req.user.role !== 'SYSTEM_ADMIN') {
      const scopeId = getRequesterProjectId(req.user, store);
      if (!scopeId || scopeId !== targetProjectId) {
        return res.status(403).json({
          success: false,
          error: 'You can only register vehicles for your assigned project'
        });
      }
    }

    // Check duplicate plate
    if (store.vehicles.some(v => v.plate_number.toUpperCase() === plate_number.trim().toUpperCase())) {
      return res.status(400).json({ success: false, error: `Vehicle with plate '${plate_number}' already exists` });
    }

    const newVehicle = {
      id: 'veh-' + uuidv4().substring(0, 6),
      project_id: targetProjectId,
      plate_number: plate_number.trim().toUpperCase(),
      make: make.trim(),
      model: model.trim(),
      year: year ? parseInt(year, 10) : new Date().getFullYear(),
      capacity: parseInt(capacity, 10) || 4,
      fuel_type: fuel_type.trim(),
      operational_status: 'AVAILABLE',
      current_lat: req.body.current_lat || 9.0123,
      current_lng: req.body.current_lng || 38.7612,
      current_address: req.body.current_address || 'Project Base, Addis Ababa',
      last_location_update: new Date(),
      odometer_km: parseFloat(odometer_km) || 0.0,
      shift_type: req.body.shift_type || 'NORMAL_DAY', // NORMAL_DAY, NIGHT_SHIFT, WEEKEND, ALL_HOURS
      shift_start_time: req.body.shift_start_time || '08:00',
      shift_end_time: req.body.shift_end_time || '18:00',
      is_weekend_eligible: req.body.is_weekend_eligible !== undefined ? Boolean(req.body.is_weekend_eligible) : (req.body.shift_type === 'WEEKEND' || req.body.shift_type === 'ALL_HOURS'),
      insurance_expiry: insurance_expiry || null,
      technical_inspection_expiry: technical_inspection_expiry || null,
      created_at: new Date(),
      updated_at: new Date()
    };

    store.vehicles.push(newVehicle);

    await logAudit({
      userId: req.user.userId,
      action: 'VEHICLE_REGISTERED',
      entityType: 'VEHICLE',
      entityId: newVehicle.id,
      projectId: targetProjectId,
      newValues: { plate_number: newVehicle.plate_number, model: newVehicle.model },
      ipAddress: req.ip || '127.0.0.1'
    });

    res.status(201).json({ success: true, message: 'Vehicle registered successfully', data: newVehicle });
  } catch (err) {
    next(err);
  }
}

export async function updateVehicle(req, res, next) {
  try {
    const { id } = req.params;
    const {
      operational_status,
      odometer_km,
      capacity,
      fuel_type,
      current_address,
      insurance_expiry,
      technical_inspection_expiry
    } = req.body;

    const store = getStore();
    const vehicle = store.vehicles.find(v => v.id === id);

    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    const oldValues = { ...vehicle };

    if (operational_status !== undefined) {
      const validStatuses = ['AVAILABLE', 'BUSY', 'MAINTENANCE', 'OUT_OF_SERVICE', 'IN_ACCIDENT', 'IN_REPAIR'];
      if (!validStatuses.includes(operational_status.toUpperCase())) {
        return res.status(400).json({ success: false, error: `Invalid operational_status. Must be one of: ${validStatuses.join(', ')}` });
      }
      vehicle.operational_status = operational_status.toUpperCase();
    }

    if (req.body.project_id !== undefined) {
      const targetProj = store.projects.find(p => p.id === req.body.project_id);
      if (targetProj) {
        vehicle.project_id = targetProj.id;
      }
    }

    if (odometer_km !== undefined) vehicle.odometer_km = parseFloat(odometer_km);
    if (capacity !== undefined) vehicle.capacity = parseInt(capacity, 10);
    if (fuel_type !== undefined) vehicle.fuel_type = fuel_type;
    if (current_address !== undefined) vehicle.current_address = current_address;
    if (insurance_expiry !== undefined) vehicle.insurance_expiry = insurance_expiry;
    if (technical_inspection_expiry !== undefined) vehicle.technical_inspection_expiry = technical_inspection_expiry;
    if (req.body.shift_type !== undefined) vehicle.shift_type = req.body.shift_type;
    if (req.body.shift_start_time !== undefined) vehicle.shift_start_time = req.body.shift_start_time;
    if (req.body.shift_end_time !== undefined) vehicle.shift_end_time = req.body.shift_end_time;
    if (req.body.is_weekend_eligible !== undefined) vehicle.is_weekend_eligible = Boolean(req.body.is_weekend_eligible);

    vehicle.updated_at = new Date();

    await logAudit({
      userId: req.user.userId,
      action: 'VEHICLE_UPDATED',
      entityType: 'VEHICLE',
      entityId: vehicle.id,
      projectId: vehicle.project_id,
      oldValues,
      newValues: vehicle,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true, message: 'Vehicle updated successfully', data: vehicle });
  } catch (err) {
    next(err);
  }
}
