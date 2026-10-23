import { Router } from 'express';
import { getRequests, getMyRequests, getRequestById, createRequest, cancelRequest, rejectRequest } from '../controllers/requestController.js';
import { authenticateJWT, requireRoles } from '../middleware/auth.js';
import { DISPATCH_ROLES } from '../constants/roles.js';

const router = Router();

router.use(authenticateJWT);

router.get('/', getRequests);
router.get('/my', getMyRequests);
router.get('/:id', getRequestById);
router.post('/', createRequest);
router.patch('/:id/cancel', cancelRequest);
router.patch('/:id/reject', requireRoles(...DISPATCH_ROLES), rejectRequest);

export default router;
