import { Router } from 'express';
import {
  recordAccident,
  getAccidents,
  updateAccidentStatus,
  getDriverAccidentContext
} from '../controllers/accidentController.js';
import { authenticateJWT, requireRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticateJWT);

// GET /api/accidents - List accidents (All authenticated users can view)
router.get('/', getAccidents);

router.get('/driver-context', requireRoles('DRIVER'), getDriverAccidentContext);

// POST /api/accidents and /api/accidents/report - Record an accident
router.post(
  '/',
  requireRoles('DRIVER', 'MOVEMENT_OFFICER', 'LOGISTICS_COORDINATOR', 'MASTER_PERSON', 'SYSTEM_ADMIN'),
  recordAccident
);

router.post(
  '/report',
  requireRoles('DRIVER', 'MOVEMENT_OFFICER', 'LOGISTICS_COORDINATOR', 'MASTER_PERSON', 'SYSTEM_ADMIN'),
  recordAccident
);

// PATCH /api/accidents/:id and /api/accidents/:id/status - Update accident status
router.patch(
  '/:id',
  requireRoles('MOVEMENT_OFFICER', 'LOGISTICS_COORDINATOR', 'MASTER_PERSON', 'SYSTEM_ADMIN'),
  updateAccidentStatus
);

router.patch(
  '/:id/status',
  requireRoles('MOVEMENT_OFFICER', 'LOGISTICS_COORDINATOR', 'MASTER_PERSON', 'SYSTEM_ADMIN'),
  updateAccidentStatus
);

export default router;
