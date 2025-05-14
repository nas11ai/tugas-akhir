import express from 'express';
import multer from 'multer';
import { createCertificate, getCertificate, updateCertificate, deleteCertificate, getAllCertificates } from '../services/certificate-service.js';
import authRole from '../middleware/index.js';

const router = express.Router();
const upload = multer();

router.get('/', authRole(['akademik', 'rektor']), getAllCertificates);
router.post('/', authRole(['akademik']), upload.single('file'), createCertificate);
router.get('/:id', getCertificate);
router.put('/:id', authRole(['akademik']), upload.single('file'), updateCertificate);
router.delete('/:id', authRole(['rektor']), deleteCertificate);

export default router;
