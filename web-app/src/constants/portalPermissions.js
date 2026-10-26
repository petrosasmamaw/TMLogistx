/**
 * Web portal capabilities by role — keep nav items and header actions in sync (no duplicate CTAs).
 */

export const PORTAL_CAPABILITIES = {
  SYSTEM_ADMIN: {
    registerVehicle: false,
    registerDriver: false,
    registerStaff: true,
    dispatchTrips: false,
    recordExpense: false
  },
  MASTER_PERSON: {
    registerVehicle: false,
    registerDriver: false,
    registerStaff: true,
    dispatchTrips: false,
    recordExpense: false
  },
  LOGISTICS_COORDINATOR: {
    registerVehicle: true,
    registerDriver: true,
    registerStaff: false,
    dispatchTrips: false,
    recordExpense: true
  },
  MOVEMENT_CENTER: {
    registerVehicle: false,
    registerDriver: false,
    registerStaff: false,
    dispatchTrips: true,
    recordExpense: false
  },
  MOVEMENT_OFFICER: {
    registerVehicle: false,
    registerDriver: false,
    registerStaff: false,
    dispatchTrips: true,
    recordExpense: false
  }
};

export function getPortalCapabilities(role) {
  return PORTAL_CAPABILITIES[role] || PORTAL_CAPABILITIES.MOVEMENT_CENTER;
}

/** Which primary action belongs in the page header (one per section, not global). */
export function logisticsHeaderActionForSection(section, role) {
  const caps = getPortalCapabilities(role);
  if (section === 'vehicles' && caps.registerVehicle) return 'registerVehicle';
  if (section === 'expenses' && caps.recordExpense) return 'recordExpense';
  return null;
}
