-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "proposalStatus" "ProposalStatus",
ADD COLUMN     "proposedAt" TIMESTAMP(3),
ADD COLUMN     "proposedByUserId" TEXT,
ADD COLUMN     "proposedEndAt" TIMESTAMP(3),
ADD COLUMN     "proposedNote" TEXT;
