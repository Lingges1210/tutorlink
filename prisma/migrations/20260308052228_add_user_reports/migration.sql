-- CreateEnum
CREATE TYPE "public"."UserReportCategory" AS ENUM ('ACCOUNT_LOCK_APPEAL', 'MISCONDUCT', 'NO_SHOW', 'INAPPROPRIATE_CHAT', 'SESSION_ISSUE', 'TECHNICAL_ISSUE', 'GENERAL_COMPLAINT');

-- CreateEnum
CREATE TYPE "public"."UserReportStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "public"."UserReportPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "public"."UserReport" (
    "id" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reportedUserId" TEXT,
    "sessionId" TEXT,
    "chatChannelId" TEXT,
    "category" "public"."UserReportCategory" NOT NULL,
    "status" "public"."UserReportStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "public"."UserReportPriority" NOT NULL DEFAULT 'MEDIUM',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "adminNotes" TEXT,
    "reviewedByAdminId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserReport_reporterUserId_createdAt_idx" ON "public"."UserReport"("reporterUserId", "createdAt");

-- CreateIndex
CREATE INDEX "UserReport_reportedUserId_createdAt_idx" ON "public"."UserReport"("reportedUserId", "createdAt");

-- CreateIndex
CREATE INDEX "UserReport_status_createdAt_idx" ON "public"."UserReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "UserReport_category_createdAt_idx" ON "public"."UserReport"("category", "createdAt");

-- CreateIndex
CREATE INDEX "UserReport_priority_createdAt_idx" ON "public"."UserReport"("priority", "createdAt");

-- CreateIndex
CREATE INDEX "UserReport_sessionId_idx" ON "public"."UserReport"("sessionId");

-- CreateIndex
CREATE INDEX "UserReport_chatChannelId_idx" ON "public"."UserReport"("chatChannelId");

-- AddForeignKey
ALTER TABLE "public"."UserReport" ADD CONSTRAINT "UserReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserReport" ADD CONSTRAINT "UserReport_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserReport" ADD CONSTRAINT "UserReport_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserReport" ADD CONSTRAINT "UserReport_chatChannelId_fkey" FOREIGN KEY ("chatChannelId") REFERENCES "public"."ChatChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserReport" ADD CONSTRAINT "UserReport_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
