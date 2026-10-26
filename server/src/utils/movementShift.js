/** Movement request form bands: day shift vs night vs weekend (weekend uses night form). */

import { DEFAULT_DAY_SHIFT_START, DEFAULT_DAY_SHIFT_END } from '../constants/countryShiftDefaults.js';

export const MOVEMENT_SHIFT_DAY = 'DAY';
export const MOVEMENT_SHIFT_NIGHT = 'NIGHT';
export const MOVEMENT_SHIFT_WEEKEND = 'WEEKEND';

const DEFAULT_DAY_START = DEFAULT_DAY_SHIFT_START;
const DEFAULT_DAY_END = DEFAULT_DAY_SHIFT_END;
const DEFAULT_WEEKEND_DAYS = [0, 6]; // Sun, Sat (JS getDay)

function parseHm(hm) {
  const [h, m] = String(hm || '0:0').split(':').map((x) => parseInt(x, 10) || 0);
  return h * 60 + m;
}

export function getLocalTimeParts(date, timezone = 'UTC') {
  const d = date instanceof Date ? date : new Date(date);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = fmt.formatToParts(d);
  const bag = {};
  for (const p of parts) {
    if (p.type !== 'literal') bag[p.type] = p.value;
  }
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    hour: parseInt(bag.hour, 10) || 0,
    minute: parseInt(bag.minute, 10) || 0,
    weekday: weekdayMap[bag.weekday] ?? 0,
    dateLabel: `${bag.year}-${bag.month}-${bag.day}`
  };
}

export function formatLocalTimeLabel(date, timezone = 'UTC') {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(d);
}

export function resolveMovementShiftBand(country, at = new Date()) {
  const tz = country?.timezone || 'UTC';
  const weekendDays = Array.isArray(country?.weekend_days) && country.weekend_days.length
    ? country.weekend_days
    : DEFAULT_WEEKEND_DAYS;
  const dayStart = country?.day_shift_start || DEFAULT_DAY_START;
  const dayEnd = country?.day_shift_end || DEFAULT_DAY_END;

  const local = getLocalTimeParts(at, tz);
  if (weekendDays.includes(local.weekday)) {
    return MOVEMENT_SHIFT_WEEKEND;
  }
  const nowMin = local.hour * 60 + local.minute;
  const startMin = parseHm(dayStart);
  const endMin = parseHm(dayEnd);
  if (nowMin >= startMin && nowMin < endMin) {
    return MOVEMENT_SHIFT_DAY;
  }
  return MOVEMENT_SHIFT_NIGHT;
}

export function movementFormFieldKeys(shiftBand) {
  if (shiftBand === MOVEMENT_SHIFT_DAY) {
    return ['pickup', 'departure_time', 'purpose', 'destination', 'dropoff_or_wait'];
  }
  return ['pickup', 'departure_time', 'destination', 'dropoff_or_wait'];
}

export function movementShiftLabel(shiftBand) {
  switch (shiftBand) {
    case MOVEMENT_SHIFT_DAY:
      return 'Day shift';
    case MOVEMENT_SHIFT_NIGHT:
      return 'Night shift';
    case MOVEMENT_SHIFT_WEEKEND:
      return 'Weekend';
    default:
      return 'Shift';
  }
}

export const DROPOFF_WAIT_OPTIONS = [
  { value: 'DROP_OFF', label: 'Drop-off at destination' },
  { value: 'WAIT', label: 'Wait at destination' },
  { value: 'DROP_OFF_AND_WAIT', label: 'Drop-off and wait' }
];

/**
 * Combine local date (YYYY-MM-DD) + time (HH:mm) in country TZ to UTC ISO string.
 */
export function combineLocalDateTimeToUtc(dateStr, timeStr, timezone = 'UTC') {
  const [y, mo, d] = String(dateStr).split('-').map((n) => parseInt(n, 10));
  const [h, mi] = String(timeStr).split(':').map((n) => parseInt(n, 10) || 0);
  if (!y || !mo || !d) return new Date().toISOString();

  const probe = new Date(Date.UTC(y, mo - 1, d, h, mi, 0));
  const asUtc = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(probe);

  const bag = {};
  for (const p of asUtc) {
    if (p.type !== 'literal') bag[p.type] = p.value;
  }
  const shownH = parseInt(bag.hour, 10);
  const shownM = parseInt(bag.minute, 10);
  const diffMin = (h - shownH) * 60 + (mi - shownM);
  const corrected = new Date(probe.getTime() + diffMin * 60 * 1000);
  return corrected.toISOString();
}
