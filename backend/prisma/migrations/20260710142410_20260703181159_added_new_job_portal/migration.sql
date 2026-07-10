-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobPortal" ADD VALUE 'SPEEDY_APPLY';
ALTER TYPE "JobPortal" ADD VALUE 'THE_MUSE';
ALTER TYPE "JobPortal" ADD VALUE 'Y_COMBINATOR';
ALTER TYPE "JobPortal" ADD VALUE 'CAREER_SITE';
