import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { LoadingCard } from "../../../components/ui/LoadingCard";
import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import { StatusChip } from "../../../components/ui/StatusChip";
import {
  formatCampaignAmount,
  formatDetailTimestamp,
  formatGoalLabel,
  formatRelativeTime,
} from "../../../lib/format";
import type { CampaignSummary } from "../types";

interface CampaignDetailsScreenProps {
  campaign: CampaignSummary | null;
  errorMessage: string | null;
  isLoading: boolean;
  onBack: () => void;
}

export const CampaignDetailsScreen = ({
  campaign,
  errorMessage,
  isLoading,
  onBack,
}: CampaignDetailsScreenProps) => {
  if (isLoading) {
    return (
      <div className="screen-stack">
        <button className="details-back" onClick={onBack} type="button">
          Back to campaigns
        </button>
        <ScreenHeader
          eyebrow="Campaign record"
          subtitle="Loading campaign summary"
          title="Campaign details"
        />
        <LoadingCard />
      </div>
    );
  }

  if (errorMessage && campaign === null) {
    return (
      <div className="screen-stack">
        <button className="details-back" onClick={onBack} type="button">
          Back to campaigns
        </button>
        <Card>
          <div className="form-section">
            <div>
              <h2 className="placeholder-card__title">
                Campaign could not load
              </h2>
              <p className="placeholder-card__copy">{errorMessage}</p>
            </div>
            <Button fullWidth onClick={onBack}>
              Return to campaigns
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (campaign === null) {
    return (
      <div className="screen-stack">
        <button className="details-back" onClick={onBack} type="button">
          Back to campaigns
        </button>
        <Card>
          <div className="form-section">
            <div>
              <h2 className="placeholder-card__title">Campaign not found</h2>
              <p className="placeholder-card__copy">
                This route does not point to a campaign in the current list. Go
                back and pick another record.
              </p>
            </div>
            <Button fullWidth onClick={onBack}>
              Back to campaigns
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="screen-stack">
      <button className="details-back" onClick={onBack} type="button">
        Back to campaigns
      </button>

      <ScreenHeader
        eyebrow={formatGoalLabel(campaign.goal)}
        subtitle={`Updated ${formatRelativeTime(campaign.updatedAt)}`}
        title={campaign.title}
      />

      <Card>
        <div className="form-section">
          <div className="campaign-card__header">
            <div>
              <div className="campaign-card__eyebrow">Campaign summary</div>
              <h2 className="campaign-card__title">{campaign.title}</h2>
            </div>
            <StatusChip status={campaign.status} />
          </div>

          <p className="campaign-card__description">{campaign.description}</p>

          <div className="info-list">
            <div className="info-row">
              <span className="info-row__label">Channel</span>
              <span className="info-row__value">
                {campaign.selectedChannelLabel}
              </span>
            </div>
            <div className="info-row">
              <span className="info-row__label">Amount</span>
              <span className="info-row__value">
                {formatCampaignAmount(campaign.amountTon, campaign.amountKind)}
              </span>
            </div>
            <div className="info-row">
              <span className="info-row__label">{campaign.metricLabel}</span>
              <span className="info-row__value">{campaign.metricValue}</span>
            </div>
            <div className="info-row">
              <span className="info-row__label">Created</span>
              <span className="info-row__value">
                {formatDetailTimestamp(campaign.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="placeholder-grid">
        <Card>
          <div className="placeholder-card">
            <h2 className="placeholder-card__title">Campaign details</h2>
            <p className="placeholder-card__copy">
              This Phase 1 stub keeps the record visible before the full
              campaign workspace lands.
            </p>
            <span className="placeholder-card__tag">Phase 2</span>
          </div>
        </Card>

        <Card>
          <div className="placeholder-card">
            {/* TODO(phase-2): replace with recommendation data once campaign details API is available. */}
            <h2 className="placeholder-card__title">Recommendations</h2>
            <p className="placeholder-card__copy">
              Channel matching and shortlist insights will appear here once the
              recommendation surface is wired.
            </p>
            <span className="placeholder-card__tag">Recommendation data</span>
          </div>
        </Card>

        <Card>
          <div className="placeholder-card">
            {/* TODO(phase-2): replace with payment and wallet integration data once those contracts exist. */}
            <h2 className="placeholder-card__title">Payment and wallet</h2>
            <p className="placeholder-card__copy">
              Payment checkpoints, TON receipts, and wallet actions are reserved
              for the next phase.
            </p>
            <span className="placeholder-card__tag">Payment data</span>
          </div>
        </Card>

        <Card>
          <div className="placeholder-card">
            {/* TODO(phase-2): replace with analytics summary when publication and reporting data are available. */}
            <h2 className="placeholder-card__title">Analytics</h2>
            <p className="placeholder-card__copy">
              Publication proof, views, clicks, and subscriber metrics will fill
              this section once analytics data is integrated.
            </p>
            <span className="placeholder-card__tag">Analytics data</span>
          </div>
        </Card>
      </div>
    </div>
  );
};
