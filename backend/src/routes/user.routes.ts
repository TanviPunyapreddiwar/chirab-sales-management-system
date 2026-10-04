import { Router } from 'express';
import { getUsers, getSalespeople, getUserById, createUser, updateUser, resetPassword } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// All authenticated users can see salespeople list
router.get('/salespeople', getSalespeople);

// Admin only
router.get('/', authorize('ADMIN', 'MANAGEMENT'), getUsers);
router.post('/', authorize('ADMIN'), createUser);
router.get('/:id', authorize('ADMIN', 'MANAGEMENT'), getUserById);
router.put('/:id', authorize('ADMIN'), updateUser);
router.post('/:id/reset-password', authorize('ADMIN'), resetPassword);

export default router;
