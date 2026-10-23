import { Router } from 'express';
import { getExpenses, createExpense, getExpenseSummary } from '../controllers/expenseController.js';
import { authenticateJWT, requireRoles } from '../middleware/auth.js';
import { FLEET_MANAGEMENT_ROLES } from '../constants/roles.js';

const router = Router();

router.use(authenticateJWT);

router.get('/', getExpenses);
router.get('/summary', getExpenseSummary);
router.post('/', requireRoles(...FLEET_MANAGEMENT_ROLES), createExpense);

export default router;
