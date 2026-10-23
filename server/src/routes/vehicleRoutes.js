import { Router } from 'express';
import { getVehicles, getVehicleById, createVehicle, updateVehicle } from '../controllers/vehicleController.js';
import { authenticateJWT, requireRoles } from '../middleware/auth.js';
import { FLEET_MANAGEMENT_ROLES } from '../constants/roles.js';

const router = Router();

router.use(authenticateJWT);

// View fleet
router.get('/', getVehicles);
router.get('/:id', getVehicleById);

// Fleet mutations
router.post(
  '/',
  requireRoles(...FLEET_MANAGEMENT_ROLES),
  createVehicle
);
router.patch('/:id', requireRoles(...FLEET_MANAGEMENT_ROLES), updateVehicle);

export default router;
