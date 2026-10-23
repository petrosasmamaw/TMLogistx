import { v4 as uuidv4 } from 'uuid';
import db, { getStore } from '../db/connection.js';

/**
 * Log sensitive operational actions into the audit_logs table
 */
export async function logAudit({
  userId = null,
  action,
  entityType,
  entityId = null,
  projectId = null,
  oldValues = null,
  newValues = null,
  ipAddress = '127.0.0.1'
}) {
  const auditEntry = {
    id: 'aud-' + uuidv4().substring(0, 8),
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    project_id: projectId,
    old_values: oldValues,
    new_values: newValues,
    ip_address: ipAddress,
    created_at: new Date()
  };

  try {
    if (db.isLiveDb && db.isLiveDb()) {
      await db.query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, project_id, old_values, new_values, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          auditEntry.id,
          auditEntry.user_id,
          auditEntry.action,
          auditEntry.entity_type,
          auditEntry.entity_id,
          auditEntry.project_id,
          JSON.stringify(auditEntry.old_values),
          JSON.stringify(auditEntry.new_values),
          auditEntry.ip_address,
          auditEntry.created_at
        ]
      );
    } else {
      const store = getStore();
      if (!store.audit_logs) store.audit_logs = [];
      store.audit_logs.unshift(auditEntry);
    }
  } catch (err) {
    console.error('[Audit Log Error] Failed to write audit record:', err.message);
  }

  return auditEntry;
}

export default { logAudit };
