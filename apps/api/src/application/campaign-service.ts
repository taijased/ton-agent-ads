import type {
  Campaign,
  CampaignStatus,
  CreateCampaignInput,
  UpdateCampaignInput,
} from "@repo/types";
import { allowedCampaignTransitions } from "@repo/types";
import type { CampaignRepository } from "@repo/db";

export interface CampaignActionResult {
  success: boolean;
  campaign?: Campaign;
  message?: string;
  statusCode?: number;
}

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

  public async updateCampaign(
    id: string,
    input: UpdateCampaignInput,
  ): Promise<CampaignActionResult> {
    const campaign = await this.campaignRepository.findById(id);

    if (campaign === null) {
      return { success: false, message: "Campaign not found", statusCode: 404 };
    }

    const updated = await this.campaignRepository.update(id, input);

    return { success: true, campaign: updated ?? undefined };
  }

  public async updateStatus(
    id: string,
    newStatus: CampaignStatus,
  ): Promise<CampaignActionResult> {
    const campaign = await this.campaignRepository.findById(id);

    if (campaign === null) {
      return { success: false, message: "Campaign not found", statusCode: 404 };
    }

    const allowed = allowedCampaignTransitions[campaign.status];

    if (!allowed.includes(newStatus)) {
      return {
        success: false,
        message: `Cannot transition campaign from "${campaign.status}" to "${newStatus}"`,
        statusCode: 400,
      };
    }

    const updated = await this.campaignRepository.updateStatus(id, newStatus);

    return { success: true, campaign: updated ?? undefined };
  }
}
