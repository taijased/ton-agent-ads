import type {
  CampaignRepository,
  ChannelRepository,
  ConversationThreadRepository,
  DealApprovalRequestRepository,
  DealMessageRepository,
  DealRepository,
} from "@repo/db";
import type {
  CampaignWorkspaceChatCard,
  CampaignWorkspaceCounts,
  CampaignWorkspaceResponse,
  Deal,
  DealStatus,
} from "@repo/types";
import type { ChannelAdminService } from "./channel-admin-service.js";

const buildCounts = (
  deals: Array<Pick<Deal, "status">>,
): CampaignWorkspaceCounts => {
  const counts: CampaignWorkspaceCounts = {
    total: deals.length,
    negotiations: 0,
    refused: 0,
    waitingPayment: 0,
    waitingPublication: 0,
    completed: 0,
  };

  for (const deal of deals) {
    switch (deal.status) {
      case "rejected":
      case "failed":
        counts.refused += 1;
        break;
      case "terms_agreed":
      case "payment_pending":
        counts.waitingPayment += 1;
        break;
      case "paid":
      case "proof_pending":
        counts.waitingPublication += 1;
        break;
      case "completed":
      case "published":
        counts.completed += 1;
        break;
      case "pending":
      case "negotiating":
      case "waiting_user":
      case "awaiting_user_approval":
      case "approved":
      case "admin_outreach_pending":
      case "admin_contacted":
      default:
        counts.negotiations += 1;
        break;
    }
  }

  return counts;
};

const resolveUpdatedAt = (
  deal: Deal,
  latestMessageCreatedAt: string | null,
  pendingApprovalCreatedAt: string | null,
  lastParsedAt: string | null,
): string =>
  [
    latestMessageCreatedAt,
    pendingApprovalCreatedAt,
    lastParsedAt,
    deal.completedAt,
    deal.failedAt,
    deal.paidAt,
    deal.termsAgreedAt,
    deal.adminContactedAt,
    deal.createdAt,
  ].find(
    (value): value is string => typeof value === "string" && value.length > 0,
  ) ?? deal.createdAt;

const resolvePriceTon = (
  deal: Deal,
  pendingApprovalPriceTon: number | null,
): number | null => {
  if (pendingApprovalPriceTon !== null) {
    return pendingApprovalPriceTon;
  }

  switch (deal.status) {
    case "terms_agreed":
    case "payment_pending":
    case "paid":
    case "proof_pending":
    case "completed":
    case "published":
      return deal.price;
    default:
      return null;
  }
};

export class CampaignWorkspaceService {
  public constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly channelRepository: ChannelRepository,
    private readonly dealRepository: DealRepository,
    private readonly dealMessageRepository: DealMessageRepository,
    private readonly dealApprovalRequestRepository: DealApprovalRequestRepository,
    private readonly channelAdminService: ChannelAdminService,
    private readonly conversationThreadRepository: ConversationThreadRepository,
  ) {}

  public async getByCampaignId(
    campaignId: string,
    userId?: string,
  ): Promise<CampaignWorkspaceResponse | null> {
    const campaign =
      userId === undefined
        ? await this.campaignRepository.findById(campaignId)
        : await this.campaignRepository.findByIdForUser(campaignId, userId);

    if (campaign === null) {
      return null;
    }

    const [deals, threads] = await Promise.all([
      this.dealRepository.getDealsByCampaignId(campaignId),
      this.conversationThreadRepository.getByCampaignId(campaignId),
    ]);

    const dealIdToThreadId = new Map<string, string>();
    for (const thread of threads) {
      if (thread.dealId !== null) {
        dealIdToThreadId.set(thread.dealId, thread.id);
      }
    }

    const chatCards = await Promise.all(
      deals.map((deal) =>
        this.buildChatCard(deal, dealIdToThreadId.get(deal.id)),
      ),
    );

    chatCards.sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );

    return {
      campaignId,
      chatCards,
      counts: buildCounts(deals),
      analyticsState: "soon",
    };
  }

  public async retryAdminParse(
    campaignId: string,
    userIdOrChannelId: string,
    channelId?: string,
  ): Promise<CampaignWorkspaceChatCard | null> {
    const resolvedUserId =
      channelId === undefined ? undefined : userIdOrChannelId;
    const resolvedChannelId =
      channelId === undefined ? userIdOrChannelId : channelId;
    const campaign =
      resolvedUserId === undefined
        ? await this.campaignRepository.findById(campaignId)
        : await this.campaignRepository.findByIdForUser(
            campaignId,
            resolvedUserId,
          );

    if (campaign === null) {
      return null;
    }

    const deal = await this.dealRepository.findByCampaignAndChannel(
      campaignId,
      resolvedChannelId,
    );

    if (deal === null) {
      return null;
    }

    await this.channelAdminService.parseChannel(resolvedChannelId);

    const threads =
      await this.conversationThreadRepository.getByCampaignId(campaignId);
    let threadId: string | undefined;
    for (const thread of threads) {
      if (thread.dealId === deal.id) {
        threadId = thread.id;
        break;
      }
    }

    return this.buildChatCard(deal, threadId);
  }

  private async buildChatCard(
    deal: Deal,
    threadId?: string,
  ): Promise<CampaignWorkspaceChatCard> {
    const [channel, latestMessages, pendingApproval] = await Promise.all([
      this.channelRepository.getChannelById(deal.channelId),
      this.dealMessageRepository.listRecentByDealId(deal.id, 1),
      this.dealApprovalRequestRepository.getPendingByDealId(deal.id),
    ]);

    const latestMessage = latestMessages.at(-1) ?? null;

    return {
      id: threadId ?? deal.id,
      dealId: deal.id,
      channel: {
        id: channel?.id ?? null,
        title: channel?.title ?? "Unknown channel",
        username: channel?.username ?? null,
        avatarUrl: null,
      },
      status: deal.status,
      priceTon: resolvePriceTon(
        deal,
        pendingApproval?.proposedPriceTon ?? null,
      ),
      latestMessage:
        latestMessage === null
          ? null
          : {
              text: latestMessage.text,
              senderType: latestMessage.senderType,
              createdAt: latestMessage.createdAt,
            },
      pendingApproval:
        pendingApproval === undefined
          ? null
          : {
              id: pendingApproval.id,
              status: pendingApproval.status,
              summary: pendingApproval.summary,
              proposedPriceTon: pendingApproval.proposedPriceTon,
              proposedDateText: pendingApproval.proposedDateText,
            },
      adminParseStatus: channel?.adminParseStatus ?? "pending",
      readinessStatus: channel?.readinessStatus ?? "unknown",
      adminCount: channel?.adminCount ?? 0,
      lastParsedAt: channel?.lastParsedAt ?? null,
      adminContacts: channel?.adminContacts ?? [],
      updatedAt: resolveUpdatedAt(
        deal,
        latestMessage?.createdAt ?? null,
        pendingApproval?.createdAt ?? null,
        channel?.lastParsedAt ?? null,
      ),
    };
  }
}
