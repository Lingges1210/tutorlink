-- AlterTable
ALTER TABLE "public"."StudyMaterial" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "objectPath" TEXT,
ADD COLUMN     "studySubjectId" TEXT;

-- CreateTable
CREATE TABLE "public"."StudySubject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudySubject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudySubject_userId_idx" ON "public"."StudySubject"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudySubject_userId_name_key" ON "public"."StudySubject"("userId", "name");

-- CreateIndex
CREATE INDEX "StudyMaterial_studySubjectId_idx" ON "public"."StudyMaterial"("studySubjectId");

-- AddForeignKey
ALTER TABLE "public"."StudyMaterial" ADD CONSTRAINT "StudyMaterial_studySubjectId_fkey" FOREIGN KEY ("studySubjectId") REFERENCES "public"."StudySubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudySubject" ADD CONSTRAINT "StudySubject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
