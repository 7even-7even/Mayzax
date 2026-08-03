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

export type VerifyEvidenceInput = z.infer<typeof verifyEvidenceBodySchema>;
