import type { Campaign, CreateCampaignInput } from "@repo/types";
import type { CampaignRepository } from "@repo/db";

export class CampaignService {
  public constructor(private readonly campaignRepository: CampaignRepository) {}

  public listCampaigns(): Promise<Campaign[]> {
    return this.campaignRepository.list();
  }

  public getCampaignById(id: string): Promise<Campaign | null> {
    return this.campaignRepository.findById(id);
  }

  public createCampaign(input: CreateCampaignInput): Promise<Campaign> {
    return this.campaignRepository.create(input);
  }
}
