import { Router } from 'express';
import { getDashboardSummary, getFollowUpsDue } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/summary', getDashboardSummary);
router.get('/followups-due', getFollowUpsDue);

export default router;
