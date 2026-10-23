import { Router } from 'express';
import { getProjects, createProject, updateProject, assignMasterPerson } from '../controllers/projectController.js';
import { getProjectSites, createProjectSite } from '../controllers/siteController.js';
import { authenticateJWT, requireRoles } from '../middleware/auth.js';

const router = Router();

// All project routes require authentication
router.use(authenticateJWT);

// Read projects (filtered according to role and authorized scope)
router.get('/', getProjects);

router.get('/:id/sites', getProjectSites);
router.post('/:id/sites', requireRoles('SYSTEM_ADMIN', 'MASTER_PERSON'), createProjectSite);

// Mutation routes strictly restricted to SYSTEM_ADMIN
router.post('/', requireRoles('SYSTEM_ADMIN'), createProject);
router.patch('/:id', requireRoles('SYSTEM_ADMIN'), updateProject);
router.post('/:id/assign-master', requireRoles('SYSTEM_ADMIN'), assignMasterPerson);

export default router;
