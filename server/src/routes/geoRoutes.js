import { Router } from 'express';
import { getPublicClientConfig, getProjectMapView, getDrivingRoute } from '../controllers/geoController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

router.get('/client-config', getPublicClientConfig);
router.get('/project-map-view', authenticateJWT, getProjectMapView);
router.get('/driving-route', authenticateJWT, getDrivingRoute);

export default router;
