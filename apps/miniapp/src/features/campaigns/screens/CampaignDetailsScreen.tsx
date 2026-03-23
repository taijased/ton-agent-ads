import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { LoadingCard } from "../../../components/ui/LoadingCard";
import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import { StatusChip } from "../../../components/ui/StatusChip";
import {
  formatCampaignAmount,
  formatDetailTimestamp,
  formatExpectedPriceLabel,
  formatGoalLabel,
  formatLanguageLabel,
  formatRelativeTime,
  formatViewsLabel,
  getInitials,
} from "../../../lib/format";
import type { CampaignDetailsView } from "../types";

interface CampaignDetailsScreenProps {
  campaign: CampaignDetailsView | null;
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

          <p className="campaign-card__description">{campaign.text}</p>

          <div className="info-list">
            <div className="info-row">
              <span className="info-row__label">Theme</span>
              <span className="info-row__value">
                {campaign.theme || "Not set"}
              </span>
            </div>
            <div className="info-row">
              <span className="info-row__label">Goal</span>
              <span className="info-row__value">
                {formatGoalLabel(campaign.goal)}
              </span>
            </div>
            <div className="info-row">
              <span className="info-row__label">Budget</span>
              <span className="info-row__value">
                {formatCampaignAmount(Number(campaign.budget) || 0, "budget")}
              </span>
            </div>
            <div className="info-row">
              <span className="info-row__label">Language</span>
              <span className="info-row__value">
                {formatLanguageLabel(campaign.language)}
              </span>
            </div>
            <div className="info-row">
              <span className="info-row__label">Shortlist</span>
              <span className="info-row__value">
                {campaign.shortlistedChannels.length > 0
                  ? campaign.selectedChannelLabel
                  : "No shortlist yet"}
              </span>
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

      <div className="details-grid">
        <Card>
          <div className="placeholder-card details-card">
            <h2 className="placeholder-card__title">Targeting</h2>
            <div className="info-list">
              <div className="info-row">
                <span className="info-row__label">Audience</span>
                <span className="info-row__value">
                  {campaign.targetAudience || "No target audience note"}
                </span>
              </div>
              <div className="info-row">
                <span className="info-row__label">Tags</span>
                <span className="info-row__value">
                  {campaign.tags.length > 0
                    ? `${campaign.tags.length} selected`
                    : "No tags"}
                </span>
              </div>
            </div>
            <div className="chip-list">
              {campaign.tags.length > 0 ? (
                campaign.tags.map((tag) => (
                  <span className="tag-chip" key={tag}>
                    {tag}
                  </span>
                ))
              ) : (
                <span className="tag-chip tag-chip--ghost">
                  No targeting tags
                </span>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <div className="placeholder-card details-card">
            <h2 className="placeholder-card__title">Creative</h2>
            {campaign.primaryMediaUrl ? (
              <div className="details-hero">
                {campaign.previewKind === "image" ? (
                  <img
                    alt={`${campaign.title} creative preview`}
                    className="details-hero__image"
                    src={campaign.primaryMediaUrl}
                  />
                ) : (
                  <div className="details-hero__placeholder">
                    Video creative linked
                  </div>
                )}
              </div>
            ) : (
              <div className="details-hero details-hero--empty">
                <div className="details-hero__placeholder">
                  No media attached
                </div>
              </div>
            )}
            <div className="info-list">
              <div className="info-row">
                <span className="info-row__label">Assets</span>
                <span className="info-row__value">{campaign.media.length}</span>
              </div>
              <div className="info-row">
                <span className="info-row__label">CTA URL</span>
                <span className="info-row__value">
                  {campaign.ctaUrl || "No CTA URL"}
                </span>
              </div>
              <div className="info-row">
                <span className="info-row__label">Button text</span>
                <span className="info-row__value">
                  {campaign.buttonText || "No button text"}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="placeholder-card details-card">
            <h2 className="placeholder-card__title">Shortlisted channels</h2>
            {campaign.shortlistedChannels.length > 0 ? (
              <div className="shortlist-list">
                {campaign.shortlistedChannels.map((channel) => (
                  <div className="shortlist-item" key={channel.id}>
                    <div className="shortlist-avatar">
                      {channel.avatar ? (
                        <img alt={channel.name} src={channel.avatar} />
                      ) : (
                        getInitials(channel.name)
                      )}
                    </div>
                    <div className="shortlist-item__content">
                      <div className="channel-card__title">{channel.name}</div>
                      <div className="channel-card__handle">
                        @{channel.username.replace(/^@/, "")}
                      </div>
                      <div className="shortlist-item__meta">
                        {formatViewsLabel(channel.avgViews)} reach ·{" "}
                        {formatExpectedPriceLabel(channel.expectedPrice)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="placeholder-card__copy">
                No channels were shortlisted before creation.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <div className="placeholder-card details-card">
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
