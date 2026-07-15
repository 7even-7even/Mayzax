-- CreateTable
CREATE TABLE "client_profile_assignments" (
    "profileId" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_profile_assignments_pkey" PRIMARY KEY ("profileId","recruiterId")
);

-- CreateIndex
CREATE INDEX "client_profile_assignments_recruiterId_idx" ON "client_profile_assignments"("recruiterId");

-- AddForeignKey
ALTER TABLE "client_profile_assignments" ADD CONSTRAINT "client_profile_assignments_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_profile_assignments" ADD CONSTRAINT "client_profile_assignments_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
