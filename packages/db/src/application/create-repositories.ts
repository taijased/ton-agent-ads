import { PrismaCampaignRepository } from "../infrastructure/prisma-campaign-repository.js";
import { PrismaChannelRepository } from "../infrastructure/prisma-channel-repository.js";
import { PrismaDealApprovalRequestRepository } from "../infrastructure/prisma-deal-approval-request-repository.js";
import { PrismaDealRepository } from "../infrastructure/prisma-deal-repository.js";
import { PrismaDealExternalThreadRepository } from "../infrastructure/prisma-deal-external-thread-repository.js";
import { PrismaDealMessageRepository } from "../infrastructure/prisma-deal-message-repository.js";
import type { CampaignRepository } from "../domain/campaign-repository.js";
import type { ChannelRepository } from "../domain/channel-repository.js";
import type { DealApprovalRequestRepository } from "../domain/deal-approval-request-repository.js";
import type { DealRepository } from "../domain/deal-repository.js";
import type { DealExternalThreadRepository } from "../domain/deal-external-thread-repository.js";
import type { DealMessageRepository } from "../domain/deal-message-repository.js";

export interface RepositoryBundle {
  campaignRepository: CampaignRepository;
  channelRepository: ChannelRepository;
  dealRepository: DealRepository;
  dealMessageRepository: DealMessageRepository;
  dealApprovalRequestRepository: DealApprovalRequestRepository;
  dealExternalThreadRepository: DealExternalThreadRepository;
}

export const createPrismaRepositories = (): RepositoryBundle => ({
  campaignRepository: new PrismaCampaignRepository(),
  channelRepository: new PrismaChannelRepository(),
  dealRepository: new PrismaDealRepository(),
  dealMessageRepository: new PrismaDealMessageRepository(),
  dealApprovalRequestRepository: new PrismaDealApprovalRequestRepository(),
  dealExternalThreadRepository: new PrismaDealExternalThreadRepository()
});
