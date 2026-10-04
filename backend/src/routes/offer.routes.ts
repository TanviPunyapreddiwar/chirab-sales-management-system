import { Router } from 'express';
import multer from 'multer';
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
import { configureCloudinary } from '../config/cloudinary';

// Initialise Cloudinary once when this module is first loaded
configureCloudinary();

/**
 * Use memoryStorage so Multer holds the file in a Buffer.
 * The buffer is then uploaded to Cloudinary by the controller.
 * This avoids any dependency on a writable filesystem, which is
 * ephemeral on Railway (and was the cause of the ENOENT errors).
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
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
