import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/userController.js';
import { authenticateJWT, requireRoles } from '../middleware/auth.js';
import { LOGISTICS_COORDINATOR } from '../constants/roles.js';

const router = Router();

// All user management routes require authentication
router.use(authenticateJWT);

// Get users (scoped to authorized projects)
router.get('/', getUsers);

// Create users (SYSTEM_ADMIN or MASTER_PERSON for authorized projects)
router.post(
  '/',
  requireRoles('SYSTEM_ADMIN', 'MASTER_PERSON', LOGISTICS_COORDINATOR),
  createUser
);

router.patch(
  '/:id',
  requireRoles('SYSTEM_ADMIN', 'MASTER_PERSON', LOGISTICS_COORDINATOR),
  updateUser
);

// Deactivate user
router.delete('/:id', requireRoles('SYSTEM_ADMIN', 'MASTER_PERSON'), deleteUser);

export default router;
