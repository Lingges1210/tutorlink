-- CreateTable
CREATE TABLE "SessionReminder" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sendAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionReminder_sendAt_sentAt_idx" ON "SessionReminder"("sendAt", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "SessionReminder_sessionId_kind_key" ON "SessionReminder"("sessionId", "kind");
