-- AlterTable job_applications add verification v2 fields
ALTER TABLE "job_applications" ADD COLUMN "verificationHash" VARCHAR(128);
ALTER TABLE "job_applications" ADD COLUMN "verificationVersion" TEXT DEFAULT 'v2';
ALTER TABLE "job_applications" ADD COLUMN "verificationScore" INTEGER;
ALTER TABLE "job_applications" ADD COLUMN "verificationConfidence" TEXT;
ALTER TABLE "job_applications" ADD COLUMN "verificationEvidence" JSONB;
ALTER TABLE "job_applications" ADD COLUMN "verificationPortal" TEXT;
ALTER TABLE "job_applications" ADD COLUMN "verificationTimestamp" TIMESTAMP(3);
ALTER TABLE "job_applications" ADD COLUMN "applicationReference" TEXT;

-- CreateIndex
CREATE INDEX "job_applications_verificationHash_idx" ON "job_applications"("verificationHash");
CREATE INDEX "job_applications_applicationReference_idx" ON "job_applications"("applicationReference");
CREATE INDEX "job_applications_verificationConfidence_idx" ON "job_applications"("verificationConfidence");

-- CreateTable verification_logs
CREATE TABLE "verification_logs" (
    "id" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "profileId" TEXT,
    "jobLink" TEXT NOT NULL,
    "normalizedJobLink" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "canonicalEvidence" TEXT,
    "verificationHash" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "confidence" TEXT NOT NULL,
    "portal" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "reference" TEXT,
    "isReplay" BOOLEAN NOT NULL DEFAULT false,
    "fraudSignals" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "verification_logs_verificationHash_key" ON "verification_logs"("verificationHash");
CREATE INDEX "verification_logs_recruiterId_idx" ON "verification_logs"("recruiterId");
CREATE INDEX "verification_logs_hostname_idx" ON "verification_logs"("hostname");
CREATE INDEX "verification_logs_portal_idx" ON "verification_logs"("portal");
CREATE INDEX "verification_logs_profileId_idx" ON "verification_logs"("profileId");
CREATE INDEX "verification_logs_createdAt_idx" ON "verification_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "verification_logs" ADD CONSTRAINT "verification_logs_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
