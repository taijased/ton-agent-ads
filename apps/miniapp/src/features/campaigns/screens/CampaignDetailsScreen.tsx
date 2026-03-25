import { useEffect, useRef, useState, type CSSProperties } from "react";
import type {
  AdminContact,
  ChannelAdminParseStatus,
  ChannelReadinessStatus,
  ConversationDirection,
  ConversationThreadStatus,
} from "@repo/types";
import { EditIcon } from "../../../components/ui/AppIcons";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { LoadingCard } from "../../../components/ui/LoadingCard";
import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import type { WizardStepId } from "../../create-campaign/types";
import {
  formatCampaignAmount,
  formatDetailTimestamp,
  formatGoalLabel,
  formatLanguageLabel,
  formatRelativeTime,
  getInitials,
} from "../../../lib/format";
import type {
  CampaignDetailsView,
  CampaignWishlistCard,
  CampaignWorkspace,
  CampaignWorkspaceChatCard,
  CampaignWorkspaceTabId,
} from "../types";

interface CampaignDetailsScreenProps {
  campaign: CampaignDetailsView | null;
  errorMessage: string | null;
  isLoading: boolean;
  isStartingNegotiation: boolean;
  isWorkspaceLoading: boolean;
  isRetryingChannelAdminParse: (channelId: string) => boolean;
  onBack: () => void;
  onEdit: (step: Exclude<WizardStepId, "finish">) => void;
  onRetryChannelAdminParse: (channelId: string) => void;
  onRetryWorkspace: () => void;
  onStartNegotiation: () => void;
  workspace: CampaignWorkspace | null;
  workspaceErrorMessage: string | null;
  workspaceNoticeMessage: string | null;
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

const conversationStatusLabels: Record<ConversationThreadStatus, string> = {
  not_started: "Not started",
  message_queued: "Queued",
  message_sent: "Sent",
  awaiting_reply: "Awaiting reply",
  replied: "Replied",
  in_negotiation: "In negotiation",
  no_response: "No response",
  failed: "Failed",
  closed: "Closed",
};

const conversationDirectionLabels: Record<ConversationDirection, string> = {
  outbound: "Last outbound",
  inbound: "Last reply",
  system: "System event",
};

const getOverviewWishlistCards = (
  campaign: CampaignDetailsView,
  workspace: CampaignWorkspace | null,
): CampaignWishlistCard[] => {
  if ((workspace?.wishlistCards.length ?? 0) > 0) {
    return workspace?.wishlistCards ?? [];
  }

  return campaign.shortlistedChannels.map((channel) => ({
    id: `${campaign.id}:${channel.id}:wishlist-fallback`,
    channelId: null,
    channelName: channel.name,
    channelUsername: channel.username,
    channelAvatarUrl: channel.avatar,
    adminParseStatus: "pending",
    readinessStatus: "unknown",
    adminCount: 0,
    lastParsedAt: null,
    adminContacts: [],
    updatedAt: campaign.updatedAt,
    source: campaign.source,
  }));
};

const getOverviewShortlistLabel = (
  campaign: CampaignDetailsView,
  workspace: CampaignWorkspace | null,
): string => {
  const wishlistCards = workspace?.wishlistCards ?? [];

  if (wishlistCards.length === 0) {
    return campaign.selectedChannelLabel;
  }

  if (wishlistCards.length === 1) {
    return (
      wishlistCards[0]?.channelUsername ??
      wishlistCards[0]?.channelName ??
      "1 channel"
    );
  }

  const firstChannel = wishlistCards[0];

  return `${firstChannel?.channelUsername ?? firstChannel?.channelName ?? "Workspace"} +${
    wishlistCards.length - 1
  } more`;
};

const getThreadFallbackPreview = (status: ConversationThreadStatus): string => {
  switch (status) {
    case "message_queued":
      return "Intro message is queued for delivery.";
    case "message_sent":
      return "Intro message was sent to the admin.";
    case "awaiting_reply":
      return "Waiting for the admin to reply.";
    case "replied":
      return "Admin replied and the thread is ready for follow-up.";
    case "in_negotiation":
      return "Conversation is active with the channel admin.";
    case "no_response":
      return "No response has been recorded yet.";
    case "failed":
      return "Intro message could not be delivered.";
    case "closed":
      return "This conversation thread is closed.";
    case "not_started":
    default:
      return "Negotiation has not started yet for this admin.";
  }
};

const getChatPreview = (
  card: CampaignWorkspaceChatCard,
): { label: string; text: string } => {
  if (card.lastMessagePreview && card.lastMessagePreview.trim().length > 0) {
    return {
      label: card.lastDirection
        ? conversationDirectionLabels[card.lastDirection]
        : "Last message",
      text: card.lastMessagePreview,
    };
  }

  return {
    label: "System event",
    text: getThreadFallbackPreview(card.status),
  };
};

const getWishlistStateCopy = (
  card: Pick<
    CampaignWishlistCard,
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

const formatTelegramHandle = (value: string): string => {
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return "Unknown admin";
  }

  return trimmedValue.startsWith("@") ? trimmedValue : `@${trimmedValue}`;
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

const NegotiationLauncher = ({
  isLoading,
  onComplete,
  readyChannelCount,
}: {
  isLoading: boolean;
  onComplete: () => void;
  readyChannelCount: number;
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLButtonElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startOffset: number;
  } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  const getMaxOffset = () => {
    const trackWidth = trackRef.current?.offsetWidth ?? 0;
    const knobWidth = knobRef.current?.offsetWidth ?? 0;

    return Math.max(0, trackWidth - knobWidth + 10);
  };

  const progress =
    getMaxOffset() === 0 ? 0 : Math.min(1, dragOffset / getMaxOffset());

  useEffect(() => {
    if (!isLoading && hasTriggered) {
      setDragOffset(0);
      setIsDragging(false);
      setIsUnlocked(false);
      setHasTriggered(false);
    }
  }, [hasTriggered, isLoading]);

  const triggerUnlock = () => {
    if (isLoading || hasTriggered) {
      return;
    }

    setHasTriggered(true);
    setIsDragging(false);
    setIsUnlocked(true);
    setDragOffset(getMaxOffset());
    onComplete();
  };

  const finishDrag = (pointerId: number) => {
    const currentDrag = dragStateRef.current;

    if (currentDrag === null || currentDrag.pointerId !== pointerId) {
      return;
    }

    dragStateRef.current = null;
    setIsDragging(false);

    if (dragOffset >= getMaxOffset() * 0.9) {
      triggerUnlock();
      return;
    }

    setDragOffset(0);
  };

  return (
    <Card>
      <div className="form-section negotiation-launcher">
        <div>
          <div className="campaign-card__eyebrow">Launch outreach</div>
          <h2 className="placeholder-card__title">
            Start negotiation for ready channels
          </h2>
          <p className="placeholder-card__copy">
            Slide to create conversation threads and send the intro outreach
            message to the admins we found.
          </p>
        </div>

        <div
          className={`slide-control${
            isUnlocked ? " slide-control--unlocked" : ""
          }${isDragging ? " slide-control--dragging" : ""}`}
          ref={trackRef}
          style={
            {
              "--slide-progress": `${Math.round(progress * 100)}%`,
              "--slide-text-opacity": `${Math.max(0, 1 - progress)}`,
            } as CSSProperties
          }
        >
          <div className="slide-control__copy">
            <span className="slide-control__label">
              {isLoading ? "Starting negotiation..." : "Slide to start"}
            </span>
          </div>
          <button
            aria-label="Swipe to start negotiation"
            className={`slide-control__knob${
              isUnlocked ? " slide-control__knob--unlocked" : ""
            }`}
            disabled={isLoading}
            onClick={(event) => {
              if (event.detail === 0 && !isLoading && !hasTriggered) {
                triggerUnlock();
              }
            }}
            onPointerCancel={(event) => {
              finishDrag(event.pointerId);
            }}
            onPointerDown={(event) => {
              if (isLoading || hasTriggered || isUnlocked) {
                return;
              }

              dragStateRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startOffset: dragOffset,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
              setIsDragging(true);
            }}
            onPointerMove={(event) => {
              const currentDrag = dragStateRef.current;

              if (
                currentDrag === null ||
                currentDrag.pointerId !== event.pointerId ||
                isUnlocked
              ) {
                return;
              }

              const nextOffset = Math.min(
                Math.max(
                  0,
                  currentDrag.startOffset + event.clientX - currentDrag.startX,
                ),
                getMaxOffset(),
              );

              setDragOffset(nextOffset);
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }

              finishDrag(event.pointerId);
            }}
            style={
              isUnlocked
                ? undefined
                : {
                    left: `${Math.max(-10, dragOffset - 10)}px`,
                  }
            }
            ref={knobRef}
            type="button"
          >
            <span aria-hidden="true" className="slide-control__knob-icon">
              {isUnlocked ? "✓" : "→"}
            </span>
          </button>
        </div>
      </div>
    </Card>
  );
};

export const CampaignDetailsScreen = ({
  campaign,
  errorMessage,
  isLoading,
  isStartingNegotiation,
  isWorkspaceLoading,
  isRetryingChannelAdminParse,
  onBack,
  onEdit,
  onRetryChannelAdminParse,
  onRetryWorkspace,
  onStartNegotiation,
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
  const readyWishlistCards = overviewWishlistCards.filter(
    (card) => card.readinessStatus === "ready",
  );
  const isNegotiationStarted = campaign.negotiationStatus === "active";

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
          {workspaceNoticeMessage ? (
            <div className="workspace-banner">{workspaceNoticeMessage}</div>
          ) : null}

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
                    {workspaceErrorMessage ? (
                      <div className="workspace-banner">
                        {workspaceErrorMessage}
                      </div>
                    ) : null}
                    {overviewWishlistCards.map((card) => {
                      const stateCopy = getWishlistStateCopy(card);
                      const updatedAt = card.lastParsedAt ?? card.updatedAt;
                      const isRetrying =
                        card.channelId !== null &&
                        isRetryingChannelAdminParse(card.channelId);

                      return (
                        <div
                          className="shortlist-item shortlist-item--rich"
                          key={card.id}
                        >
                          <div className="shortlist-item__header">
                            <div className="shortlist-item__identity">
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
                              <div className="shortlist-item__content">
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

                            <div className="shortlist-item__badges">
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
                              <span
                                className={`wishlist-badge wishlist-badge--${card.adminParseStatus}`}
                              >
                                {parseStatusLabels[card.adminParseStatus]}
                              </span>
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

          {readyWishlistCards.length > 0 && !isNegotiationStarted ? (
            <NegotiationLauncher
              isLoading={isStartingNegotiation}
              onComplete={onStartNegotiation}
              readyChannelCount={readyWishlistCards.length}
            />
          ) : null}
        </div>
      ) : null}

      {activeTab === "chats" ? (
        <div className="workspace-panel">
          {workspaceNoticeMessage ? (
            <div className="workspace-banner">{workspaceNoticeMessage}</div>
          ) : null}

          {workspaceErrorMessage && chatCards.length > 0 ? (
            <div className="workspace-banner">{workspaceErrorMessage}</div>
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
          !isNegotiationStarted ? (
            <Card>
              <div className="placeholder-card workspace-empty">
                <h2 className="placeholder-card__title">
                  Negotiation has not started yet.
                </h2>
                <p className="placeholder-card__copy">
                  Start outreach from the Overview tab to create admin
                  conversations for ready channels.
                </p>
              </div>
            </Card>
          ) : null}

          {!isWorkspaceLoading &&
          !workspaceErrorMessage &&
          isNegotiationStarted &&
          chatCards.length === 0 ? (
            <Card>
              <div className="placeholder-card workspace-empty">
                <h2 className="placeholder-card__title">
                  No admin conversations were created because no channels were
                  ready.
                </h2>
                <p className="placeholder-card__copy">
                  Keep parsing shortlist channels for admin contacts, then start
                  negotiation again when they are marked ready.
                </p>
              </div>
            </Card>
          ) : null}

          {!isWorkspaceLoading && chatCards.length > 0 ? (
            <Card>
              <div className="placeholder-card details-card workspace-group">
                <div className="workspace-group__header">
                  <div>
                    <div className="campaign-card__eyebrow">
                      Admin conversations
                    </div>
                    <h2 className="placeholder-card__title">
                      {chatCards.length} thread
                      {chatCards.length === 1 ? "" : "s"}
                    </h2>
                  </div>
                  <span className="workspace-group__count">
                    {chatCards.length} active
                  </span>
                </div>

                <div className="workspace-chat-list">
                  {chatCards.map((card) => {
                    const preview = getChatPreview(card);
                    const updatedAt = card.lastMessageAt ?? card.updatedAt;

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
                              <div className="workspace-chat-card__admin">
                                {formatTelegramHandle(card.adminHandle)}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`workspace-status-chip workspace-status-chip--${card.status.replaceAll(
                              "_",
                              "-",
                            )}`}
                          >
                            {conversationStatusLabels[card.status]}
                          </span>
                        </div>

                        <div className="workspace-chat-card__meta">
                          <span>Updated {formatRelativeTime(updatedAt)}</span>
                          <span>
                            {card.outreachAttemptCount} outreach attempt
                            {card.outreachAttemptCount === 1 ? "" : "s"}
                          </span>
                        </div>

                        <div className="workspace-chat-card__preview">
                          <div className="workspace-chat-card__preview-label">
                            {preview.label}
                          </div>
                          <p className="details-text">{preview.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          ) : null}
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
