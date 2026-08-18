import { Router } from 'express';
import { requireAuth, requireExtensionKeyOrAuth } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import {
  verifyEvidenceBodySchema,
  checkHashParamsSchema,
  createSessionSchema,
  addEventsSchema,
  checkApplicationUrlSchema,
} from './verification.validation';
import * as verificationController from './verification.controller';

const router = Router();

// Standard JWT auth routes (frontend CRM)
router.use(requireAuth);

// POST /verifications/verify-evidence
router.post('/verify-evidence', validate({ body: verifyEvidenceBodySchema }), verificationController.verifyEvidence);

// GET /verifications/hash/:hash
router.get('/hash/:hash', validate({ params: checkHashParamsSchema }), verificationController.getVerificationByHash);

// GET /verifications (list own)
router.get('/', verificationController.listVerifications);

// POST /verifications/check
router.post('/check', validate({ body: checkApplicationUrlSchema }), verificationController.checkApplicationUrl);

// ── Verification Journey Routes ──────────────────────────────────────────────
// These accept either a JWT (frontend) OR the stable X-Extension-Key header
// (Chrome extension background script on third-party portal tabs).

// POST /verifications/sessions
router.post('/sessions', requireExtensionKeyOrAuth, validate({ body: createSessionSchema }), verificationController.createSession);

// POST /verifications/sessions/:sessionId/events
router.post('/sessions/:sessionId/events', requireExtensionKeyOrAuth, validate({ body: addEventsSchema }), verificationController.addEvents);

// POST /verifications/sessions/:sessionId/finalize
router.post('/sessions/:sessionId/finalize', requireExtensionKeyOrAuth, verificationController.finalizeSession);

export default router;


