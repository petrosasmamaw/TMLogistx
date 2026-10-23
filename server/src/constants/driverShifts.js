export const DRIVER_SHIFT_DAY = 'NORMAL_DAY';
export const DRIVER_SHIFT_NIGHT = 'NIGHT_SHIFT';
export const DRIVER_SHIFT_WEEKEND = 'WEEKEND';

export const DRIVER_SHIFT_TYPES = [DRIVER_SHIFT_DAY, DRIVER_SHIFT_NIGHT, DRIVER_SHIFT_WEEKEND];

const SHIFT_WINDOWS = {
  [DRIVER_SHIFT_DAY]: { shift_start_time: '08:00:00', shift_end_time: '18:00:00' },
  [DRIVER_SHIFT_NIGHT]: { shift_start_time: '18:00:00', shift_end_time: '06:00:00' },
  [DRIVER_SHIFT_WEEKEND]: { shift_start_time: '09:00:00', shift_end_time: '17:00:00' }
};

export function normalizeDriverShiftType(raw) {
  const s = String(raw || '').trim().toUpperCase();
  if (s === 'DAY' || s === 'NORMAL_DAY' || s === 'NORMAL') return DRIVER_SHIFT_DAY;
  if (s === 'NIGHT' || s === 'NIGHT_SHIFT') return DRIVER_SHIFT_NIGHT;
  if (s === 'WEEKEND') return DRIVER_SHIFT_WEEKEND;
  return DRIVER_SHIFT_DAY;
}

/** Apply canonical shift_type and default time window (for dispatch / legacy fields). */
export function applyDriverShiftType(shiftTypeRaw) {
  const shift_type = normalizeDriverShiftType(shiftTypeRaw);
  const w = SHIFT_WINDOWS[shift_type] || SHIFT_WINDOWS[DRIVER_SHIFT_DAY];
  return {
    shift_type,
    shift_start_time: w.shift_start_time,
    shift_end_time: w.shift_end_time,
    is_weekend_eligible: shift_type === DRIVER_SHIFT_WEEKEND
  };
}

export function driverShiftLabel(shiftType) {
  const t = normalizeDriverShiftType(shiftType);
  if (t === DRIVER_SHIFT_NIGHT) return 'Night shift';
  if (t === DRIVER_SHIFT_WEEKEND) return 'Weekend shift';
  return 'Day shift';
}
