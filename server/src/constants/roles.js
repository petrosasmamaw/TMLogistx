/** Legacy DB/JWT value — treated as Movement Center */
export const MOVEMENT_OFFICER_LEGACY = 'MOVEMENT_OFFICER';

export const MOVEMENT_CENTER = 'MOVEMENT_CENTER';
export const LOGISTICS_COORDINATOR = 'LOGISTICS_COORDINATOR';

export function normalizeRole(role) {
  if (role === MOVEMENT_OFFICER_LEGACY) return MOVEMENT_CENTER;
  return role;
}

export function roleInList(role, allowed = []) {
  const normalized = normalizeRole(role);
  return allowed.some((r) => normalizeRole(r) === normalized);
}

/** Dispatch console: staff movement requests, assign fleet or Uber */
export const DISPATCH_ROLES = [MOVEMENT_CENTER, MOVEMENT_OFFICER_LEGACY, 'MASTER_PERSON', 'SYSTEM_ADMIN'];

/** Fleet inventory, drivers, schedules, expenses (Logistics Coordinator — not Movement Center) */
export const FLEET_MANAGEMENT_ROLES = [
  LOGISTICS_COORDINATOR,
  'MASTER_PERSON',
  'SYSTEM_ADMIN'
];

/** Read fleet map / live telemetry (both roles + master) */
export const FLEET_VIEW_ROLES = [
  LOGISTICS_COORDINATOR,
  MOVEMENT_CENTER,
  MOVEMENT_OFFICER_LEGACY,
  'MASTER_PERSON',
  'SYSTEM_ADMIN'
];
