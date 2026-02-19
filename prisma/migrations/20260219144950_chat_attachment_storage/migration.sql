/*
  Warnings:

  - You are about to drop the column `fileUrl` on the `ChatAttachment` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `ChatAttachment` table. All the data in the column will be lost.
  - Added the required column `contentType` to the `ChatAttachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileName` to the `ChatAttachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `objectPath` to the `ChatAttachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sizeBytes` to the `ChatAttachment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ChatAttachment" DROP COLUMN "fileUrl",
DROP COLUMN "type",
ADD COLUMN     "bucket" TEXT NOT NULL DEFAULT 'chat-attachments',
ADD COLUMN     "contentType" TEXT NOT NULL,
ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "objectPath" TEXT NOT NULL,
ADD COLUMN     "sizeBytes" INTEGER NOT NULL;
