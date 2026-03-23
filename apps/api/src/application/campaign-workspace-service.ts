import type {
  CampaignRepository,
  ChannelRepository,
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
): string =>
  [
    latestMessageCreatedAt,
    pendingApprovalCreatedAt,
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
  ) {}

  public async getByCampaignId(
    campaignId: string,
  ): Promise<CampaignWorkspaceResponse | null> {
    const campaign = await this.campaignRepository.findById(campaignId);

    if (campaign === null) {
      return null;
    }

    const deals = await this.dealRepository.getDealsByCampaignId(campaignId);
    const chatCards = await Promise.all(
      deals.map((deal) => this.buildChatCard(deal)),
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

  private async buildChatCard(deal: Deal): Promise<CampaignWorkspaceChatCard> {
    const [channel, latestMessages, pendingApproval] = await Promise.all([
      this.channelRepository.getChannelById(deal.channelId),
      this.dealMessageRepository.listRecentByDealId(deal.id, 1),
      this.dealApprovalRequestRepository.getPendingByDealId(deal.id),
    ]);

    const latestMessage = latestMessages.at(-1) ?? null;

    return {
      id: deal.id,
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
      updatedAt: resolveUpdatedAt(
        deal,
        latestMessage?.createdAt ?? null,
        pendingApproval?.createdAt ?? null,
      ),
    };
  }
}
