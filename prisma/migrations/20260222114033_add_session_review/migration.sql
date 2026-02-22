-- CreateTable
CREATE TABLE "public"."SessionReview" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "confirmed" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionReview_sessionId_key" ON "public"."SessionReview"("sessionId");

-- CreateIndex
CREATE INDEX "SessionReview_studentId_idx" ON "public"."SessionReview"("studentId");

-- CreateIndex
CREATE INDEX "SessionReview_tutorId_idx" ON "public"."SessionReview"("tutorId");

-- AddForeignKey
ALTER TABLE "public"."SessionReview" ADD CONSTRAINT "SessionReview_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
