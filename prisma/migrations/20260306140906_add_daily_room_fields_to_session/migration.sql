/*
  Warnings:

  - A unique constraint covering the columns `[dailyRoomName]` on the table `Session` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Session" ADD COLUMN     "dailyRoomCreatedAt" TIMESTAMP(3),
ADD COLUMN     "dailyRoomExpiresAt" TIMESTAMP(3),
ADD COLUMN     "dailyRoomName" TEXT,
ADD COLUMN     "dailyRoomUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Session_dailyRoomName_key" ON "public"."Session"("dailyRoomName");
