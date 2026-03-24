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

  public listCampaigns(userId?: string): Promise<Campaign[]> {
    return userId === undefined
      ? this.campaignRepository.list()
      : this.campaignRepository.listByUserId(userId);
  }

  public getCampaignById(
    id: string,
    userId?: string,
  ): Promise<Campaign | null> {
    return userId === undefined
      ? this.campaignRepository.findById(id)
      : this.campaignRepository.findByIdForUser(id, userId);
  }

  public createCampaign(input: CreateCampaignInput): Promise<Campaign> {
    return this.campaignRepository.create(input);
  }

  public async updateCampaign(
    id: string,
    userIdOrInput: string | UpdateCampaignInput,
    maybeInput?: UpdateCampaignInput,
  ): Promise<CampaignActionResult> {
    const resolvedUserId =
      typeof userIdOrInput === "string" ? userIdOrInput : undefined;
    const resolvedInput =
      typeof userIdOrInput === "string"
        ? (maybeInput as UpdateCampaignInput)
        : userIdOrInput;
    const campaign =
      resolvedUserId === undefined
        ? await this.campaignRepository.findById(id)
        : await this.campaignRepository.findByIdForUser(id, resolvedUserId);

    if (campaign === null) {
      return { success: false, message: "Campaign not found", statusCode: 404 };
    }

    const updated = await this.campaignRepository.update(id, resolvedInput);

    return { success: true, campaign: updated ?? undefined };
  }

  public async updateStatus(
    id: string,
    userIdOrStatus: string,
    maybeStatus?: CampaignStatus,
  ): Promise<CampaignActionResult> {
    const resolvedUserId =
      maybeStatus === undefined ? undefined : userIdOrStatus;
    const resolvedStatus =
      maybeStatus === undefined
        ? (userIdOrStatus as CampaignStatus)
        : maybeStatus;
    const campaign =
      resolvedUserId === undefined
        ? await this.campaignRepository.findById(id)
        : await this.campaignRepository.findByIdForUser(id, resolvedUserId);

    if (campaign === null) {
      return { success: false, message: "Campaign not found", statusCode: 404 };
    }

    const allowed = allowedCampaignTransitions[campaign.status];

    if (!allowed.includes(resolvedStatus)) {
      return {
        success: false,
        message: `Cannot transition campaign from "${campaign.status}" to "${resolvedStatus}"`,
        statusCode: 400,
      };
    }

    const updated = await this.campaignRepository.updateStatus(
      id,
      resolvedStatus,
    );

    return { success: true, campaign: updated ?? undefined };
  }
}
