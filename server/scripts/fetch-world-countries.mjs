import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TZ_BY_CODE = {
  ET: 'Africa/Addis_Ababa',
  KE: 'Africa/Nairobi',
  UG: 'Africa/Kampala',
  TZ: 'Africa/Dar_es_Salaam',
  RW: 'Africa/Kigali',
  SS: 'Africa/Juba',
  SO: 'Africa/Mogadishu',
  DJ: 'Africa/Djibouti',
  ER: 'Africa/Asmara',
  SD: 'Africa/Khartoum',
  EG: 'Africa/Cairo',
  ZA: 'Africa/Johannesburg',
  NG: 'Africa/Lagos',
  GH: 'Africa/Accra',
  US: 'America/New_York',
  GB: 'Europe/London',
  FR: 'Europe/Paris',
  DE: 'Europe/Berlin',
  IN: 'Asia/Kolkata',
  CN: 'Asia/Shanghai',
  AE: 'Asia/Dubai',
  SA: 'Asia/Riyadh'
};

const CURRENCY_BY_CODE = {
  ET: 'ETB',
  KE: 'KES',
  UG: 'UGX',
  TZ: 'TZS',
  RW: 'RWF',
  US: 'USD',
  GB: 'GBP',
  EU: 'EUR'
};

const res = await fetch(
  'https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json'
);
const rows = await res.json();
const list = rows
  .map((r) => {
    const code = r['alpha-2'];
    return {
      name: r.name,
      code,
      currency: CURRENCY_BY_CODE[code] || 'USD',
      timezone: TZ_BY_CODE[code] || 'UTC'
    };
  })
  .filter((c) => c.name && c.code)
  .sort((a, b) => a.name.localeCompare(b.name));

const out = path.join(__dirname, '../src/data/worldCountries.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(list));
console.log('wrote', list.length, 'countries');
