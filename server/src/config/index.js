import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'tmlogistx_demo_secret_key_change_in_production_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  geoapifyApiKey: process.env.GEOAPIFY_API_KEY || '61c689f487934d369f1b58ee421ef8d3',
  corsOrigin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8081'],
  gpsStaleThresholdMinutes: parseInt(process.env.GPS_STALE_THRESHOLD_MINUTES || '5', 10),
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'ETB',
  autoDispatchEnabled: process.env.AUTO_DISPATCH_ENABLED === 'true'
};

export default config;
