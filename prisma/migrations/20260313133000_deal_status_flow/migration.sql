ALTER TABLE "Deal"
  ADD COLUMN "adminContactedAt" TIMESTAMP(3),
  ADD COLUMN "termsAgreedAt" TIMESTAMP(3),
  ADD COLUMN "paidAt" TIMESTAMP(3),
  ADD COLUMN "proofText" TEXT,
  ADD COLUMN "proofUrl" TEXT,
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "failedAt" TIMESTAMP(3);
