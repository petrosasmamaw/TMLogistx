import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import db, { getStore } from '../db/connection.js';
import { roleInList } from '../constants/roles.js';

/**
 * Middleware: Verify Bearer JWT Token
 */
export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid authorization token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Token expired or invalid', details: err.message });
  }
}

/**
 * Middleware: Enforce Role-Based Access Control (RBAC)
 * @param  {...string} allowedRoles 
 */
export function requireRoles(...allowedRoles) {
  const roles = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
    }

    if (!roleInList(req.user.role, roles)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Action requires one of [${roles.join(', ')}]. Current role: '${req.user.role}'`
      });
    }

    next();
  };
}

/**
 * Middleware: Enforce Multi-Tenant Project Scope Isolation
 * Guarantees that users cannot query or mutate data from projects they do not own.
 */
export async function requireProjectScope(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
  }

  // System Admin has universal platform-wide scope
  if (req.user.role === 'SYSTEM_ADMIN') {
    return next();
  }

  // Extract requested target projectId from params, query, or body
  const targetProjectId = req.params.projectId || req.query.projectId || req.body.projectId;

  // If no specific project is targeted, proceed (individual controller will filter by req.user.projectId)
  if (!targetProjectId) {
    return next();
  }

  // Master Person: Check primary project or assigned project list
  if (req.user.role === 'MASTER_PERSON') {
    if (req.user.projectId === targetProjectId) {
      return next();
    }

    // Check junction table master_person_projects
    const store = getStore();
    const isAssigned = store.master_person_projects?.some(
      mpp => mpp.user_id === req.user.userId && mpp.project_id === targetProjectId
    );

    if (isAssigned) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Forbidden: Master Person '${req.user.email}' is not authorized to access project '${targetProjectId}'`
    });
  }

  // Other roles (Logistics Coordinator, Movement Officer, Staff, Driver):
  // Strictly bound to their single assigned project
  if (req.user.projectId !== targetProjectId) {
    return res.status(403).json({
      success: false,
      error: `Forbidden: User is bound to project '${req.user.projectId}' and cannot access '${targetProjectId}'`
    });
  }

  next();
}
