-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ocrMatchedMatric" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ocrMatchedName" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ocrText" TEXT,
ADD COLUMN     "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW';
