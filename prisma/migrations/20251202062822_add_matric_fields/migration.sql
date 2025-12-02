/*
  Warnings:

  - A unique constraint covering the columns `[matricNo]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `passwordHash` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "matricCardUrl" TEXT,
ADD COLUMN     "matricNo" TEXT,
ALTER COLUMN "passwordHash" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_matricNo_key" ON "User"("matricNo");
