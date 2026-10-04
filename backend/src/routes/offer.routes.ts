import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  getOffers,
  getOfferById,
  createOffer,
  updateOffer,
  changeOfferStatus,
  createRevision,
  getRevisions,
  createFollowUp,
  getFollowUps,
  createApproval,
  uploadDocument,
  downloadDocument,
} from '../controllers/offer.controller';
import { authenticate } from '../middleware/auth';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, process.env.STORAGE_LOCAL_PATH || './uploads/documents');
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

const router = Router();

router.use(authenticate);

router.get('/', getOffers);
router.post('/', createOffer);
router.get('/:id', getOfferById);
router.put('/:id', updateOffer);
router.patch('/:id/status', changeOfferStatus);

router.post('/:id/revisions', createRevision);
router.get('/:id/revisions', getRevisions);

router.post('/:id/followups', createFollowUp);
router.get('/:id/followups', getFollowUps);

router.post('/:id/approvals', createApproval);

router.post('/:id/documents', upload.single('file'), uploadDocument);
router.get('/:id/documents/:docId/download', downloadDocument);

export default router;
