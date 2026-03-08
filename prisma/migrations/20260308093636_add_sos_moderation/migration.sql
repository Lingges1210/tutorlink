-- CreateEnum
CREATE TYPE "public"."SOSModerationStatus" AS ENUM ('VISIBLE', 'FLAGGED', 'REMOVED_BY_ADMIN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."AdminActionType" ADD VALUE 'SOS_FLAG';
ALTER TYPE "public"."AdminActionType" ADD VALUE 'SOS_REMOVE';
ALTER TYPE "public"."AdminActionType" ADD VALUE 'SOS_RESTORE';

-- AlterTable
ALTER TABLE "public"."SOSRequest" ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "isFlagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedByAdminId" TEXT,
ADD COLUMN     "moderationReason" TEXT,
ADD COLUMN     "moderationStatus" "public"."SOSModerationStatus" NOT NULL DEFAULT 'VISIBLE';

-- CreateIndex
CREATE INDEX "SOSRequest_moderationStatus_createdAt_idx" ON "public"."SOSRequest"("moderationStatus", "createdAt");

-- CreateIndex
CREATE INDEX "SOSRequest_isFlagged_createdAt_idx" ON "public"."SOSRequest"("isFlagged", "createdAt");

-- CreateIndex
CREATE INDEX "SOSRequest_moderatedByAdminId_createdAt_idx" ON "public"."SOSRequest"("moderatedByAdminId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."SOSRequest" ADD CONSTRAINT "SOSRequest_moderatedByAdminId_fkey" FOREIGN KEY ("moderatedByAdminId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
