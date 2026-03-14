CREATE TABLE "DealMessage" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "senderType" TEXT NOT NULL,
  "contactValue" TEXT,
  "text" TEXT NOT NULL,
  "externalMessageId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DealMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DealApprovalRequest" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "proposedPriceTon" DOUBLE PRECISION,
  "proposedFormat" TEXT,
  "proposedDateText" TEXT,
  "summary" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),

  CONSTRAINT "DealApprovalRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DealExternalThread" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "contactValue" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DealExternalThread_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DealMessage_dealId_createdAt_idx" ON "DealMessage"("dealId", "createdAt");
CREATE INDEX "DealApprovalRequest_dealId_status_idx" ON "DealApprovalRequest"("dealId", "status");
CREATE UNIQUE INDEX "DealExternalThread_platform_chatId_key" ON "DealExternalThread"("platform", "chatId");

ALTER TABLE "DealMessage"
  ADD CONSTRAINT "DealMessage_dealId_fkey"
  FOREIGN KEY ("dealId") REFERENCES "Deal"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DealApprovalRequest"
  ADD CONSTRAINT "DealApprovalRequest_dealId_fkey"
  FOREIGN KEY ("dealId") REFERENCES "Deal"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DealExternalThread"
  ADD CONSTRAINT "DealExternalThread_dealId_fkey"
  FOREIGN KEY ("dealId") REFERENCES "Deal"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
