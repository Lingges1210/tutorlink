-- DropIndex
DROP INDEX "StudyMaterial_studySubjectId_idx";

-- DropIndex
DROP INDEX "StudySubject_userId_idx";

-- CreateIndex
CREATE INDEX "StudyMaterial_userId_studySubjectId_updatedAt_idx" ON "public"."StudyMaterial"("userId", "studySubjectId", "updatedAt");

-- CreateIndex
CREATE INDEX "StudySubject_userId_updatedAt_idx" ON "public"."StudySubject"("userId", "updatedAt");
