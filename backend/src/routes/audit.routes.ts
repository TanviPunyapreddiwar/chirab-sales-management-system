import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/prisma';
import { sendSuccess, getPagination, buildPaginationMeta } from '../utils/response';
import { AuthRequest } from '../types';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'MANAGEMENT'));

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = req.query as Record<string, string>;
    const { skip, take, page: pageNum, limit: limitNum } = getPagination(page, limit);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        skip,
        take,
        include: { user: { select: { id: true, name: true } } },
        orderBy: { timestamp: 'desc' },
      }),
      prisma.auditLog.count(),
    ]);

    sendSuccess(res, logs, undefined, 200, buildPaginationMeta(total, pageNum, limitNum));
  } catch (error) {
    next(error);
  }
});

export default router;
