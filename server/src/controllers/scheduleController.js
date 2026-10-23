import { v4 as uuidv4 } from 'uuid';
import { getStore } from '../db/connection.js';
import { logAudit } from '../middleware/audit.js';

export async function getSchedules(req, res, next) {
  try {
    const store = getStore();
    const { vehicle_id, driver_id, schedule_type, project_id } = req.query;

    let targetProjectIds = [];
    if (req.user.role === 'SYSTEM_ADMIN') {
      targetProjectIds = project_id ? [project_id] : store.projects.map(p => p.id);
    } else if (req.user.role === 'MASTER_PERSON') {
      const assignedIds = store.master_person_projects
        ?.filter(m => m.user_id === req.user.userId)
        .map(m => m.project_id) || [];
      const authorized = [...new Set([req.user.projectId, ...assignedIds].filter(Boolean))];
      targetProjectIds = project_id ? authorized.filter(id => id === project_id) : authorized;
    } else {
      targetProjectIds = [req.user.projectId];
    }

    let schedules = store.vehicle_schedules.filter(s => targetProjectIds.includes(s.project_id));

    if (vehicle_id) schedules = schedules.filter(s => s.vehicle_id === vehicle_id);
    if (driver_id) schedules = schedules.filter(s => s.driver_id === driver_id);
    if (schedule_type) schedules = schedules.filter(s => s.schedule_type === schedule_type.toUpperCase());

    const enriched = schedules.map(sched => {
      const vehicle = store.vehicles.find(v => v.id === sched.vehicle_id);
      const driver = sched.driver_id ? store.drivers.find(d => d.id === sched.driver_id) : null;
      const driverUser = driver ? store.users.find(u => u.id === driver.user_id) : null;

      return {
        ...sched,
        vehicle: vehicle ? {
          id: vehicle.id,
          plate_number: vehicle.plate_number,
          model: vehicle.model,
          operational_status: vehicle.operational_status
        } : null,
        driver: driver ? {
          id: driver.id,
          full_name: driverUser?.full_name
        } : null
      };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
}

export async function createSchedule(req, res, next) {
  try {
    const {
      vehicle_id,
      driver_id,
      start_time,
      end_time,
      schedule_type = 'RESERVATION',
      notes = ''
    } = req.body;

    if (!vehicle_id || !start_time || !end_time) {
      return res.status(400).json({ success: false, error: 'vehicle_id, start_time, and end_time are required' });
    }

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid start_time or end_time format' });
    }

    if (endDate <= startDate) {
      return res.status(400).json({ success: false, error: 'end_time must be strictly after start_time' });
    }

    const store = getStore();
    const vehicle = store.vehicles.find(v => v.id === vehicle_id);
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    // Check for overlapping confirmed schedules on this vehicle
    const overlaps = store.vehicle_schedules.filter(s => {
      if (s.vehicle_id !== vehicle_id || s.status === 'CANCELLED') return false;
      const existingStart = new Date(s.start_time);
      const existingEnd = new Date(s.end_time);
      return (startDate < existingEnd && endDate > existingStart);
    });

    if (overlaps.length > 0) {
      return res.status(409).json({
        success: false,
        error: `Schedule conflict detected: Vehicle '${vehicle.plate_number}' is already booked or under maintenance during this period.`,
        conflicts: overlaps
      });
    }

    const newSchedule = {
      id: 'sched-' + uuidv4().substring(0, 6),
      vehicle_id,
      driver_id: driver_id || null,
      project_id: vehicle.project_id,
      start_time: startDate,
      end_time: endDate,
      schedule_type: schedule_type.toUpperCase(), // RESERVATION, MAINTENANCE, REGULAR_SHIFT
      status: 'CONFIRMED',
      notes: notes.trim(),
      created_at: new Date()
    };

    store.vehicle_schedules.push(newSchedule);

    // If schedule is MAINTENANCE and starts now or in the past, update vehicle status
    if (newSchedule.schedule_type === 'MAINTENANCE' && startDate <= new Date() && endDate >= new Date()) {
      vehicle.operational_status = 'MAINTENANCE';
      vehicle.updated_at = new Date();
    }

    await logAudit({
      userId: req.user.userId,
      action: 'SCHEDULE_CREATED',
      entityType: 'SCHEDULE',
      entityId: newSchedule.id,
      projectId: vehicle.project_id,
      newValues: newSchedule,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.status(201).json({ success: true, message: 'Schedule created successfully', data: newSchedule });
  } catch (err) {
    next(err);
  }
}

export async function checkAvailability(req, res, next) {
  try {
    const { vehicle_id, driver_id, start_time, end_time } = req.query;

    if (!vehicle_id || !start_time || !end_time) {
      return res.status(400).json({ success: false, error: 'vehicle_id, start_time, and end_time query parameters required' });
    }

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    const store = getStore();
    const vehicle = store.vehicles.find(v => v.id === vehicle_id);
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    if (vehicle.operational_status !== 'AVAILABLE') {
      return res.json({
        success: true,
        available: false,
        reason: `Vehicle operational status is currently '${vehicle.operational_status}'`
      });
    }

    // Check schedule overlaps
    const vehicleOverlaps = store.vehicle_schedules.filter(s => {
      if (s.vehicle_id !== vehicle_id || s.status === 'CANCELLED') return false;
      const sStart = new Date(s.start_time);
      const sEnd = new Date(s.end_time);
      return (startDate < sEnd && endDate > sStart);
    });

    if (vehicleOverlaps.length > 0) {
      return res.json({
        success: true,
        available: false,
        reason: 'Vehicle has an overlapping schedule reservation or maintenance block',
        conflicts: vehicleOverlaps
      });
    }

    // Check driver if specified
    if (driver_id) {
      const driver = store.drivers.find(d => d.id === driver_id);
      if (driver && driver.availability_status !== 'AVAILABLE') {
        return res.json({
          success: true,
          available: false,
          reason: `Driver availability status is '${driver.availability_status}'`
        });
      }
    }

    res.json({
      success: true,
      available: true,
      message: 'Vehicle and driver are free during requested time slot'
    });
  } catch (err) {
    next(err);
  }
}
