import { Router } from 'express';
import {
  getOfferSummaryReport,
  getSalespersonPerformance,
  getWonLostAnalysis,
  getFollowUpReport,
} from '../controllers/reports.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/offer-summary', getOfferSummaryReport);
router.get('/salesperson-performance', getSalespersonPerformance);
router.get('/won-lost', getWonLostAnalysis);
router.get('/follow-ups', getFollowUpReport);

export default router;
