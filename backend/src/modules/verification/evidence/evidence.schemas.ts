import { z } from 'zod';

const detectedButtonSchema = z.object({
  text: z.string().max(200),
  disabled: z.boolean(),
  visible: z.boolean(),
});

const domFingerprintSchema = z.object({
  hasConfirmationCard: z.boolean(),
  hasSuccessBanner: z.boolean(),
  expectedContainersFound: z.number().int().min(0),
  unexpectedApplyButtonPresent: z.boolean(),
  totalExpected: z.number().int().min(0).optional(),
  matchedSelectors: z.array(z.string()).optional(),
  missingSelectors: z.array(z.string()).optional(),
});

export const evidenceSchema = z.object({
  portal: z.string().min(1).max(50),
  hostname: z.string().min(3).max(255),
  pathname: z.string().min(1).max(2048),
  fullUrl: z.string().url().max(4096),
  normalizedUrl: z.string().min(1).max(4096),
  title: z.string().max(500),
  headings: z.array(z.string().max(500)).max(20),
  confirmationText: z.string().max(5000),
  applicationReference: z.string().max(100).nullable(),
  detectedButtons: z.array(detectedButtonSchema).max(50),
  domFingerprint: domFingerprintSchema,
  verificationTimestamp: z.number().int().positive(),
  extensionVersion: z.string().max(20),
  https: z.boolean(),
  pageLanguage: z.string().max(20).optional(),
  timeOnPageMs: z.number().int().min(0).optional(),
  userInteractionDetected: z.boolean().optional(),
  historyManipulationDetected: z.boolean().optional(),
  referrer: z.string().max(2048).optional(),
}).passthrough(); // allow extra future fields but validated shape above

export type EvidenceInput = z.infer<typeof evidenceSchema>;
