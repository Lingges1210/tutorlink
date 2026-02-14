-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_tutorId_fkey";

-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "tutorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
