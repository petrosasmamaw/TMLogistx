export const MOVEMENT_CENTER = 'MOVEMENT_CENTER';
export const MOVEMENT_OFFICER_LEGACY = 'MOVEMENT_OFFICER';

export function normalizeRole(role) {
  if (role === MOVEMENT_OFFICER_LEGACY) return MOVEMENT_CENTER;
  return role;
}

export const ROLE_LABELS = {
  SYSTEM_ADMIN: 'System Admin',
  MASTER_PERSON: 'Master Person',
  LOGISTICS_COORDINATOR: 'Logistics Coordinator',
  MOVEMENT_CENTER: 'Movement Center',
  MOVEMENT_OFFICER: 'Movement Center',
  STAFF: 'Staff',
  DRIVER: 'Driver'
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || ROLE_LABELS[normalizeRole(role)] || role;
}

export function isMovementCenter(role) {
  return normalizeRole(role) === MOVEMENT_CENTER;
}

export function isLogisticsCoordinator(role) {
  return role === 'LOGISTICS_COORDINATOR';
}
