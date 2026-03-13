ALTER TABLE "Campaign"
  ADD COLUMN "budgetAmount" TEXT NOT NULL DEFAULT '0',
  ADD COLUMN "budgetCurrency" TEXT NOT NULL DEFAULT 'TON',
  ADD COLUMN "theme" TEXT,
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "language" TEXT,
  ADD COLUMN "goal" TEXT,
  ADD COLUMN "ctaUrl" TEXT,
  ADD COLUMN "buttonText" TEXT,
  ADD COLUMN "mediaUrl" TEXT,
  ADD COLUMN "targetAudience" TEXT;

UPDATE "Campaign"
SET "budgetAmount" = "budget"::TEXT;

ALTER TABLE "Campaign"
  ALTER COLUMN "budgetAmount" DROP DEFAULT,
  DROP COLUMN "budget";
