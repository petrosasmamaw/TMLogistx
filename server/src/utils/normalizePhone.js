/** Normalize phone for uniqueness checks (digits only). */
export function normalizePhone(phone) {
  if (phone == null || phone === '') return '';
  return String(phone).replace(/\D/g, '');
}

export function isValidPhone(phone) {
  const n = normalizePhone(phone);
  return n.length >= 9 && n.length <= 15;
}
