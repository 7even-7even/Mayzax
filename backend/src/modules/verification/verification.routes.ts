import { Router } from 'express';
import { requireAuth } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { verifyEvidenceBodySchema, checkHashParamsSchema } from './verification.validation';
import * as verificationController from './verification.controller';

const router = Router();

router.use(requireAuth);

// POST /verifications/verify-evidence
router.post('/verify-evidence', validate({ body: verifyEvidenceBodySchema }), verificationController.verifyEvidence);

// GET /verifications/hash/:hash
router.get('/hash/:hash', validate({ params: checkHashParamsSchema }), verificationController.getVerificationByHash);

// GET /verifications (list own)
router.get('/', verificationController.listVerifications);

export default router;
