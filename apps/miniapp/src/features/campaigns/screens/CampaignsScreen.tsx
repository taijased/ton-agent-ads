import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { LoadingCard } from "../../../components/ui/LoadingCard";
import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import { CampaignList } from "../components/CampaignList";
import type { CampaignSummary } from "../types";

type CampaignsScreenLoadState = "loading" | "ready" | "empty" | "error";

interface CampaignsScreenProps {
  campaigns: CampaignSummary[];
  errorMessage: string | null;
  loadState: CampaignsScreenLoadState;
  onCreateCampaign: () => void;
  onOpenCampaign: (campaignId: string) => void;
  onRetry: () => void;
}

const inFlightStatuses = new Set<CampaignSummary["status"]>([
  "Recommended",
  "In negotiation",
  "Awaiting payment",
  "Paid",
]);

export const CampaignsScreen = ({
  campaigns,
  errorMessage,
  loadState,
  onCreateCampaign,
  onOpenCampaign,
  onRetry,
}: CampaignsScreenProps) => {
  const inFlightCount = campaigns.filter((campaign) =>
    inFlightStatuses.has(campaign.status),
  ).length;
  const publishedCount = campaigns.filter(
    (campaign) => campaign.status === "Published",
  ).length;

  return (
    <div className="screen-stack">
      <ScreenHeader
        action={
          loadState === "ready" ? (
            <Button onClick={onCreateCampaign} size="small" variant="secondary">
              New
            </Button>
          ) : undefined
        }
        eyebrow="Campaign workspace"
        subtitle="Track everything from first brief to paid placement in one mobile-first operating view."
        title="Your campaigns"
      />

      {loadState === "loading" ? (
        <>
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </>
      ) : null}

      {loadState === "empty" ? (
        <EmptyState
          actionLabel="Create campaign"
          description="Create one campaign brief and keep discovery, deal progress, and results in one place."
          onAction={onCreateCampaign}
          title="Launch your first campaign"
        />
      ) : null}

      {loadState === "error" ? (
        <Card>
          <div className="form-section">
            <div>
              <h2 className="placeholder-card__title">
                Campaigns are unavailable
              </h2>
              <p className="placeholder-card__copy">
                {errorMessage ??
                  "We could not load your campaign records right now. Retry or start a new draft locally."}
              </p>
            </div>
            <Button fullWidth onClick={onRetry}>
              Retry
            </Button>
            <Button fullWidth onClick={onCreateCampaign} variant="secondary">
              Create campaign
            </Button>
          </div>
        </Card>
      ) : null}

      {loadState === "ready" ? (
        <>
          <div className="summary-strip">
            <div className="summary-pill">
              <div className="summary-pill__label">Records</div>
              <div className="summary-pill__value">{campaigns.length}</div>
            </div>
            <div className="summary-pill">
              <div className="summary-pill__label">In motion</div>
              <div className="summary-pill__value">{inFlightCount}</div>
            </div>
            <div className="summary-pill">
              <div className="summary-pill__label">Published</div>
              <div className="summary-pill__value">{publishedCount}</div>
            </div>
          </div>
          <CampaignList campaigns={campaigns} onSelect={onOpenCampaign} />
        </>
      ) : null}
    </div>
  );
};
