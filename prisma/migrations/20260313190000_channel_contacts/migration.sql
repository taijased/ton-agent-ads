ALTER TABLE "Channel"
  ADD COLUMN "description" TEXT;

CREATE TABLE "ChannelContact" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "isAdsContact" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ChannelContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChannelContact_channelId_type_value_key"
  ON "ChannelContact"("channelId", "type", "value");

ALTER TABLE "ChannelContact"
  ADD CONSTRAINT "ChannelContact_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "Channel"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
