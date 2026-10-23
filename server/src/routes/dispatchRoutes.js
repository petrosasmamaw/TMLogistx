import { Router } from 'express';
import {
  getRecommendations,
  assignVehicle,
  assignExternalTransport,
  reassignTrip,
  cancelTripAssignment,
  authorizeExternalTransport,
  startExternalRide,
  completeExternalRide,
  getDriverStats,
  getDriverAssignments,
  acceptDriverAssignment,
  rejectDriverAssignment,
  startFleetTripMeter,
  completeFleetTripMeter
} from '../controllers/dispatchController.js';
import { authenticateJWT, requireRoles } from '../middleware/auth.js';
import { DISPATCH_ROLES } from '../constants/roles.js';

const router = Router();

router.use(authenticateJWT);

// Dispatch recommendations (Movement Officers, Coordinators, Master Persons, System Admin)
router.get(
  '/recommendations/:requestId',
  requireRoles(...DISPATCH_ROLES),
  getRecommendations
);

// Atomic Vehicle Assignment (Workflow C)
router.post(
  '/assign',
  requireRoles(...DISPATCH_ROLES),
  assignVehicle
);

// External Transport Recording (Workflow E: Uber / RIDE / Taxi)
router.post(
  '/external',
  requireRoles(...DISPATCH_ROLES),
  assignExternalTransport
);

// Movement Center authorizes & dispatches Uber / RIDE for Staff
router.post(
  '/authorize-external',
  requireRoles(...DISPATCH_ROLES),
  authorizeExternalTransport
);

// Staff Starts External Ride (captures starting coordinates and time)
router.post('/start-external', startExternalRide);

// Staff Ends External Ride (calculates distance, records fare, completes request)
router.post('/complete-external', completeExternalRide);

// Staff fleet trip meter (internal assigned vehicle)
router.post('/start-fleet-meter', startFleetTripMeter);
router.post('/complete-fleet-meter', completeFleetTripMeter);

// Driver mobile console
router.get('/driver-stats', requireRoles('DRIVER'), getDriverStats);
router.get('/driver-assignments', requireRoles('DRIVER'), getDriverAssignments);
router.post('/accept', requireRoles('DRIVER'), acceptDriverAssignment);
router.post('/reject', requireRoles('DRIVER'), rejectDriverAssignment);

// Trip Reassignment (Workflow F: change vehicle, driver, or both)
router.post(
  '/reassign',
  requireRoles(...DISPATCH_ROLES),
  reassignTrip
);

// Cancel Trip Assignment (Frees vehicle and driver back to AVAILABLE)
router.post(
  '/cancel-assignment',
  requireRoles(...DISPATCH_ROLES),
  cancelTripAssignment
);

export default router;
