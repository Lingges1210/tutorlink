/*
  Warnings:

  - A unique constraint covering the columns `[calendarUid]` on the table `Session` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "calendarSequence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "calendarUid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Session_calendarUid_key" ON "Session"("calendarUid");
