import { useEffect, useState } from "react";
import type {
  AdminContact,
  ChannelAdminParseStatus,
  ChannelReadinessStatus,
} from "@repo/types";
import { EditIcon } from "../../../components/ui/AppIcons";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { LoadingCard } from "../../../components/ui/LoadingCard";
import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import { StatusChip } from "../../../components/ui/StatusChip";
import type { WizardStepId } from "../../create-campaign/types";
import {
  formatCampaignAmount,
  formatDetailTimestamp,
  formatExpectedPriceLabel,
  formatGoalLabel,
  formatLanguageLabel,
  formatRelativeTime,
  getInitials,
} from "../../../lib/format";
import type {
  CampaignDetailsView,
  CampaignWorkspace,
  CampaignWorkspaceChatCard,
  CampaignWorkspaceStatusBucket,
  CampaignWorkspaceTabId,
} from "../types";

interface CampaignDetailsScreenProps {
  campaign: CampaignDetailsView | null;
  errorMessage: string | null;
  isLoading: boolean;
  isWorkspaceLoading: boolean;
  onBack: () => void;
  onEdit: (step: Exclude<WizardStepId, "finish">) => void;
  onRetryChannelAdminParse: (channelId: string) => void;
  onRetryWorkspace: () => void;
  workspace: CampaignWorkspace | null;
  workspaceErrorMessage: string | null;
  workspaceNoticeMessage: string | null;
}

interface OverviewWishlistCard {
  id: string;
  channelId: string | null;
  name: string;
  username: string | null;
  avatar: string | null;
  adminParseStatus: ChannelAdminParseStatus;
  readinessStatus: ChannelReadinessStatus;
  adminContacts: AdminContact[];
  adminCount: number;
  lastParsedAt: string | null;
  updatedAt: string;
}

const workspaceTabOrder: CampaignWorkspaceTabId[] = [
  "overview",
  "chats",
  "analytics",
];

const workspaceTabLabels: Record<CampaignWorkspaceTabId, string> = {
  overview: "Overview",
  chats: "Chats",
  analytics: "Analytics",
};

const workspaceBucketOrder: CampaignWorkspaceStatusBucket[] = [
  "negotiations",
  "refused",
  "waiting_payment",
  "waiting_publication",
  "completed",
];

const workspaceBucketLabels: Record<CampaignWorkspaceStatusBucket, string> = {
  negotiations: "Negotiations",
  refused: "Refused",
  waiting_payment: "Waiting payment",
  waiting_publication: "Waiting publication confirmation",
  completed: "Completed",
};

const formatWorkspaceStatusLabel = (value: string): string =>
  value
    .split("_")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

const parseStatusLabels: Record<ChannelAdminParseStatus, string> = {
  pending: "Pending",
  parsing: "Parsing",
  admins_found: "Admins found",
  admins_not_found: "No admins found",
  needs_review: "Needs review",
  failed: "Failed",
};

const readinessStatusLabels: Record<ChannelReadinessStatus, string> = {
  unknown: "Unknown",
  ready: "Ready",
  not_ready: "Not ready",
};

const getOverviewWishlistCards = (
  campaign: CampaignDetailsView,
  workspace: CampaignWorkspace | null,
): OverviewWishlistCard[] => {
  if ((workspace?.chatCards.length ?? 0) > 0) {
    return (
      workspace?.chatCards.map((card) => ({
        id: card.id,
        channelId: card.channelId,
        name: card.channelName,
        username: card.channelUsername,
        avatar: card.channelAvatarUrl,
        adminParseStatus: card.adminParseStatus,
        readinessStatus: card.readinessStatus,
        adminContacts: card.adminContacts,
        adminCount: card.adminCount,
        lastParsedAt: card.lastParsedAt,
        updatedAt: card.updatedAt,
      })) ?? []
    );
  }

  return campaign.shortlistedChannels.map((channel) => {
    return {
      id: channel.id,
      channelId: null,
      name: channel.name,
      username: channel.username,
      avatar: channel.avatar,
      adminParseStatus: "pending",
      readinessStatus: "unknown",
      adminContacts: [],
      adminCount: 0,
      lastParsedAt: null,
      updatedAt: campaign.updatedAt,
    };
  });
};

const getOverviewShortlistLabel = (
  campaign: CampaignDetailsView,
  workspace: CampaignWorkspace | null,
): string => {
  if (campaign.shortlistedChannels.length > 0) {
    return campaign.selectedChannelLabel;
  }

  const chatCards = workspace?.chatCards ?? [];

  if (chatCards.length === 0) {
    return "No shortlist yet";
  }

  if (chatCards.length === 1) {
    return (
      chatCards[0]?.channelUsername ?? chatCards[0]?.channelName ?? "1 channel"
    );
  }

  const firstChannel = chatCards[0];

  return `${firstChannel?.channelUsername ?? firstChannel?.channelName ?? "Workspace"} +${
    chatCards.length - 1
  } more`;
};

const getChatPreview = (card: CampaignWorkspaceChatCard) => {
  if (card.pendingApproval !== null) {
    return {
      label: "Approval request",
      text: card.pendingApproval.summary,
    };
  }

  if (card.latestMessage !== null) {
    return {
      label: card.latestMessage.senderLabel,
      text: card.latestMessage.text,
    };
  }

  return {
    label: "System",
    text: "No negotiation update yet for this channel.",
  };
};

const getWishlistStateCopy = (
  card: Pick<
    OverviewWishlistCard,
    "adminParseStatus" | "adminContacts" | "adminCount"
  >,
): { headline: string; description: string | null } => {
  switch (card.adminParseStatus) {
    case "admins_found":
      return {
        headline: "Ready for negotiation",
        description: null,
      };
    case "admins_not_found":
      return {
        headline: "No admins found",
        description: "We could not detect admin contacts for this channel.",
      };
    case "needs_review":
      return {
        headline: "Needs review",
        description: "We found possible contacts but confidence is low.",
      };
    case "failed":
      return {
        headline: "Parsing failed",
        description: "Admin parsing could not finish for this channel.",
      };
    case "pending":
    case "parsing":
    default:
      return {
        headline: "Parsing admins...",
        description:
          card.adminCount > 0 || card.adminContacts.length > 0
            ? null
            : "We are checking this channel for public admin contacts.",
      };
  }
};

const formatAdminContactSource = (value: AdminContact["source"]): string => {
  switch (value) {
    case "channel_description":
      return "Channel description";
    case "linked_chat":
      return "Linked chat";
    case "forwarded_messages":
      return "Forwarded messages";
    case "manual":
      return "Manual";
    case "unknown":
    default:
      return "Unknown source";
  }
};

const DetailsBackButton = ({
  onBack,
}: Pick<CampaignDetailsScreenProps, "onBack">) => {
  return (
    <button className="details-back" onClick={onBack} type="button">
      <span aria-hidden="true">←</span>
      <span>Back to campaigns</span>
    </button>
  );
};

const EditSectionButton = ({
  label = "Edit",
  onClick,
}: {
  label?: string;
  onClick: () => void;
}) => (
  <Button
    aria-label={label}
    className="icon-button"
    onClick={onClick}
    size="small"
    title={label}
    variant="secondary"
  >
    <EditIcon aria-hidden="true" className="button__icon" />
  </Button>
);

export const CampaignDetailsScreen = ({
  campaign,
  errorMessage,
  isLoading,
  isWorkspaceLoading,
  onBack,
  onEdit,
  onRetryChannelAdminParse,
  onRetryWorkspace,
  workspace,
  workspaceErrorMessage,
  workspaceNoticeMessage,
}: CampaignDetailsScreenProps) => {
  const [activeTab, setActiveTab] =
    useState<CampaignWorkspaceTabId>("overview");

  useEffect(() => {
    setActiveTab("overview");
  }, [campaign?.id]);

  if (isLoading) {
    return (
      <div className="screen-stack">
        <DetailsBackButton onBack={onBack} />
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
        <DetailsBackButton onBack={onBack} />
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
        <DetailsBackButton onBack={onBack} />
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

  const overviewWishlistCards = getOverviewWishlistCards(campaign, workspace);
  const overviewShortlistLabel = getOverviewShortlistLabel(campaign, workspace);
  const chatCards = workspace?.chatCards ?? [];
  const bucketGroups = workspaceBucketOrder.map((bucket) => ({
    bucket,
    cards: chatCards.filter((card) => card.bucket === bucket),
  }));

  return (
    <div className="screen-stack">
      <DetailsBackButton onBack={onBack} />

      <ScreenHeader
        eyebrow={formatGoalLabel(campaign.goal)}
        subtitle={`Updated ${formatRelativeTime(campaign.updatedAt)}`}
        title={campaign.title}
        status={campaign.status}
      />

      <Card>
        <div className="form-section">
          <div className="campaign-card__header">
            <div>
              <div className="campaign-card__eyebrow">Campaign workspace</div>
              <h2 className="campaign-card__title">{campaign.title}</h2>
            </div>
            <div className="overview-card__actions">
              <EditSectionButton
                label="Edit brief"
                onClick={() => {
                  onEdit("basic");
                }}
              />
            </div>
          </div>

          <p className="campaign-card__description">{campaign.text}</p>

          <div
            className="workspace-tabs"
            role="tablist"
            aria-label="Campaign workspace"
          >
            {workspaceTabOrder.map((tabId) => {
              const isActive = activeTab === tabId;

              return (
                <button
                  aria-selected={isActive}
                  className={`workspace-tab${
                    isActive ? " workspace-tab--active" : ""
                  }`}
                  key={tabId}
                  onClick={() => {
                    setActiveTab(tabId);
                  }}
                  role="tab"
                  type="button"
                >
                  {workspaceTabLabels[tabId]}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {activeTab === "overview" ? (
        <div className="workspace-panel">
          <Card>
            <div className="form-section">
              <div className="overview-card__header">
                <div>
                  <div className="campaign-card__eyebrow">Overview</div>
                  <h2 className="placeholder-card__title">Campaign summary</h2>
                </div>
                <div className="overview-card__action">
                  <EditSectionButton
                    label="Edit budget"
                    onClick={() => {
                      onEdit("budget");
                    }}
                  />
                </div>
              </div>
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
                    {formatCampaignAmount(
                      Number(campaign.budget) || 0,
                      "budget",
                    )}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-row__label">Language</span>
                  <span className="info-row__value">
                    {formatLanguageLabel(campaign.language)}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-row__label">Channels</span>
                  <span className="info-row__value">
                    {overviewShortlistLabel}
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
                <div className="details-card__header">
                  <h2 className="placeholder-card__title">Targeting</h2>
                  <EditSectionButton
                    onClick={() => {
                      onEdit("targeting");
                    }}
                  />
                </div>
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
                  {workspace !== null ? (
                    <div className="info-row">
                      <span className="info-row__label">Workspace</span>
                      <span className="info-row__value">
                        {workspace.counts.total} channel
                        {workspace.counts.total === 1 ? "" : "s"}
                      </span>
                    </div>
                  ) : null}
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
                <div className="details-card__header">
                  <h2 className="placeholder-card__title">Creative</h2>
                  <EditSectionButton
                    onClick={() => {
                      onEdit("creative");
                    }}
                  />
                </div>
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
                    <span className="info-row__value">
                      {campaign.media.length}
                    </span>
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
                <div className="details-card__header">
                  <h2 className="placeholder-card__title">
                    Shortlisted channels
                  </h2>
                  <EditSectionButton
                    onClick={() => {
                      onEdit("channels");
                    }}
                  />
                </div>
                {overviewWishlistCards.length > 0 ? (
                  <div className="shortlist-list">
                    {overviewWishlistCards.map((card) => {
                      const stateCopy = getWishlistStateCopy(card);
                      const updatedAt = card.lastParsedAt ?? card.updatedAt;

                      return (
                        <div
                          className="shortlist-item shortlist-item--rich"
                          key={card.id}
                        >
                          <div className="shortlist-item__header">
                            <div className="shortlist-item__identity">
                              <div className="shortlist-avatar">
                                {card.avatar ? (
                                  <img alt={card.name} src={card.avatar} />
                                ) : (
                                  getInitials(card.name)
                                )}
                              </div>
                              <div className="shortlist-item__content">
                                <div className="channel-card__title">
                                  {card.name}
                                </div>
                                <div className="channel-card__handle">
                                  {card.username
                                    ? `@${card.username.replace(/^@/, "")}`
                                    : "No public username"}
                                </div>
                              </div>
                            </div>

                            <div className="shortlist-item__badges">
                              <span
                                className={`wishlist-badge wishlist-badge--${card.adminParseStatus}`}
                              >
                                {parseStatusLabels[card.adminParseStatus]}
                              </span>
                              <span
                                className={`wishlist-badge wishlist-badge--${card.readinessStatus}`}
                              >
                                {readinessStatusLabels[card.readinessStatus]}
                              </span>
                            </div>
                          </div>

                          <div className="shortlist-item__details">
                            <div className="shortlist-item__headline">
                              {stateCopy.headline}
                            </div>
                            {stateCopy.description ? (
                              <p className="details-text">
                                {stateCopy.description}
                              </p>
                            ) : null}

                            {card.adminContacts.length > 0 ? (
                              <div className="admin-contact-list">
                                {card.adminContacts.map((contact) => (
                                  <div
                                    className="admin-contact-item"
                                    key={contact.id}
                                  >
                                    <div className="admin-contact-item__handle">
                                      {contact.telegramHandle}
                                    </div>
                                    <div className="admin-contact-item__meta">
                                      {formatAdminContactSource(contact.source)}{" "}
                                      ·{" "}
                                      {Math.round(
                                        contact.confidenceScore * 100,
                                      )}
                                      % confidence
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            <div className="shortlist-item__footer">
                              <span className="shortlist-item__timestamp">
                                Last updated {formatRelativeTime(updatedAt)}
                              </span>

                              {card.channelId ? (
                                <Button
                                  disabled={card.adminParseStatus === "parsing"}
                                  onClick={() => {
                                    onRetryChannelAdminParse(card.channelId!);
                                  }}
                                  size="small"
                                  variant="secondary"
                                >
                                  Retry parsing
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="placeholder-card__copy">
                    No channels were shortlisted before creation.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {activeTab === "chats" ? (
        <div className="workspace-panel">
          {workspaceNoticeMessage ? (
            <div className="workspace-banner">{workspaceNoticeMessage}</div>
          ) : null}

          {isWorkspaceLoading ? <LoadingCard /> : null}

          {!isWorkspaceLoading &&
          workspaceErrorMessage &&
          chatCards.length === 0 ? (
            <Card>
              <div className="form-section">
                <div>
                  <h2 className="placeholder-card__title">
                    Chats could not load
                  </h2>
                  <p className="placeholder-card__copy">
                    {workspaceErrorMessage}
                  </p>
                </div>
                <Button fullWidth onClick={onRetryWorkspace}>
                  Retry workspace
                </Button>
              </div>
            </Card>
          ) : null}

          {!isWorkspaceLoading &&
          !workspaceErrorMessage &&
          bucketGroups.every((group) => group.cards.length === 0) ? (
            <Card>
              <div className="placeholder-card workspace-empty">
                <h2 className="placeholder-card__title">No chats yet</h2>
                <p className="placeholder-card__copy">
                  {overviewWishlistCards.length === 0
                    ? "This campaign was created without selected channels, so no negotiation cards exist yet."
                    : "Selected channels will appear here once the campaign workspace has active deal rows."}
                </p>
              </div>
            </Card>
          ) : null}

          {!isWorkspaceLoading &&
            bucketGroups
              .filter((group) => group.cards.length > 0)
              .map((group) => (
                <Card key={group.bucket}>
                  <div className="placeholder-card details-card workspace-group">
                    <div className="workspace-group__header">
                      <div>
                        <div className="campaign-card__eyebrow">
                          {workspaceBucketLabels[group.bucket]}
                        </div>
                        <h2 className="placeholder-card__title">
                          {group.cards.length} card
                          {group.cards.length === 1 ? "" : "s"}
                        </h2>
                      </div>
                      <span className="workspace-group__count">
                        {group.cards.length} active
                      </span>
                    </div>

                    <div className="workspace-chat-list">
                      {group.cards.map((card) => {
                        const preview = getChatPreview(card);

                        return (
                          <div className="workspace-chat-card" key={card.id}>
                            <div className="workspace-chat-card__header">
                              <div className="workspace-chat-card__identity">
                                <div className="shortlist-avatar">
                                  {card.channelAvatarUrl ? (
                                    <img
                                      alt={card.channelName}
                                      src={card.channelAvatarUrl}
                                    />
                                  ) : (
                                    getInitials(card.channelName)
                                  )}
                                </div>
                                <div className="workspace-chat-card__copy">
                                  <div className="channel-card__title">
                                    {card.channelName}
                                  </div>
                                  <div className="channel-card__handle">
                                    {card.channelUsername
                                      ? `@${card.channelUsername.replace(/^@/, "")}`
                                      : "No public username"}
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`workspace-status-chip workspace-status-chip--${card.bucket}`}
                              >
                                {workspaceBucketLabels[card.bucket]}
                              </span>
                            </div>

                            <div className="workspace-chat-card__meta">
                              <span>
                                {formatWorkspaceStatusLabel(card.status)}
                              </span>
                              <span>
                                Updated {formatRelativeTime(card.updatedAt)}
                              </span>
                              <span>
                                {formatExpectedPriceLabel(card.priceTon)}
                              </span>
                            </div>

                            <div className="workspace-chat-card__preview">
                              <div className="workspace-chat-card__preview-label">
                                {preview.label}
                              </div>
                              <p className="details-text">{preview.text}</p>
                            </div>

                            {card.pendingApproval !== null ? (
                              <div className="workspace-chat-card__approval">
                                <span className="tag-chip">
                                  Awaiting approval
                                </span>
                                <span className="workspace-chat-card__approval-meta">
                                  {card.pendingApproval.proposedPriceTon !==
                                  null
                                    ? `${card.pendingApproval.proposedPriceTon} TON`
                                    : "Price pending"}
                                  {card.pendingApproval.proposedDateText
                                    ? ` · ${card.pendingApproval.proposedDateText}`
                                    : ""}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              ))}
        </div>
      ) : null}

      {activeTab === "analytics" ? (
        <div className="workspace-panel">
          <Card>
            <div className="placeholder-card workspace-soon">
              <span className="workspace-soon__chip">Soon!</span>
              <h2 className="placeholder-card__title">Analytics</h2>
              <p className="placeholder-card__copy">
                Publication proof, views, clicks, and subscriber lift will land
                here once campaign reporting is integrated.
              </p>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
};
