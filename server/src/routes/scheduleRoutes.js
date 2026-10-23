import { Router } from 'express';
import { getSchedules, createSchedule, checkAvailability } from '../controllers/scheduleController.js';
import { authenticateJWT, requireRoles } from '../middleware/auth.js';
import { FLEET_MANAGEMENT_ROLES } from '../constants/roles.js';

const router = Router();

router.use(authenticateJWT);

// View and check availability
router.get('/', getSchedules);
router.get('/check-availability', checkAvailability);

// Mutation routes
router.post('/', requireRoles(...FLEET_MANAGEMENT_ROLES), createSchedule);

export default router;
