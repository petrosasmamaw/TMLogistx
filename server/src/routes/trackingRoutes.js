import { Router } from 'express';
import {
  updateGpsLocation,
  getLiveFleet,
  updateTripStatus,
  reportIncident,
  getTripTracking
} from '../controllers/trackingController.js';
import { authenticateJWT, requireRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticateJWT);

// Live Fleet overview with stale detection (Web Management Portal)
router.get('/live-fleet', getLiveFleet);

// Live trip tracking (Staff tracking assigned vehicle or driver tracking active assignment)
router.get('/trip/:assignmentId', getTripTracking);

// Driver pushes GPS location
router.post('/gps', requireRoles('DRIVER', 'SYSTEM_ADMIN'), updateGpsLocation);

// Driver trip status stepper
router.patch('/trip-status/:assignmentId', requireRoles('DRIVER', 'MOVEMENT_OFFICER', 'SYSTEM_ADMIN'), updateTripStatus);
router.patch('/trip/:assignmentId/status', requireRoles('DRIVER', 'MOVEMENT_OFFICER', 'SYSTEM_ADMIN'), updateTripStatus);
router.post('/trip/:assignmentId/complete', requireRoles('DRIVER', 'MOVEMENT_OFFICER', 'SYSTEM_ADMIN'), (req, res, next) => {
  req.body.status = 'COMPLETED';
  updateTripStatus(req, res, next);
});

// Driver reports breakdown or delay
router.post('/report-incident/:assignmentId', requireRoles('DRIVER', 'MOVEMENT_OFFICER', 'SYSTEM_ADMIN'), reportIncident);

export default router;
