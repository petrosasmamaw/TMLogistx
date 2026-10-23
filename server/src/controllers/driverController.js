import { getStore } from '../db/connection.js';
import { logAudit } from '../middleware/audit.js';
import { repairDriverProfilesForProjects } from '../utils/driverProfile.js';
import {
  applyDriverShiftType,
  normalizeDriverShiftType,
  DRIVER_SHIFT_TYPES,
  DRIVER_SHIFT_DAY
} from '../constants/driverShifts.js';
import { getAuthorizedProjectIds, getRequesterProjectId } from '../utils/projectScope.js';

export async function getDrivers(req, res, next) {
  try {
    const store = getStore();
    const { status, project_id, site_id } = req.query;

    let targetProjectIds = [];

    if (req.user.role === 'SYSTEM_ADMIN') {
      targetProjectIds = project_id ? [project_id] : store.projects.map(p => p.id);
    } else if (req.user.role === 'MASTER_PERSON') {
      const authorized = getAuthorizedProjectIds(req.user);
      if (project_id) {
        if (!authorized.includes(project_id)) {
          return res.status(403).json({
            success: false,
            error: 'Cannot list drivers outside your assigned projects'
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
          error: 'Cannot list drivers outside your assigned project'
        });
      }
      targetProjectIds = scopeId ? [scopeId] : [];
    }

    repairDriverProfilesForProjects(store, targetProjectIds);

    for (const d of store.drivers || []) {
      if (targetProjectIds.includes(d.project_id) && !d.shift_type) {
        Object.assign(d, applyDriverShiftType(DRIVER_SHIFT_DAY));
      }
    }

    let drivers = (store.drivers || []).filter((d) => targetProjectIds.includes(d.project_id));

    if (status) {
      drivers = drivers.filter(d => d.availability_status === status.toUpperCase());
    }

    if (site_id && site_id !== 'ALL') {
      drivers = drivers.filter((d) => {
        const u = store.users.find((usr) => usr.id === d.user_id);
        return u?.site_id === site_id;
      });
    }

    const enriched = drivers.map(drv => {
      const user = store.users.find(u => u.id === drv.user_id);
      const vehicle = drv.assigned_vehicle_id ? store.vehicles.find(v => v.id === drv.assigned_vehicle_id) : null;
      const project = store.projects.find(p => p.id === drv.project_id);

      return {
        ...drv,
        full_name: user?.full_name || 'Driver',
        email: user?.email,
        phone_number: user?.phone_number,
        avatar_url: user?.avatar_url,
        project_name: project?.name,
        assigned_vehicle: vehicle ? {
          id: vehicle.id,
          plate_number: vehicle.plate_number,
          make: vehicle.make,
          model: vehicle.model,
          operational_status: vehicle.operational_status
        } : null
      };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
}

export async function getDriverById(req, res, next) {
  try {
    const { id } = req.params;
    const store = getStore();
    const driver = store.drivers.find(d => d.id === id || d.user_id === id);

    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver profile not found' });
    }

    const user = store.users.find(u => u.id === driver.user_id);
    const vehicle = driver.assigned_vehicle_id ? store.vehicles.find(v => v.id === driver.assigned_vehicle_id) : null;
    const schedules = store.vehicle_schedules.filter(s => s.driver_id === driver.id);
    const trips = store.trip_assignments.filter(t => t.driver_id === driver.id);

    res.json({
      success: true,
      data: {
        ...driver,
        full_name: user?.full_name,
        email: user?.email,
        phone_number: user?.phone_number,
        assigned_vehicle: vehicle,
        schedules,
        trips
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function updateDriver(req, res, next) {
  try {
    const { id } = req.params;
    const {
      availability_status,
      shift_type,
      shift_start_time,
      shift_end_time,
      license_number,
      license_expiry,
      assigned_vehicle_id
    } = req.body;

    const store = getStore();
    const driver = store.drivers.find(d => d.id === id);

    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    const oldValues = { ...driver };

    if (availability_status !== undefined) {
      const validStatuses = ['AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'INACTIVE'];
      if (!validStatuses.includes(availability_status.toUpperCase())) {
        return res.status(400).json({ success: false, error: `Invalid availability_status. Must be one of: ${validStatuses.join(', ')}` });
      }
      driver.availability_status = availability_status.toUpperCase();
    }

    if (shift_type !== undefined) {
      const normalized = normalizeDriverShiftType(shift_type);
      if (!DRIVER_SHIFT_TYPES.includes(normalized)) {
        return res.status(400).json({
          success: false,
          error: 'shift_type must be Day (NORMAL_DAY), Night (NIGHT_SHIFT), or Weekend (WEEKEND)'
        });
      }
      Object.assign(driver, applyDriverShiftType(normalized));
    } else if (shift_start_time !== undefined || shift_end_time !== undefined) {
      if (shift_start_time !== undefined) driver.shift_start_time = shift_start_time;
      if (shift_end_time !== undefined) driver.shift_end_time = shift_end_time;
    }
    if (license_number !== undefined) driver.license_number = license_number;
    if (license_expiry !== undefined) driver.license_expiry = license_expiry;

    if (assigned_vehicle_id !== undefined) {
      if (assigned_vehicle_id) {
        const vehicle = store.vehicles.find(v => v.id === assigned_vehicle_id);
        if (!vehicle) {
          return res.status(404).json({ success: false, error: 'Vehicle not found' });
        }
        // Unbind previous driver of this vehicle if any
        store.drivers.forEach(d => {
          if (d.id !== driver.id && d.assigned_vehicle_id === assigned_vehicle_id) {
            d.assigned_vehicle_id = null;
          }
        });
      }
      driver.assigned_vehicle_id = assigned_vehicle_id;
    }

    driver.updated_at = new Date();

    await logAudit({
      userId: req.user.userId,
      action: 'DRIVER_UPDATED',
      entityType: 'DRIVER',
      entityId: driver.id,
      projectId: driver.project_id,
      oldValues,
      newValues: driver,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true, message: 'Driver updated successfully', data: driver });
  } catch (err) {
    next(err);
  }
}

export async function assignVehicleToDriver(req, res, next) {
  try {
    const { id } = req.params;
    const { vehicle_id } = req.body;

    const store = getStore();
    const driver = store.drivers.find(d => d.id === id);

    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    if (vehicle_id) {
      const vehicle = store.vehicles.find(v => v.id === vehicle_id);
      if (!vehicle) {
        return res.status(404).json({ success: false, error: 'Vehicle not found' });
      }
      if (vehicle.project_id !== driver.project_id && req.user.role !== 'SYSTEM_ADMIN') {
        return res.status(400).json({ success: false, error: 'Cannot assign a vehicle from another project' });
      }

      // Detach any existing driver currently assigned to this vehicle
      store.drivers.forEach(d => {
        if (d.id !== driver.id && d.assigned_vehicle_id === vehicle_id) {
          d.assigned_vehicle_id = null;
        }
      });
    }

    driver.assigned_vehicle_id = vehicle_id || null;
    driver.updated_at = new Date();

    await logAudit({
      userId: req.user.userId,
      action: 'DRIVER_VEHICLE_ASSIGNED',
      entityType: 'DRIVER',
      entityId: driver.id,
      projectId: driver.project_id,
      newValues: { assigned_vehicle_id: driver.assigned_vehicle_id },
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true, message: 'Vehicle assignment updated', data: driver });
  } catch (err) {
    next(err);
  }
}
