import { Router } from 'express';
import { getPolicies, getMyPolicy, updatePolicy, createPolicy, acceptPolicy } from '../controllers/policyController.js';
import { authenticateJWT, requireRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticateJWT);

// GET /api/policies - All policies
router.get('/', getPolicies);

// GET /api/policies/my - Authenticated user's role policy
router.get('/my', getMyPolicy);

// POST /api/policies - Create policy (Top Admins)
router.post('/', requireRoles('MASTER_PERSON', 'SYSTEM_ADMIN'), createPolicy);

// PUT /api/policies/:id - Update policy content (Top Admins)
router.put('/:id', requireRoles('MASTER_PERSON', 'SYSTEM_ADMIN'), updatePolicy);

// POST /api/policies/:id/accept and /api/policies/accept - User accepts policy agreement
router.post('/:id/accept', acceptPolicy);
router.post('/accept', acceptPolicy);

export default router;
