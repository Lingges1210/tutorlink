-- CreateEnum
CREATE TYPE "public"."StudyPlanStyle" AS ENUM ('SHORT_BURSTS', 'DEEP_STUDY');

-- CreateEnum
CREATE TYPE "public"."StudyPlanItemType" AS ENUM ('STUDY', 'PRACTICE', 'REVIEW', 'TUTOR');

-- CreateEnum
CREATE TYPE "public"."StudyPlanItemStatus" AS ENUM ('PENDING', 'DONE', 'SKIPPED');

-- CreateTable
CREATE TABLE "public"."StudyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "examDate" TIMESTAMP(3),
    "hoursPerWeek" INTEGER NOT NULL,
    "style" "public"."StudyPlanStyle" NOT NULL DEFAULT 'SHORT_BURSTS',
    "subjects" JSONB NOT NULL,
    "availability" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudyPlanItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "subjectName" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "type" "public"."StudyPlanItemType" NOT NULL DEFAULT 'STUDY',
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TopicConfidence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "confidence0to10" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopicConfidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudyPlan_userId_createdAt_idx" ON "public"."StudyPlan"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "StudyPlanItem_planId_date_idx" ON "public"."StudyPlanItem"("planId", "date");

-- CreateIndex
CREATE INDEX "StudyPlanItem_planId_status_idx" ON "public"."StudyPlanItem"("planId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TopicConfidence_userId_subjectName_topic_key" ON "public"."TopicConfidence"("userId", "subjectName", "topic");

-- AddForeignKey
ALTER TABLE "public"."StudyPlan" ADD CONSTRAINT "StudyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudyPlanItem" ADD CONSTRAINT "StudyPlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."StudyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TopicConfidence" ADD CONSTRAINT "TopicConfidence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
