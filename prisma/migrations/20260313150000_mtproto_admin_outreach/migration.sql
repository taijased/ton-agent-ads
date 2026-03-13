ALTER TABLE "Channel"
  ADD COLUMN "adminUsername" TEXT;

ALTER TABLE "Deal"
  ADD COLUMN "adminOutboundMessageId" TEXT,
  ADD COLUMN "outreachError" TEXT;
