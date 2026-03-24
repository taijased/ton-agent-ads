ALTER TABLE "Channel"
  ADD COLUMN "adminParseStatus" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "readinessStatus" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "adminCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastParsedAt" TIMESTAMP(3);

CREATE TABLE "AdminContact" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "telegramHandle" TEXT NOT NULL,
  "telegramUserId" TEXT,
  "source" TEXT NOT NULL,
  "confidenceScore" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AdminContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminContact_channelId_telegramHandle_key"
  ON "AdminContact"("channelId", "telegramHandle");

ALTER TABLE "AdminContact"
  ADD CONSTRAINT "AdminContact_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "Channel"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
