/*
  Warnings:

  - You are about to drop the column `badgeFrame` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `boostUntil` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `doubleUntil` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `profileTitle` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `streakShieldCount` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "badgeFrame",
DROP COLUMN "boostUntil",
DROP COLUMN "doubleUntil",
DROP COLUMN "profileTitle",
DROP COLUMN "streakShieldCount",
ADD COLUMN     "activeMultiplierKey" TEXT,
ADD COLUMN     "avatarBorder" TEXT,
ADD COLUMN     "earlyAccessUntil" TIMESTAMP(3),
ADD COLUMN     "leaderboardSpotlightUntil" TIMESTAMP(3),
ADD COLUMN     "multiplierUntil" TIMESTAMP(3),
ADD COLUMN     "profileBanner" TEXT,
ADD COLUMN     "streakBrokenAt" TIMESTAMP(3),
ADD COLUMN     "streakFreezeUntil" TIMESTAMP(3),
ADD COLUMN     "usernameColor" TEXT,
ADD COLUMN     "vipSupportUntil" TIMESTAMP(3);
