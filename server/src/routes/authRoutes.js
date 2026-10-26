import { Router } from 'express';
import {
  login,
  getMe,
  changePassword,
  updateMasterScope,
  forgotPassword,
  resetPassword,
  updateMyProfile
} from '../controllers/authController.js';
import { requireRoles } from '../middleware/auth.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', authenticateJWT, getMe);
router.patch('/me', authenticateJWT, updateMyProfile);
router.patch('/master-scope', authenticateJWT, requireRoles('MASTER_PERSON'), updateMasterScope);
router.post('/change-password', authenticateJWT, changePassword);

export default router;
