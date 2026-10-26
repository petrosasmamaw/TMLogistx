export const DEFAULT_DAY_SHIFT_START = '08:00';
export const DEFAULT_DAY_SHIFT_END = '17:30';

/** 24h "HH:mm" → "8:00 AM" */
export function formatShiftTime12(hm) {
  if (!hm) return '';
  const [h, m] = String(hm).split(':').map((x) => parseInt(x, 10) || 0);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function formatDayShiftRange(country) {
  const start = country?.day_shift_start || DEFAULT_DAY_SHIFT_START;
  const end = country?.day_shift_end || DEFAULT_DAY_SHIFT_END;
  return `${formatShiftTime12(start)} – ${formatShiftTime12(end)}`;
}
