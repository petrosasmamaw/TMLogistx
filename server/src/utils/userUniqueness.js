import { normalizePhone, isValidPhone } from './normalizePhone.js';

export function findUserByEmail(store, email, excludeUserId = null) {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  return store.users.find((u) => u.id !== excludeUserId && u.email?.toLowerCase() === e) || null;
}

export function findUserByPhone(store, phone, excludeUserId = null) {
  const n = normalizePhone(phone);
  if (!n || n.length < 8) return null;
  return (
    store.users.find(
      (u) => u.id !== excludeUserId && normalizePhone(u.phone_number) === n
    ) || null
  );
}

export function assertUniqueUserContact(store, { email, phone_number, excludeUserId, requirePhone = false }) {
  if (email && findUserByEmail(store, email, excludeUserId)) {
    const err = new Error('A user with this email address already exists');
    err.status = 400;
    throw err;
  }
  if (requirePhone && !isValidPhone(phone_number)) {
    const err = new Error('A valid phone number is required');
    err.status = 400;
    throw err;
  }
  if (phone_number && findUserByPhone(store, phone_number, excludeUserId)) {
    const err = new Error('A user with this phone number already exists');
    err.status = 400;
    throw err;
  }
}
