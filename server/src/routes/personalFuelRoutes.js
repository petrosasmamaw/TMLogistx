import { Router } from 'express';
import { getPersonalFuelRecoveries, markPersonalFuelPaid } from '../controllers/personalFuelController.js';
import { authenticateJWT, requireRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticateJWT);

// GET /api/personal-fuel - List personal fuel liabilities
router.get('/', getPersonalFuelRecoveries);

// PATCH /api/personal-fuel/:id/pay and /api/personal-fuel/:id/mark-paid - Mark as PAID
router.patch(
  '/:id/pay',
  requireRoles('MASTER_PERSON', 'SYSTEM_ADMIN'),
  markPersonalFuelPaid
);

router.patch(
  '/:id/mark-paid',
  requireRoles('MASTER_PERSON', 'SYSTEM_ADMIN'),
  markPersonalFuelPaid
);

export default router;
