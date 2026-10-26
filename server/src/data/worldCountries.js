import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(path.join(__dirname, 'worldCountries.json'), 'utf8'));

/** @type {{ name: string, code: string, currency: string, timezone: string }[]} */
export const WORLD_COUNTRIES = raw;

export function searchWorldCountries(query, limit = 30) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return WORLD_COUNTRIES.slice(0, limit);
  return WORLD_COUNTRIES.filter(
    (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
  ).slice(0, limit);
}

export function findWorldCountryByCode(code) {
  const c = String(code || '').trim().toUpperCase();
  return WORLD_COUNTRIES.find((row) => row.code === c) || null;
}
