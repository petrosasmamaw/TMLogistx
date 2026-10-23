import { getStore } from '../db/connection.js';
import { filterBySiteId } from '../utils/projectScope.js';
import { logAudit } from '../middleware/audit.js';

/**
 * List personal trip fuel liabilities and repayments
 * Top Admins and Coordinators can see all; Staff can see their own
 */
export async function getPersonalFuelRecoveries(req, res, next) {
  try {
    const store = getStore();
    const { status, staff_id, project_id, site_id } = req.query;

    let records = store.personal_fuel_recoveries || [];

    // Role-based visibility
    if (req.user.role === 'STAFF') {
      records = records.filter(r => r.staff_id === req.user.userId);
    } else if (req.user.role === 'SYSTEM_ADMIN') {
      if (project_id) records = records.filter(r => r.project_id === project_id);
    } else if (req.user.role === 'MASTER_PERSON') {
      const assignedIds = store.master_person_projects
        ?.filter(m => m.user_id === req.user.userId)
        .map(m => m.project_id) || [];
      const authorized = [...new Set([req.user.projectId, ...assignedIds].filter(Boolean))];
      records = records.filter(r => authorized.includes(r.project_id));
      if (project_id && authorized.includes(project_id)) {
        records = records.filter(r => r.project_id === project_id);
      }
    } else {
      records = records.filter(r => r.project_id === req.user.projectId);
    }

    if (status) records = records.filter(r => r.status === status.toUpperCase());
    if (staff_id) records = records.filter(r => r.staff_id === staff_id);
    if (site_id && site_id !== 'ALL') {
      records = filterBySiteId(records, site_id, { store, staffKey: 'staff_id' });
    }

    let totalPendingAmount = 0;
    let totalRecoveredAmount = 0;

    const enriched = records.map(rec => {
      if (rec.status === 'PENDING_PAYMENT') {
        totalPendingAmount += rec.total_amount_due || 0;
      } else if (rec.status === 'PAID') {
        totalRecoveredAmount += rec.total_amount_due || 0;
      }

      const staff = store.users.find(u => u.id === rec.staff_id);
      const vehicle = store.vehicles.find(v => v.id === rec.vehicle_id);
      const request = store.movement_requests.find(r => r.id === rec.request_id);
      const verifier = rec.verified_by_user_id ? store.users.find(u => u.id === rec.verified_by_user_id) : null;

      const isPaid = rec.status === 'PAID' || rec.settlement_status === 'PAID';
      const amountDue = rec.total_amount_due ?? rec.amount_billed_etb;
      const fuelLiters = rec.estimated_fuel_liters ?? rec.fuel_consumed_liters;

      return {
        ...rec,
        total_amount_due: amountDue,
        amount_billed_etb: amountDue,
        estimated_fuel_liters: fuelLiters,
        fuel_consumed_liters: fuelLiters,
        status: isPaid ? 'PAID' : 'PENDING_PAYMENT',
        settlement_status: isPaid ? 'PAID' : 'UNPAID',
        staff_name: staff?.full_name || 'Staff Member',
        staff_email: staff?.email || '',
        staff_phone: staff?.phone_number || '',
        vehicle_plate: vehicle?.plate_number || 'N/A',
        vehicle_model: vehicle ? `${vehicle.make} ${vehicle.model}` : 'N/A',
        request_code: request?.request_code || 'N/A',
        pickup_address: request?.pickup_address || '',
        destination_address: request?.destination_address || '',
        verified_by_name: verifier?.full_name || null
      };
    });

    res.json({
      success: true,
      count: enriched.length,
      summary: {
        total_pending_amount: parseFloat(totalPendingAmount.toFixed(2)),
        total_recovered_amount: parseFloat(totalRecoveredAmount.toFixed(2)),
        currency: 'ETB'
      },
      data: enriched
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Mark personal fuel usage as PAID
 * Accessible by Top Admins (SYSTEM_ADMIN, MASTER_PERSON)
 */
export async function markPersonalFuelPaid(req, res, next) {
  try {
    const { id } = req.params;
    const { payment_reference = '', notes = '', paid_at = new Date() } = req.body;

    const store = getStore();
    const record = (store.personal_fuel_recoveries || []).find(r => r.id === id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Personal fuel recovery record not found' });
    }

    if (record.status === 'PAID') {
      return res.status(400).json({ success: false, error: 'Record is already marked as PAID' });
    }

    record.status = 'PAID';
    record.settlement_status = 'PAID';
    record.paid_at = new Date(paid_at);
    record.settled_at = new Date(paid_at);
    record.payment_reference = payment_reference.trim() || `Receipt verified by ${req.user.email}`;
    record.verified_by_user_id = req.user.userId;
    if (notes) {
      record.notes = (record.notes ? record.notes + ' | ' : '') + notes;
    }

    await logAudit({
      userId: req.user.userId,
      action: 'PERSONAL_FUEL_PAYMENT_CONFIRMED',
      entityType: 'PERSONAL_FUEL_RECOVERY',
      entityId: record.id,
      projectId: record.project_id,
      newValues: {
        amount_paid: record.total_amount_due,
        currency: record.currency,
        payment_reference: record.payment_reference
      },
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({
      success: true,
      message: `Personal trip fuel liability of ${record.total_amount_due} ${record.currency} marked as PAID.`,
      data: record
    });
  } catch (err) {
    next(err);
  }
}
