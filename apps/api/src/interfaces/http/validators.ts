import type { AgentRunInput, CreateCampaignInput, CreateDealInput } from "@repo/types";

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export const validateCreateCampaignInput = (
  value: unknown
): ValidationResult<CreateCampaignInput> => {
  if (typeof value !== "object" || value === null) {
    return { success: false, error: "Body must be an object" };
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.userId !== "string" || candidate.userId.trim().length === 0) {
    return { success: false, error: "userId must be a non-empty string" };
  }

  if (typeof candidate.text !== "string" || candidate.text.trim().length === 0) {
    return { success: false, error: "text must be a non-empty string" };
  }

  if (typeof candidate.budget !== "number" || !Number.isFinite(candidate.budget) || candidate.budget <= 0) {
    return { success: false, error: "budget must be a positive number" };
  }

  return {
    success: true,
    data: {
      userId: candidate.userId.trim(),
      text: candidate.text.trim(),
      budget: candidate.budget
    }
  };
};

export const validateCreateDealInput = (
  value: unknown
): ValidationResult<CreateDealInput> => {
  if (typeof value !== "object" || value === null) {
    return { success: false, error: "Body must be an object" };
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.campaignId !== "string" || candidate.campaignId.trim().length === 0) {
    return { success: false, error: "campaignId must be a non-empty string" };
  }

  if (typeof candidate.channelId !== "string" || candidate.channelId.trim().length === 0) {
    return { success: false, error: "channelId must be a non-empty string" };
  }

  if (typeof candidate.price !== "number" || !Number.isFinite(candidate.price) || candidate.price <= 0) {
    return { success: false, error: "price must be a positive number" };
  }

  return {
    success: true,
    data: {
      campaignId: candidate.campaignId.trim(),
      channelId: candidate.channelId.trim(),
      price: candidate.price
    }
  };
};

export const validateAgentRunInput = (
  value: unknown
): ValidationResult<AgentRunInput> => {
  if (typeof value !== "object" || value === null) {
    return { success: false, error: "Body must be an object" };
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.campaignId !== "string" || candidate.campaignId.trim().length === 0) {
    return { success: false, error: "campaignId must be a non-empty string" };
  }

  return {
    success: true,
    data: {
      campaignId: candidate.campaignId.trim()
    }
  };
};
