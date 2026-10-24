import { config } from '../config/index.js';

/** Local dev / Expo on LAN (e.g. http://10.0.0.5:8081) */
const DEV_LAN_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$/i;

/** Expo Go / dev client */
const EXPO_DEV_ORIGIN = /^exp:\/\//i;

function isListedOrigin(origin) {
  return config.corsOrigins.includes(origin);
}

export function isOriginAllowed(origin) {
  if (!origin) {
    return config.corsAllowNoOrigin;
  }
  if (config.corsAllowAll) {
    return true;
  }
  if (isListedOrigin(origin)) {
    return true;
  }
  if (config.corsDevLan && config.nodeEnv !== 'production' && DEV_LAN_ORIGIN.test(origin)) {
    return true;
  }
  if (config.corsAllowExpo && EXPO_DEV_ORIGIN.test(origin)) {
    return true;
  }
  return false;
}

/** Express `cors` origin callback */
export function corsOriginCallback(origin, callback) {
  if (isOriginAllowed(origin)) {
    return callback(null, true);
  }
  if (origin) {
    console.warn(`[CORS] Blocked browser origin: ${origin}`);
  }
  return callback(null, false);
}

export function buildExpressCorsOptions() {
  return {
    origin: corsOriginCallback,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86400
  };
}

export function buildSocketCorsOptions() {
  const origins = config.corsAllowAll
    ? '*'
    : config.corsOrigins.length
      ? config.corsOrigins
      : true;
  return {
    origin: origins,
    methods: ['GET', 'POST'],
    credentials: true
  };
}
