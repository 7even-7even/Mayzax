-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SHORT_BREAK', 'DINNER_BREAK', 'BRIEFING_TRAINING', 'MEETING', 'SYSTEM_ISSUE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'RESUME_ASSIST';
ALTER TYPE "Role" ADD VALUE 'SALES_EXEC';

-- AlterTable
ALTER TABLE "client_profiles" ADD COLUMN     "addressHistory" JSONB,
ADD COLUMN     "amountPaid" DOUBLE PRECISION,
ADD COLUMN     "certifications" TEXT,
ADD COLUMN     "currentLocation" TEXT,
ADD COLUMN     "dateOfBirth" TEXT,
ADD COLUMN     "education" JSONB,
ADD COLUMN     "entryToUS" TEXT,
ADD COLUMN     "experienceDetails" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "hasExperience" BOOLEAN DEFAULT false,
ADD COLUMN     "paymentRef" TEXT,
ADD COLUMN     "planSelected" TEXT,
ADD COLUMN     "resumeFileName" TEXT,
ADD COLUMN     "resumeUrl" TEXT,
ADD COLUMN     "skills" TEXT,
ADD COLUMN     "visaStatus" TEXT;

-- AlterTable
ALTER TABLE "job_applications" ADD COLUMN     "verificationMethod" TEXT,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "designation" TEXT,
ADD COLUMN     "displayColor" TEXT,
ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "joinDate" TIMESTAMP(3),
ADD COLUMN     "lastHeartbeatAt" TIMESTAMP(3),
ADD COLUMN     "linkedInUrl" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "shiftPreference" TEXT,
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "teamName" TEXT;

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "optionalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_updates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT,
    "description" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "pdfOriginalName" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_update_reads" (
    "id" TEXT NOT NULL,
    "updateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_update_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_onboardings" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "dateOfBirth" TEXT NOT NULL,
    "gender" TEXT NOT NULL DEFAULT '',
    "education" JSONB NOT NULL,
    "technology" TEXT NOT NULL,
    "skills" TEXT NOT NULL,
    "visaStatus" TEXT NOT NULL,
    "entryToUS" TEXT,
    "currentLocation" TEXT NOT NULL,
    "addressHistory" JSONB NOT NULL,
    "hasExperience" BOOLEAN NOT NULL DEFAULT false,
    "experienceDetails" TEXT,
    "certifications" TEXT,
    "resumeUrl" TEXT,
    "resumeFileName" TEXT,
    "declared" BOOLEAN NOT NULL DEFAULT false,
    "declaredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "planSelected" TEXT NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "paymentRef" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "generatedProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_onboardings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_startedAt_idx" ON "activity_logs"("startedAt");

-- CreateIndex
CREATE INDEX "activity_logs_status_idx" ON "activity_logs"("status");

-- CreateIndex
CREATE INDEX "activity_logs_userId_endedAt_idx" ON "activity_logs"("userId", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_update_reads_updateId_userId_key" ON "user_update_reads"("updateId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "client_onboardings_generatedProfileId_key" ON "client_onboardings"("generatedProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeId_key" ON "users"("employeeId");

-- CreateIndex
CREATE INDEX "users_department_idx" ON "users"("department");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_updates" ADD CONSTRAINT "system_updates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_update_reads" ADD CONSTRAINT "user_update_reads_updateId_fkey" FOREIGN KEY ("updateId") REFERENCES "system_updates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_update_reads" ADD CONSTRAINT "user_update_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_onboardings" ADD CONSTRAINT "client_onboardings_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
