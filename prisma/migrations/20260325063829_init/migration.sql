/*
  Warnings:

  - A unique constraint covering the columns `[campaignId,channelId]` on the table `Deal` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ConversationThread" ADD COLUMN     "dealId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Deal_campaignId_channelId_key" ON "Deal"("campaignId", "channelId");

-- AddForeignKey
ALTER TABLE "ConversationThread" ADD CONSTRAINT "ConversationThread_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
