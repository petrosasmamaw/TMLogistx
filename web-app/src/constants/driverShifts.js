export const DRIVER_SHIFT_DAY = 'NORMAL_DAY';
export const DRIVER_SHIFT_NIGHT = 'NIGHT_SHIFT';
export const DRIVER_SHIFT_WEEKEND = 'WEEKEND';

export const DRIVER_SHIFT_OPTIONS = [
  { value: DRIVER_SHIFT_DAY, label: 'Day shift', hint: 'Weekday daytime' },
  { value: DRIVER_SHIFT_NIGHT, label: 'Night shift', hint: 'Evening / overnight' },
  { value: DRIVER_SHIFT_WEEKEND, label: 'Weekend shift', hint: 'Saturday & Sunday' }
];

export function normalizeDriverShiftType(raw) {
  const s = String(raw || '').trim().toUpperCase();
  if (s === 'DAY' || s === 'NORMAL_DAY' || s === 'NORMAL') return DRIVER_SHIFT_DAY;
  if (s === 'NIGHT' || s === 'NIGHT_SHIFT') return DRIVER_SHIFT_NIGHT;
  if (s === 'WEEKEND') return DRIVER_SHIFT_WEEKEND;
  return DRIVER_SHIFT_DAY;
}

export function driverShiftLabel(shiftType) {
  const t = normalizeDriverShiftType(shiftType);
  const opt = DRIVER_SHIFT_OPTIONS.find((o) => o.value === t);
  return opt?.label || 'Day shift';
}
