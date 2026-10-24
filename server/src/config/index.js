import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const defaultDevOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8081',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8081'
];

function parseCorsOrigins(raw) {
  if (!raw || !String(raw).trim()) {
    return isProduction ? [] : defaultDevOrigins;
  }
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv,
  isProduction,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'tmlogistx_demo_secret_key_change_in_production_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  geoapifyApiKey: process.env.GEOAPIFY_API_KEY || '61c689f487934d369f1b58ee421ef8d3',
  /** Comma-separated in CORS_ORIGIN — set your Render web URL when you deploy */
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  /** React Native / installable app API calls usually send no Origin header */
  corsAllowNoOrigin: process.env.CORS_ALLOW_NO_ORIGIN !== 'false',
  /** Expo Go (exp://) — safe to keep on in production if you use Expo dev builds */
  corsAllowExpo: process.env.CORS_ALLOW_EXPO !== 'false',
  /** Dev only: allow localhost + LAN IPs without listing each one */
  corsDevLan: process.env.CORS_DEV_LAN !== 'false',
  /** Never use in production on Render */
  corsAllowAll:
    !isProduction &&
    (process.env.CORS_ALLOW_ALL === 'true' || process.env.CORS_ALLOW_ALL === '1'),
  gpsStaleThresholdMinutes: parseInt(process.env.GPS_STALE_THRESHOLD_MINUTES || '5', 10),
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'ETB',
  autoDispatchEnabled: process.env.AUTO_DISPATCH_ENABLED === 'true',
  publicApiUrl: process.env.PUBLIC_API_URL || ''
};

export default config;
