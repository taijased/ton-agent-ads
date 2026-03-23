import { StatusChip } from "../../../components/ui/StatusChip";
import {
  formatCampaignAmount,
  formatGoalLabel,
  formatRelativeTime,
} from "../../../lib/format";
import type { CampaignSummary } from "../types";

interface CampaignCardProps {
  campaign: CampaignSummary;
  onSelect: (campaignId: string) => void;
}

export const CampaignCard = ({ campaign, onSelect }: CampaignCardProps) => {
  return (
    <button
      className="card campaign-card"
      onClick={() => {
        onSelect(campaign.id);
      }}
      type="button"
    >
      <div
        className={`campaign-card__preview campaign-card__preview--${campaign.previewTone}`}
      >
        {campaign.previewUrl ? (
          <img
            alt={`${campaign.title} preview`}
            className="campaign-card__preview-image"
            src={campaign.previewUrl}
          />
        ) : null}
        <span className="campaign-card__preview-badge">
          {campaign.previewKind === "video" ? "Video" : "Image"}
        </span>
        <span className="campaign-card__preview-label">
          {campaign.previewLabel}
        </span>
      </div>

      <div className="campaign-card__body">
        <div className="campaign-card__header">
          <div>
            <div className="campaign-card__eyebrow">
              {formatGoalLabel(campaign.goal)}
            </div>
            <h2 className="campaign-card__title">{campaign.title}</h2>
          </div>
        </div>

        <p className="campaign-card__description">{campaign.description}</p>

        <div className="campaign-card__meta">
          <div className="campaign-card__meta-row">
            <span className="campaign-card__meta-label">Channel</span>
            <span className="campaign-card__meta-value">
              {campaign.selectedChannelLabel}
            </span>
          </div>

          <div className="campaign-card__meta-row">
            <span className="campaign-card__meta-label">Budget</span>
            <span className="campaign-card__meta-value">
              {formatCampaignAmount(campaign.amountTon, campaign.amountKind)}
            </span>
          </div>

          <div className="campaign-card__meta-row">
            <span className="campaign-card__meta-label">
              {campaign.metricLabel}
            </span>
            <span className="campaign-card__meta-value">
              {campaign.metricValue}
            </span>
          </div>

          <div className="campaign-card__meta-row">
            <span className="campaign-card__meta-label">Status</span>
            <StatusChip status={campaign.status} />
          </div>
        </div>

        <div className="campaign-card__timestamp">
          Updated {formatRelativeTime(campaign.updatedAt)}
        </div>
      </div>
    </button>
  );
};
