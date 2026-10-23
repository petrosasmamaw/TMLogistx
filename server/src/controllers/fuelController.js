import { v4 as uuidv4 } from 'uuid';
import { getStore } from '../db/connection.js';
import { logAudit } from '../middleware/audit.js';

/**
 * Log vehicle fuel consumption
 * Allows recording per movement OR bulk for historical days (e.g. past 3-7 days)
 * Accessible by Drivers, Logistics Coordinators, Movement Officers, and Admins
 */
export async function logFuel(req, res, next) {
  try {
    const {
      vehicle_id,
      trip_assignment_id = null,
      liters,
      cost,
      amount,
      cost_amount,
      currency = 'ETB',
      odometer_reading,
      odometer_km,
      fuel_station = '',
      fuel_date = new Date().toISOString().split('T')[0],
      days_covered = 1,
      bulk_days_count,
      entry_mode,
      receipt_url = null,
      notes = ''
    } = req.body;

    const rawCost = cost !== undefined ? cost : (amount !== undefined ? amount : cost_amount);
    const totalCost = rawCost !== undefined && rawCost !== null ? parseFloat(rawCost) : null;

    if (!vehicle_id || liters === undefined || totalCost === null) {
      return res.status(400).json({
        success: false,
        error: 'vehicle_id, liters, and cost/amount are required'
      });
    }

    const store = getStore();
    const vehicle = store.vehicles.find(v => v.id === vehicle_id);
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    // Determine driver ID if recorded by driver
    let driverId = null;
    if (req.user.role === 'DRIVER') {
      const driverRecord = store.drivers.find(d => d.user_id === req.user.userId);
      driverId = driverRecord?.id || null;
    }

    const newFuelLog = {
      id: 'fuel-' + uuidv4().substring(0, 6),
      vehicle_id,
      driver_id: driverId,
      trip_assignment_id: trip_assignment_id || null,
      project_id: vehicle.project_id,
      recorded_by_user_id: req.user.userId,
      liters: parseFloat(liters),
      cost: totalCost,
      currency: currency.toUpperCase(),
      odometer_reading: odometer_reading ? parseFloat(odometer_reading) : (odometer_km ? parseFloat(odometer_km) : null),
      fuel_station: fuel_station.trim(),
      fuel_date,
      days_covered: parseInt(days_covered || bulk_days_count) || 1,
      bulk_days_count: parseInt(bulk_days_count || days_covered) || 1,
      entry_mode: entry_mode || ((days_covered > 1 || bulk_days_count > 1) ? 'MULTI_DAY_BULK' : 'PER_MOVEMENT'),
      receipt_url,
      notes: notes.trim(),
      created_at: new Date()
    };

    if (!store.fuel_logs) store.fuel_logs = [];
    store.fuel_logs.unshift(newFuelLog);

    // Sync to vehicle_expenses as FUEL expense for unified company finance
    const expenseEntry = {
      id: 'exp-' + uuidv4().substring(0, 6),
      vehicle_id,
      project_id: vehicle.project_id,
      recorded_by_user_id: req.user.userId,
      expense_type: 'FUEL',
      amount: totalCost,
      currency: currency.toUpperCase(),
      odometer_reading: newFuelLog.odometer_reading,
      receipt_url,
      description: `Fuel: ${liters}L at ${fuel_station || 'Station'} (${days_covered > 1 ? `Covering past ${days_covered} days` : 'Per movement'}). ${notes}`.trim(),
      expense_date: fuel_date,
      created_at: new Date()
    };
    if (!store.vehicle_expenses) store.vehicle_expenses = [];
    store.vehicle_expenses.unshift(expenseEntry);

    // Update vehicle odometer if provided and higher than current
    if (newFuelLog.odometer_reading && newFuelLog.odometer_reading > (vehicle.odometer_km || 0)) {
      vehicle.odometer_km = newFuelLog.odometer_reading;
      vehicle.updated_at = new Date();
    }

    await logAudit({
      userId: req.user.userId,
      action: 'FUEL_CONSUMPTION_LOGGED',
      entityType: 'FUEL_LOG',
      entityId: newFuelLog.id,
      projectId: vehicle.project_id,
      newValues: {
        vehicle_id,
        liters: newFuelLog.liters,
        cost: totalCost,
        days_covered: newFuelLog.days_covered,
        fuel_date
      },
      ipAddress: req.ip || '127.0.0.1'
    });

    res.status(201).json({
      success: true,
      message: `Fuel log of ${liters}L (${totalCost} ${currency}) recorded successfully.`,
      data: newFuelLog
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List fuel consumption logs with filtering and analytics summary
 */
export async function getFuelLogs(req, res, next) {
  try {
    const store = getStore();
    const { vehicle_id, driver_id, project_id, trip_assignment_id } = req.query;

    let logs = store.fuel_logs || [];

    // Role-based scoping
    if (req.user.role === 'SYSTEM_ADMIN') {
      if (project_id) logs = logs.filter(l => l.project_id === project_id);
    } else if (req.user.role === 'MASTER_PERSON') {
      const assignedIds = store.master_person_projects
        ?.filter(m => m.user_id === req.user.userId)
        .map(m => m.project_id) || [];
      const authorized = [...new Set([req.user.projectId, ...assignedIds].filter(Boolean))];
      logs = logs.filter(l => authorized.includes(l.project_id));
      if (project_id && authorized.includes(project_id)) {
        logs = logs.filter(l => l.project_id === project_id);
      }
    } else if (req.user.role === 'DRIVER') {
      // Drivers see their own logs or logs for their assigned project
      logs = logs.filter(l => l.recorded_by_user_id === req.user.userId || l.project_id === req.user.projectId);
    } else {
      logs = logs.filter(l => l.project_id === req.user.projectId);
    }

    if (vehicle_id) logs = logs.filter(l => l.vehicle_id === vehicle_id);
    if (driver_id) logs = logs.filter(l => l.driver_id === driver_id);
    if (trip_assignment_id) logs = logs.filter(l => l.trip_assignment_id === trip_assignment_id);

    let totalLiters = 0;
    let totalCost = 0;

    const enriched = logs.map(log => {
      totalLiters += log.liters || 0;
      totalCost += log.cost || 0;

      const vehicle = store.vehicles.find(v => v.id === log.vehicle_id);
      const recorder = store.users.find(u => u.id === log.recorded_by_user_id);
      const driverRecord = log.driver_id ? store.drivers.find(d => d.id === log.driver_id) : null;
      const driverUser = driverRecord ? store.users.find(u => u.id === driverRecord.user_id) : null;

      return {
        ...log,
        vehicle_plate: vehicle?.plate_number || 'Unknown',
        vehicle_model: vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown',
        driver_name: driverUser?.full_name || recorder?.full_name || 'Driver',
        recorded_by_name: recorder?.full_name || 'System'
      };
    });

    res.json({
      success: true,
      count: enriched.length,
      summary: {
        total_liters: parseFloat(totalLiters.toFixed(2)),
        total_cost: parseFloat(totalCost.toFixed(2)),
        average_cost_per_liter: totalLiters > 0 ? parseFloat((totalCost / totalLiters).toFixed(2)) : 0
      },
      data: enriched
    });
  } catch (err) {
    next(err);
  }
}
