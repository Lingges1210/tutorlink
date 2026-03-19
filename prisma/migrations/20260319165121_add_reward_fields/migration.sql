-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "badgeFrame" TEXT,
ADD COLUMN     "boostUntil" TIMESTAMP(3),
ADD COLUMN     "doubleUntil" TIMESTAMP(3),
ADD COLUMN     "profileTitle" TEXT,
ADD COLUMN     "streakShieldCount" INTEGER NOT NULL DEFAULT 0;
