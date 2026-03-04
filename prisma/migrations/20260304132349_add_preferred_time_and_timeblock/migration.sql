-- CreateEnum
CREATE TYPE "public"."PreferredStudyTime" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT');

-- AlterTable
ALTER TABLE "public"."StudyPlan" ADD COLUMN     "preferredTime" "public"."PreferredStudyTime" NOT NULL DEFAULT 'NIGHT';

-- AlterTable
ALTER TABLE "public"."StudyPlanItem" ADD COLUMN     "timeBlock" TEXT;
