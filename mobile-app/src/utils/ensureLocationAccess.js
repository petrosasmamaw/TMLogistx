import { ensureLocationAndNotifications } from './tripPermissions';

/** Location + notifications — both are requested when either is missing. */
export async function ensureLocationAccess(purpose = 'your pickup and the live map') {
  return ensureLocationAndNotifications(purpose);
}

export { ensureLocationAndNotifications };
