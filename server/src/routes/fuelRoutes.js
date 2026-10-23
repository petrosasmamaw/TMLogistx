import { Router } from 'express';
import { logFuel, getFuelLogs } from '../controllers/fuelController.js';
import { authenticateJWT, requireRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticateJWT);

// GET /api/fuel - List fuel logs with analytics
router.get('/', getFuelLogs);

// POST /api/fuel and /api/fuel/log - Log fuel (Drivers, Movement Officers, Logistics Coordinators, Admins)
router.post(
  '/',
  requireRoles('DRIVER', 'MOVEMENT_OFFICER', 'LOGISTICS_COORDINATOR', 'MASTER_PERSON', 'SYSTEM_ADMIN'),
  logFuel
);

router.post(
  '/log',
  requireRoles('DRIVER', 'MOVEMENT_OFFICER', 'LOGISTICS_COORDINATOR', 'MASTER_PERSON', 'SYSTEM_ADMIN'),
  logFuel
);

export default router;

