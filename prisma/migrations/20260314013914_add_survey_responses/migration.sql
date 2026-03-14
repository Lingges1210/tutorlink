-- CreateTable
CREATE TABLE "public"."SurveyResponse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "rating" INTEGER NOT NULL,
    "easierToFindTutor" BOOLEAN NOT NULL,
    "improvedUnderstanding" BOOLEAN NOT NULL,
    "wouldRecommend" BOOLEAN NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SurveyResponse_sessionId_key" ON "public"."SurveyResponse"("sessionId");

-- CreateIndex
CREATE INDEX "SurveyResponse_userId_createdAt_idx" ON "public"."SurveyResponse"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SurveyResponse_createdAt_idx" ON "public"."SurveyResponse"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."SurveyResponse" ADD CONSTRAINT "SurveyResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SurveyResponse" ADD CONSTRAINT "SurveyResponse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
