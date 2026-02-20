-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "sessionRatingId" TEXT;

-- CreateTable
CREATE TABLE "public"."SessionRating" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionRating_sessionId_key" ON "public"."SessionRating"("sessionId");

-- CreateIndex
CREATE INDEX "SessionRating_tutorId_idx" ON "public"."SessionRating"("tutorId");

-- CreateIndex
CREATE INDEX "SessionRating_studentId_idx" ON "public"."SessionRating"("studentId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_sessionRatingId_fkey" FOREIGN KEY ("sessionRatingId") REFERENCES "public"."SessionRating"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SessionRating" ADD CONSTRAINT "SessionRating_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
