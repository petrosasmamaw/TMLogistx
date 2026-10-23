import { v4 as uuidv4 } from 'uuid';
import { getStore } from '../db/connection.js';
import { logAudit } from '../middleware/audit.js';

export async function getExpenses(req, res, next) {
  try {
    const store = getStore();
    const { vehicle_id, expense_type, project_id } = req.query;

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

    let expenses = store.vehicle_expenses.filter(e => targetProjectIds.includes(e.project_id));

    if (vehicle_id) expenses = expenses.filter(e => e.vehicle_id === vehicle_id);
    if (expense_type) expenses = expenses.filter(e => e.expense_type === expense_type.toUpperCase());

    const enriched = expenses.map(exp => {
      const vehicle = store.vehicles.find(v => v.id === exp.vehicle_id);
      const recordedBy = store.users.find(u => u.id === exp.recorded_by_user_id);
      return {
        ...exp,
        vehicle_plate: vehicle?.plate_number || 'Unknown',
        vehicle_model: vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown',
        recorded_by_name: recordedBy?.full_name || 'System'
      };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
}

export async function createExpense(req, res, next) {
  try {
    const {
      vehicle_id,
      expense_type,
      amount,
      currency = 'ETB',
      odometer_reading,
      receipt_url = null,
      description = '',
      expense_date = new Date().toISOString().split('T')[0]
    } = req.body;

    if (!vehicle_id || !expense_type || amount === undefined) {
      return res.status(400).json({ success: false, error: 'vehicle_id, expense_type, and amount are required' });
    }

    const validTypes = ['FUEL', 'MAINTENANCE', 'REPAIR', 'INSURANCE', 'OTHER'];
    if (!validTypes.includes(expense_type.toUpperCase())) {
      return res.status(400).json({ success: false, error: `Invalid expense_type. Must be one of: ${validTypes.join(', ')}` });
    }

    const store = getStore();
    const vehicle = store.vehicles.find(v => v.id === vehicle_id);
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    const newExpense = {
      id: 'exp-' + uuidv4().substring(0, 6),
      vehicle_id,
      project_id: vehicle.project_id,
      recorded_by_user_id: req.user.userId,
      expense_type: expense_type.toUpperCase(),
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      odometer_reading: odometer_reading ? parseFloat(odometer_reading) : null,
      receipt_url,
      description: description.trim(),
      expense_date,
      created_at: new Date()
    };

    store.vehicle_expenses.push(newExpense);

    // Update vehicle odometer if provided and greater than current
    if (newExpense.odometer_reading && newExpense.odometer_reading > vehicle.odometer_km) {
      vehicle.odometer_km = newExpense.odometer_reading;
      vehicle.updated_at = new Date();
    }

    await logAudit({
      userId: req.user.userId,
      action: 'EXPENSE_RECORDED',
      entityType: 'EXPENSE',
      entityId: newExpense.id,
      projectId: vehicle.project_id,
      newValues: {
        vehicle_plate: vehicle.plate_number,
        type: newExpense.expense_type,
        amount: newExpense.amount,
        currency: newExpense.currency
      },
      ipAddress: req.ip || '127.0.0.1'
    });

    res.status(201).json({ success: true, message: 'Expense recorded successfully', data: newExpense });
  } catch (err) {
    next(err);
  }
}

export async function getExpenseSummary(req, res, next) {
  try {
    const store = getStore();
    const { project_id } = req.query;

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

    const expenses = store.vehicle_expenses.filter(e => targetProjectIds.includes(e.project_id));

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

    const byType = {
      FUEL: expenses.filter(e => e.expense_type === 'FUEL').reduce((sum, e) => sum + e.amount, 0),
      MAINTENANCE: expenses.filter(e => e.expense_type === 'MAINTENANCE').reduce((sum, e) => sum + e.amount, 0),
      REPAIR: expenses.filter(e => e.expense_type === 'REPAIR').reduce((sum, e) => sum + e.amount, 0),
      INSURANCE: expenses.filter(e => e.expense_type === 'INSURANCE').reduce((sum, e) => sum + e.amount, 0),
      OTHER: expenses.filter(e => e.expense_type === 'OTHER').reduce((sum, e) => sum + e.amount, 0)
    };

    // By vehicle
    const byVehicleMap = {};
    expenses.forEach(e => {
      const vehicle = store.vehicles.find(v => v.id === e.vehicle_id);
      const label = vehicle ? `${vehicle.plate_number} (${vehicle.model})` : e.vehicle_id;
      if (!byVehicleMap[label]) byVehicleMap[label] = 0;
      byVehicleMap[label] += e.amount;
    });

    res.json({
      success: true,
      data: {
        totalSpent,
        currency: 'ETB',
        expenseCount: expenses.length,
        byType,
        byVehicle: Object.entries(byVehicleMap).map(([vehicle, total]) => ({ vehicle, total }))
      }
    });
  } catch (err) {
    next(err);
  }
}
