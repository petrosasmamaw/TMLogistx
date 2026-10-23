import { v4 as uuidv4 } from 'uuid';
import {
  applyDriverShiftType,
  DRIVER_SHIFT_DAY
} from '../constants/driverShifts.js';

/**
 * Ensure a store.drivers row exists for a DRIVER user (create or update from body).
 */
export function ensureDriverProfile(store, user, body = {}) {
  if (!user || user.role !== 'DRIVER') return null;
  if (!user.project_id) return null;

  if (!store.drivers) store.drivers = [];

  let driver = store.drivers.find((d) => d.user_id === user.id);
  const now = new Date();

  const shiftFromBody = applyDriverShiftType(body.shift_type || driver?.shift_type || DRIVER_SHIFT_DAY);

  if (!driver) {
    driver = {
      id: `drv-${uuidv4().substring(0, 8)}`,
      user_id: user.id,
      project_id: user.project_id,
      license_number:
        body.license_number?.trim() || `ET-LIC-${Math.floor(10000 + Math.random() * 90000)}`,
      license_category: body.license_category || 'Public Transport Grade 3',
      license_expiry: body.license_expiry || '2028-12-31',
      assigned_vehicle_id: body.assigned_vehicle_id || null,
      availability_status: 'AVAILABLE',
      ...shiftFromBody,
      total_trips_completed: 0,
      rating: 5.0,
      created_at: now,
      updated_at: now
    };
    store.drivers.push(driver);
    return driver;
  }

  if (body.license_number?.trim()) driver.license_number = body.license_number.trim();
  if (body.license_category) driver.license_category = body.license_category;
  if (body.license_expiry) driver.license_expiry = body.license_expiry;
  if (body.shift_type !== undefined) {
    Object.assign(driver, applyDriverShiftType(body.shift_type));
  } else if (!driver.shift_type) {
    Object.assign(driver, applyDriverShiftType(DRIVER_SHIFT_DAY));
  }
  if (body.assigned_vehicle_id !== undefined) driver.assigned_vehicle_id = body.assigned_vehicle_id || null;
  if (driver.project_id !== user.project_id) driver.project_id = user.project_id;
  driver.updated_at = now;
  return driver;
}

/** Backfill driver profiles for DRIVER users missing a drivers row (project scope). */
export function repairDriverProfilesForProjects(store, projectIds = []) {
  if (!projectIds.length) return 0;
  let repaired = 0;
  for (const user of store.users || []) {
    if (user.role !== 'DRIVER') continue;
    const drv = store.drivers?.find((d) => d.user_id === user.id);
    const inScope =
      projectIds.includes(user.project_id) ||
      (drv?.project_id && projectIds.includes(drv.project_id));
    if (!inScope) continue;
    if (!drv) {
      ensureDriverProfile(store, user, { project_id: user.project_id || drv?.project_id });
      repaired += 1;
    }
  }
  return repaired;
}
