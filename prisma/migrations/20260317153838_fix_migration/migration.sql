/*
  Warnings:

  - You are about to drop the column `clientTempId` on the `ChatMessage` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."ChatMessage" DROP COLUMN "clientTempId";
