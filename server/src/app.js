import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import countryRoutes from './routes/countryRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import userRoutes from './routes/userRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import driverRoutes from './routes/driverRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import dispatchRoutes from './routes/dispatchRoutes.js';
import trackingRoutes from './routes/trackingRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import accidentRoutes from './routes/accidentRoutes.js';
import fuelRoutes from './routes/fuelRoutes.js';
import policyRoutes from './routes/policyRoutes.js';
import personalFuelRoutes from './routes/personalFuelRoutes.js';
import siteRoutes from './routes/siteRoutes.js';
import db from './db/connection.js';

const app = express();

app.use(async (req, res, next) => {
  try {
    await db.ensureStoreReady();
    next();
  } catch (err) {
    next(err);
  }
});

// Security and utility middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Persist in-memory app data after successful writes (survives server/nodemon restarts)
app.use((req, res, next) => {
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (mutating && req.path.startsWith('/api') && !req.path.startsWith('/api/health')) {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        db.saveStore().catch((err) => {
          console.error('[Store] Persist after API write failed:', err.message);
        });
      }
    });
  }
  next();
});

// System Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'TMLogistx Central Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    currency: config.defaultCurrency,
    rolesSupported: ['SYSTEM_ADMIN', 'MASTER_PERSON', 'LOGISTICS_COORDINATOR', 'MOVEMENT_CENTER', 'MOVEMENT_OFFICER', 'STAFF', 'DRIVER'],
    persistence: db.isLiveDb() ? 'neon-postgres' : 'local-file'
  });
});

// Mount Core API Routes
app.use('/api/auth', authRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/accidents', accidentRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/personal-fuel', personalFuelRoutes);
app.use('/api/sites', siteRoutes);

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
