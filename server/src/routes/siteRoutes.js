import { Router } from 'express';
import { authenticateJWT, requireRoles } from '../middleware/auth.js';
import {
  getProjectSites,
  createProjectSite,
  updateProjectSite,
  assignSiteLeads,
  listAccessibleSites
} from '../controllers/siteController.js';

const router = Router();

router.use(authenticateJWT);

router.get('/accessible', listAccessibleSites);
router.get('/projects/:projectId/sites', getProjectSites);
router.post(
  '/projects/:projectId/sites',
  requireRoles('SYSTEM_ADMIN', 'MASTER_PERSON'),
  createProjectSite
);
router.patch(
  '/:id/leads',
  requireRoles('SYSTEM_ADMIN', 'MASTER_PERSON'),
  assignSiteLeads
);
router.patch(
  '/:id',
  requireRoles('SYSTEM_ADMIN', 'MASTER_PERSON'),
  updateProjectSite
);

export default router;
