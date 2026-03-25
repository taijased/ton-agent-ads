-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "proofForwardedMessageId" TEXT,
ADD COLUMN     "proofReceivedAt" TIMESTAMP(3),
ADD COLUMN     "txHash" TEXT;
