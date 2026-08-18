import { z } from 'zod';
import { evidenceSchema } from './evidence/evidence.schemas';

export const verifyEvidenceBodySchema = z.object({
  evidence: evidenceSchema,
  profileId: z.string().uuid().optional(),
  jobLink: z.string().url().optional(),
});

export const checkHashParamsSchema = z.object({
  hash: z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid hash format'),
});

export const verifyEvidenceQuerySchema = z.object({
  profileId: z.string().uuid().optional(),
});

// New Verification Journey Schemas
export const createSessionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  portal: z.string().min(1, 'Portal is required'),
  jobUrl: z.string().url().optional(),
  jobId: z.string().optional(),
  applicationUrl: z.string().url().optional(),
  applicationId: z.string().optional(),
});

export const eventItemSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  sessionId: z.string().min(1, 'Session ID is required'),
  type: z.enum([
    'APPLICATION_DETECTED',
    'APPLICATION_STARTED',
    'FORM_INTERACTION',
    'REQUIRED_FIELDS_COMPLETED',
    'RESUME_UPLOADED',
    'SUBMIT_CLICKED',
    'SUBMISSION_CONFIRMED',
    'APPLICATION_REFERENCE_DETECTED',
  ]),
  timestamp: z.string().datetime(),
  metadata: z.record(z.any()).optional(),
});

export const addEventsSchema = z.object({
  events: z.array(eventItemSchema),
});

export const checkApplicationUrlSchema = z.object({
  applicationUrl: z.string().url(),
});

export type VerifyEvidenceInput = z.infer<typeof verifyEvidenceBodySchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type AddEventsInput = z.infer<typeof addEventsSchema>;
export type CheckApplicationUrlInput = z.infer<typeof checkApplicationUrlSchema>;

