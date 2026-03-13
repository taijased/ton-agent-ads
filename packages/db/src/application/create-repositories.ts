import { PrismaCampaignRepository } from "../infrastructure/prisma-campaign-repository.js";
import { PrismaChannelRepository } from "../infrastructure/prisma-channel-repository.js";
import { PrismaDealRepository } from "../infrastructure/prisma-deal-repository.js";
import type { CampaignRepository } from "../domain/campaign-repository.js";
import type { ChannelRepository } from "../domain/channel-repository.js";
import type { DealRepository } from "../domain/deal-repository.js";

export interface RepositoryBundle {
  campaignRepository: CampaignRepository;
  channelRepository: ChannelRepository;
  dealRepository: DealRepository;
}

export const createPrismaRepositories = (): RepositoryBundle => ({
  campaignRepository: new PrismaCampaignRepository(),
  channelRepository: new PrismaChannelRepository(),
  dealRepository: new PrismaDealRepository()
});
