ALTER TABLE "Campaign"
  ADD COLUMN "negotiationStartedAt" TIMESTAMP(3),
  ADD COLUMN "negotiationStatus" TEXT NOT NULL DEFAULT 'idle';

CREATE TABLE "ConversationThread" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "adminContactId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'not_started',
  "startedAt" TIMESTAMP(3),
  "lastMessageAt" TIMESTAMP(3),
  "lastMessagePreview" TEXT,
  "lastDirection" TEXT,
  "outreachAttemptCount" INTEGER NOT NULL DEFAULT 0,
  "telegramChatId" TEXT,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ConversationThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationMessage" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "messageType" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "telegramMessageId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConversationThread_campaignId_channelId_adminContactId_key"
  ON "ConversationThread"("campaignId", "channelId", "adminContactId");

CREATE UNIQUE INDEX "ConversationThread_telegramChatId_key"
  ON "ConversationThread"("telegramChatId");

CREATE INDEX "ConversationThread_campaignId_updatedAt_idx"
  ON "ConversationThread"("campaignId", "updatedAt");

CREATE INDEX "ConversationMessage_threadId_createdAt_idx"
  ON "ConversationMessage"("threadId", "createdAt");

CREATE UNIQUE INDEX "ConversationMessage_threadId_telegramMessageId_key"
  ON "ConversationMessage"("threadId", "telegramMessageId");

ALTER TABLE "ConversationThread"
  ADD CONSTRAINT "ConversationThread_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConversationThread"
  ADD CONSTRAINT "ConversationThread_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "Channel"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConversationThread"
  ADD CONSTRAINT "ConversationThread_adminContactId_fkey"
  FOREIGN KEY ("adminContactId") REFERENCES "AdminContact"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConversationMessage"
  ADD CONSTRAINT "ConversationMessage_threadId_fkey"
  FOREIGN KEY ("threadId") REFERENCES "ConversationThread"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
