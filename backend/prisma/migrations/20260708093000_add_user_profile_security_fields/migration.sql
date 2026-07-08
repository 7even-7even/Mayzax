-- Add editable profile and security-question fields for account recovery.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "securityQuestion" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "securityAnswerHash" TEXT;
