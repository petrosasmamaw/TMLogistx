import { Router } from 'express';
import { getCountries, createCountry, updateCountry } from '../controllers/countryController.js';
import { authenticateJWT, requireRoles } from '../middleware/auth.js';

const router = Router();

// All country routes require authentication
router.use(authenticateJWT);

// Read countries (all authenticated roles can view countries)
router.get('/', getCountries);

// Mutation routes strictly restricted to SYSTEM_ADMIN
router.post('/', requireRoles('SYSTEM_ADMIN'), createCountry);
router.patch('/:id', requireRoles('SYSTEM_ADMIN'), updateCountry);

export default router;
