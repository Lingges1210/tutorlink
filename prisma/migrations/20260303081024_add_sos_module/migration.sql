/*
  Warnings:

  - You are about to drop the `SOSInvite` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."SOSTutorDecision" AS ENUM ('ACCEPT', 'DECLINE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."SOSMode" ADD VALUE 'VOICE';
ALTER TYPE "public"."SOSMode" ADD VALUE 'VIDEO';
ALTER TYPE "public"."SOSMode" ADD VALUE 'IN_PERSON';

-- DropForeignKey
ALTER TABLE "SOSInvite" DROP CONSTRAINT "SOSInvite_requestId_fkey";

-- DropForeignKey
ALTER TABLE "SOSInvite" DROP CONSTRAINT "SOSInvite_tutorId_fkey";

-- DropForeignKey
ALTER TABLE "SOSRequest" DROP CONSTRAINT "SOSRequest_studentId_fkey";

-- DropIndex
DROP INDEX "SOSRequest_status_expiresAt_idx";

-- AlterTable
ALTER TABLE "public"."SOSRequest" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "SOSInvite";

-- DropEnum
DROP TYPE "SOSInviteStatus";

-- CreateTable
CREATE TABLE "public"."SOSTutorResponse" (
    "id" TEXT NOT NULL,
    "sosId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "decision" "public"."SOSTutorDecision" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SOSTutorResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TutorPresence" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorPresence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SOSTutorResponse_tutorId_createdAt_idx" ON "public"."SOSTutorResponse"("tutorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SOSTutorResponse_sosId_tutorId_key" ON "public"."SOSTutorResponse"("sosId", "tutorId");

-- CreateIndex
CREATE UNIQUE INDEX "TutorPresence_tutorId_key" ON "public"."TutorPresence"("tutorId");

-- CreateIndex
CREATE INDEX "TutorPresence_isOnline_lastSeenAt_idx" ON "public"."TutorPresence"("isOnline", "lastSeenAt");

-- CreateIndex
CREATE INDEX "SOSRequest_status_createdAt_idx" ON "public"."SOSRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SOSRequest_acceptedTutorId_status_idx" ON "public"."SOSRequest"("acceptedTutorId", "status");

-- AddForeignKey
ALTER TABLE "public"."SOSRequest" ADD CONSTRAINT "SOSRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SOSTutorResponse" ADD CONSTRAINT "SOSTutorResponse_sosId_fkey" FOREIGN KEY ("sosId") REFERENCES "public"."SOSRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SOSTutorResponse" ADD CONSTRAINT "SOSTutorResponse_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TutorPresence" ADD CONSTRAINT "TutorPresence_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
