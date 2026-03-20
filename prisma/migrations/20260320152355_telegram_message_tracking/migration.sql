ALTER TABLE "Deal"
ADD COLUMN "lastCreatorNotificationAt" TIMESTAMP(3),
ADD COLUMN "lastCreatorNotificationKey" TEXT,
ADD COLUMN "lastCreatorNotificationError" TEXT;

ALTER TABLE "DealMessage"
ADD COLUMN "audience" TEXT NOT NULL DEFAULT 'internal',
ADD COLUMN "transport" TEXT NOT NULL DEFAULT 'internal',
ADD COLUMN "deliveryStatus" TEXT,
ADD COLUMN "notificationKey" TEXT,
ADD COLUMN "failureReason" TEXT;

UPDATE "DealMessage"
SET
  "audience" = CASE
    WHEN "direction" = 'internal' THEN 'internal'
    WHEN "senderType" IN ('user', 'system') THEN 'creator'
    ELSE 'admin'
  END,
  "transport" = CASE
    WHEN "direction" = 'internal' THEN 'internal'
    WHEN "senderType" IN ('user', 'system') THEN 'telegram_bot'
    ELSE 'telegram_mtproto'
  END;

ALTER TABLE "DealMessage"
ALTER COLUMN "audience" DROP DEFAULT,
ALTER COLUMN "transport" DROP DEFAULT;

CREATE UNIQUE INDEX "DealMessage_dealId_notificationKey_key"
ON "DealMessage"("dealId", "notificationKey");

CREATE UNIQUE INDEX "DealMessage_dealId_senderType_externalMessageId_key"
ON "DealMessage"("dealId", "senderType", "externalMessageId");
