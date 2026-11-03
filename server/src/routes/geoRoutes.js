import { Router } from 'express';
import { getPublicClientConfig, getProjectMapView } from '../controllers/geoController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

router.get('/client-config', getPublicClientConfig);
router.get('/project-map-view', authenticateJWT, getProjectMapView);

export default router;
