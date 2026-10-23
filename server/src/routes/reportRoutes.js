import { Router } from 'express';
import {
  getVehicleUtilizationReport,
  getDriverPerformanceReport,
  getStaffMovementReport,
  getExternalTransportReport,
  exportReportData
} from '../controllers/reportController.js';
import { authenticateJWT, requireRoles, requireProjectScope } from '../middleware/auth.js';

const router = Router();

// All reporting endpoints require authentication and management roles
router.use(authenticateJWT);
router.use(requireRoles(['SYSTEM_ADMIN', 'MASTER_PERSON', 'LOGISTICS_COORDINATOR', 'MOVEMENT_OFFICER']));
router.use(requireProjectScope);

router.get('/vehicle-utilization', getVehicleUtilizationReport);
router.get('/driver-performance', getDriverPerformanceReport);
router.get('/staff-movement', getStaffMovementReport);
router.get('/external-transport', getExternalTransportReport);
router.get('/export', exportReportData);

export default router;
