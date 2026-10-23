import { Router } from 'express';
import { getDrivers, getDriverById, updateDriver, assignVehicleToDriver } from '../controllers/driverController.js';
import { authenticateJWT, requireRoles } from '../middleware/auth.js';
import { FLEET_MANAGEMENT_ROLES } from '../constants/roles.js';

const router = Router();

router.use(authenticateJWT);

// View drivers roster
router.get('/', getDrivers);
router.get('/:id', getDriverById);

// Driver management mutations
router.patch(
  '/:id',
  requireRoles(...FLEET_MANAGEMENT_ROLES),
  updateDriver
);
router.post(
  '/:id/assign-vehicle',
  requireRoles(...FLEET_MANAGEMENT_ROLES),
  assignVehicleToDriver
);

export default router;
