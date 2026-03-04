/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `StudyPlan` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "StudyPlan_userId_key" ON "public"."StudyPlan"("userId");
