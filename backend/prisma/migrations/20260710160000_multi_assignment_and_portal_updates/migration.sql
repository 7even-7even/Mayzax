-- Support assigning each client profile to up to five recruiters via a join table.
-- Keep client_profiles.assignedRecruiterId for backward compatibility / primary recruiter display.
CREATE TABLE IF NOT EXISTS "client_profile_assignments" (
  "profileId" TEXT NOT NULL,
  "recruiterId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_profile_assignments_pkey" PRIMARY KEY ("profileId", "recruiterId")
);

CREATE INDEX IF NOT EXISTS "client_profile_assignments_recruiterId_idx" ON "client_profile_assignments"("recruiterId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_profile_assignments_profileId_fkey'
  ) THEN
    ALTER TABLE "client_profile_assignments"
      ADD CONSTRAINT "client_profile_assignments_profileId_fkey"
      FOREIGN KEY ("profileId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_profile_assignments_recruiterId_fkey'
  ) THEN
    ALTER TABLE "client_profile_assignments"
      ADD CONSTRAINT "client_profile_assignments_recruiterId_fkey"
      FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill existing single-recuiter assignments into the join table.
INSERT INTO "client_profile_assignments" ("profileId", "recruiterId")
SELECT "id", "assignedRecruiterId"
FROM "client_profiles"
WHERE "assignedRecruiterId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- New portal enum values for auto-detection.
ALTER TYPE "JobPortal" ADD VALUE IF NOT EXISTS 'LEVER';
ALTER TYPE "JobPortal" ADD VALUE IF NOT EXISTS 'GREENHOUSE';
