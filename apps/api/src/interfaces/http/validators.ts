import {
  type CampaignWorkspaceBootstrapRequest,
  campaignGoals,
  campaignLanguages,
  dealWritableStatuses,
  campaignStatuses,
  type AgentRunInput,
  type CampaignStatus,
  type CreateCampaignInput,
  type CreateDealInput,
  type GeneratePostInput,
  type SubmitTargetChannelInput,
  type UpdateCampaignInput,
  type UpdateDealStatusInput,
} from "@repo/types";
import { normalizeChannelReference } from "../../application/channel-reference.js";

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface IncomingNegotiationMessageInput {
  platform: "telegram";
  chatId: string;
  externalMessageId?: string;
  text: string;
  contactValue?: string;
}

export interface ApprovalCounterInput {
  text: string;
}

const positiveDecimalPattern = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

const isOptionalString = (value: unknown): value is string | null | undefined =>
  value === undefined || value === null || typeof value === "string";

const looksLikeUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const validateCreateCampaignInput = (
  value: unknown,
): ValidationResult<CreateCampaignInput> => {
  if (typeof value !== "object" || value === null) {
    return { success: false, error: "Body must be an object" };
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.userId !== "string" ||
    candidate.userId.trim().length === 0
  ) {
    return { success: false, error: "userId must be a non-empty string" };
  }

  if (
    typeof candidate.text !== "string" ||
    candidate.text.trim().length === 0
  ) {
    return { success: false, error: "text must be a non-empty string" };
  }

  const budgetAmountValue =
    typeof candidate.budgetAmount === "string"
      ? candidate.budgetAmount.trim()
      : typeof candidate.budget === "number" &&
          Number.isFinite(candidate.budget)
        ? String(candidate.budget)
        : null;

  if (
    budgetAmountValue === null ||
    !positiveDecimalPattern.test(budgetAmountValue) ||
    Number(budgetAmountValue) <= 0
  ) {
    return {
      success: false,
      error: "budgetAmount must be a positive decimal-like string",
    };
  }

  if (
    candidate.budgetCurrency !== undefined &&
    candidate.budgetCurrency !== "TON"
  ) {
    return { success: false, error: "budgetCurrency must be TON" };
  }

  if (
    candidate.language !== undefined &&
    candidate.language !== null &&
    (typeof candidate.language !== "string" ||
      !campaignLanguages.includes(
        candidate.language as (typeof campaignLanguages)[number],
      ))
  ) {
    return { success: false, error: "language must be RU, EN, or OTHER" };
  }

  if (
    candidate.goal !== undefined &&
    candidate.goal !== null &&
    (typeof candidate.goal !== "string" ||
      !campaignGoals.includes(candidate.goal as (typeof campaignGoals)[number]))
  ) {
    return {
      success: false,
      error: "goal must be AWARENESS, TRAFFIC, SUBSCRIBERS, or SALES",
    };
  }

  if (!isOptionalString(candidate.theme)) {
    return { success: false, error: "theme must be a string" };
  }

  if (!isOptionalString(candidate.ctaUrl)) {
    return { success: false, error: "ctaUrl must be a string" };
  }

  if (!isOptionalString(candidate.buttonText)) {
    return { success: false, error: "buttonText must be a string" };
  }

  if (!isOptionalString(candidate.mediaUrl)) {
    return { success: false, error: "mediaUrl must be a string" };
  }

  if (!isOptionalString(candidate.targetAudience)) {
    return { success: false, error: "targetAudience must be a string" };
  }

  if (
    candidate.tags !== undefined &&
    (!Array.isArray(candidate.tags) ||
      !candidate.tags.every((tag) => typeof tag === "string"))
  ) {
    return { success: false, error: "tags must be an array of strings" };
  }

  return {
    success: true,
    data: {
      userId: candidate.userId.trim(),
      text: candidate.text.trim(),
      budgetAmount: budgetAmountValue,
      budgetCurrency: "TON",
      theme:
        typeof candidate.theme === "string"
          ? candidate.theme.trim() || null
          : null,
      tags: Array.isArray(candidate.tags)
        ? candidate.tags
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
        : undefined,
      language:
        typeof candidate.language === "string"
          ? (candidate.language as CreateCampaignInput["language"])
          : null,
      goal:
        typeof candidate.goal === "string"
          ? (candidate.goal as CreateCampaignInput["goal"])
          : null,
      ctaUrl:
        typeof candidate.ctaUrl === "string"
          ? candidate.ctaUrl.trim() || null
          : null,
      buttonText:
        typeof candidate.buttonText === "string"
          ? candidate.buttonText.trim() || null
          : null,
      mediaUrl:
        typeof candidate.mediaUrl === "string"
          ? candidate.mediaUrl.trim() || null
          : null,
      targetAudience:
        typeof candidate.targetAudience === "string"
          ? candidate.targetAudience.trim() || null
          : null,
    },
  };
};

export const validateUpdateCampaignInput = (
  value: unknown,
): ValidationResult<UpdateCampaignInput> => {
  if (typeof value !== "object" || value === null) {
    return { success: false, error: "Body must be an object" };
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.text !== "string" ||
    candidate.text.trim().length === 0
  ) {
    return { success: false, error: "text must be a non-empty string" };
  }

  const budgetAmountValue =
    typeof candidate.budgetAmount === "string"
      ? candidate.budgetAmount.trim()
      : typeof candidate.budget === "number" &&
          Number.isFinite(candidate.budget)
        ? String(candidate.budget)
        : null;

  if (
    budgetAmountValue === null ||
    !positiveDecimalPattern.test(budgetAmountValue) ||
    Number(budgetAmountValue) <= 0
  ) {
    return {
      success: false,
      error: "budgetAmount must be a positive decimal-like string",
    };
  }

  if (candidate.budgetCurrency !== "TON") {
    return { success: false, error: "budgetCurrency must be TON" };
  }

  if (
    candidate.language !== undefined &&
    candidate.language !== null &&
    (typeof candidate.language !== "string" ||
      !campaignLanguages.includes(
        candidate.language as (typeof campaignLanguages)[number],
      ))
  ) {
    return { success: false, error: "language must be RU, EN, or OTHER" };
  }

  if (
    candidate.goal !== undefined &&
    candidate.goal !== null &&
    (typeof candidate.goal !== "string" ||
      !campaignGoals.includes(candidate.goal as (typeof campaignGoals)[number]))
  ) {
    return {
      success: false,
      error: "goal must be AWARENESS, TRAFFIC, SUBSCRIBERS, or SALES",
    };
  }

  if (!isOptionalString(candidate.theme)) {
    return { success: false, error: "theme must be a string" };
  }

  if (!isOptionalString(candidate.ctaUrl)) {
    return { success: false, error: "ctaUrl must be a string" };
  }

  if (!isOptionalString(candidate.buttonText)) {
    return { success: false, error: "buttonText must be a string" };
  }

  if (!isOptionalString(candidate.mediaUrl)) {
    return { success: false, error: "mediaUrl must be a string" };
  }

  if (!isOptionalString(candidate.targetAudience)) {
    return { success: false, error: "targetAudience must be a string" };
  }

  if (
    candidate.tags !== undefined &&
    (!Array.isArray(candidate.tags) ||
      !candidate.tags.every((tag) => typeof tag === "string"))
  ) {
    return { success: false, error: "tags must be an array of strings" };
  }

  return {
    success: true,
    data: {
      text: candidate.text.trim(),
      budgetAmount: budgetAmountValue,
      budgetCurrency: "TON",
      theme:
        typeof candidate.theme === "string"
          ? candidate.theme.trim() || null
          : null,
      tags: Array.isArray(candidate.tags)
        ? candidate.tags
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
        : undefined,
      language:
        typeof candidate.language === "string"
          ? (candidate.language as UpdateCampaignInput["language"])
          : null,
      goal:
        typeof candidate.goal === "string"
          ? (candidate.goal as UpdateCampaignInput["goal"])
          : null,
      ctaUrl:
        typeof candidate.ctaUrl === "string"
          ? candidate.ctaUrl.trim() || null
          : null,
      buttonText:
        typeof candidate.buttonText === "string"
          ? candidate.buttonText.trim() || null
          : null,
      mediaUrl:
        typeof candidate.mediaUrl === "string"
          ? candidate.mediaUrl.trim() || null
          : null,
      targetAudience:
        typeof candidate.targetAudience === "string"
          ? candidate.targetAudience.trim() || null
          : null,
    },
  };
};

export const validateCreateDealInput = (
  value: unknown,
): ValidationResult<CreateDealInput> => {
  if (typeof value !== "object" || value === null) {
    return { success: false, error: "Body must be an object" };
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.campaignId !== "string" ||
    candidate.campaignId.trim().length === 0
  ) {
    return { success: false, error: "campaignId must be a non-empty string" };
  }

  if (
    typeof candidate.channelId !== "string" ||
    candidate.channelId.trim().length === 0
  ) {
    return { success: false, error: "channelId must be a non-empty string" };
  }

  if (
    typeof candidate.price !== "number" ||
    !Number.isFinite(candidate.price) ||
    candidate.price <= 0
  ) {
    return { success: false, error: "price must be a positive number" };
  }

  return {
    success: true,
    data: {
      campaignId: candidate.campaignId.trim(),
      channelId: candidate.channelId.trim(),
      price: candidate.price,
    },
  };
};

export const validateAgentRunInput = (
  value: unknown,
): ValidationResult<AgentRunInput> => {
  if (typeof value !== "object" || value === null) {
    return { success: false, error: "Body must be an object" };
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.campaignId !== "string" ||
    candidate.campaignId.trim().length === 0
  ) {
    return { success: false, error: "campaignId must be a non-empty string" };
  }

  return {
    success: true,
    data: {
      campaignId: candidate.campaignId.trim(),
    },
  };
};

export const validateSubmitTargetChannelInput = (
  value: unknown,
  campaignId: string,
): ValidationResult<SubmitTargetChannelInput> => {
  if (typeof value !== "object" || value === null) {
    return { success: false, error: "Body must be an object" };
  }

  if (campaignId.trim().length === 0) {
    return { success: false, error: "campaignId must be a non-empty string" };
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.reference !== "string") {
    return { success: false, error: "reference must be a string" };
  }

  const reference = normalizeChannelReference(candidate.reference);

  if (reference === null) {
    return {
      success: false,
      error: "reference must look like @example or https://t.me/example",
    };
  }

  return {
    success: true,
    data: {
      campaignId: campaignId.trim(),
      reference,
    },
  };
};

export const validateUpdateDealStatusInput = (
  value: unknown,
): ValidationResult<UpdateDealStatusInput> => {
  if (typeof value !== "object" || value === null) {
    return { success: false, error: "Body must be an object" };
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.status !== "string" ||
    !dealWritableStatuses.includes(
      candidate.status as (typeof dealWritableStatuses)[number],
    )
  ) {
    return { success: false, error: "status must be a valid deal status" };
  }

  if (!isOptionalString(candidate.proofText)) {
    return { success: false, error: "proofText must be a string" };
  }

  if (!isOptionalString(candidate.proofUrl)) {
    return { success: false, error: "proofUrl must be a string" };
  }

  if (
    typeof candidate.proofUrl === "string" &&
    candidate.proofUrl.trim().length > 0 &&
    !looksLikeUrl(candidate.proofUrl.trim())
  ) {
    return {
      success: false,
      error: "proofUrl must be a valid http or https URL",
    };
  }

  return {
    success: true,
    data: {
      status: candidate.status as UpdateDealStatusInput["status"],
      proofText:
        typeof candidate.proofText === "string"
          ? candidate.proofText.trim() || null
          : null,
      proofUrl:
        typeof candidate.proofUrl === "string"
          ? candidate.proofUrl.trim() || null
          : null,
    },
  };
};

export const validateIncomingNegotiationMessageInput = (
  value: unknown,
): ValidationResult<IncomingNegotiationMessageInput> => {
  if (typeof value !== "object" || value === null) {
    return { success: false, error: "Body must be an object" };
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.platform !== "telegram") {
    return { success: false, error: "platform must be telegram" };
  }

  if (
    typeof candidate.chatId !== "string" ||
    candidate.chatId.trim().length === 0
  ) {
    return { success: false, error: "chatId must be a non-empty string" };
  }

  if (
    typeof candidate.text !== "string" ||
    candidate.text.trim().length === 0
  ) {
    return { success: false, error: "text must be a non-empty string" };
  }

  if (!isOptionalString(candidate.externalMessageId)) {
    return { success: false, error: "externalMessageId must be a string" };
  }

  if (!isOptionalString(candidate.contactValue)) {
    return { success: false, error: "contactValue must be a string" };
  }

  return {
    success: true,
    data: {
      platform: "telegram",
      chatId: candidate.chatId.trim(),
      text: candidate.text.trim(),
      externalMessageId:
        typeof candidate.externalMessageId === "string"
          ? candidate.externalMessageId.trim() || undefined
          : undefined,
      contactValue:
        typeof candidate.contactValue === "string"
          ? candidate.contactValue.trim() || undefined
          : undefined,
    },
  };
};

export const validateUpdateCampaignStatusInput = (
  value: unknown,
): ValidationResult<{ status: CampaignStatus }> => {
  if (typeof value !== "object" || value === null) {
    return { success: false, error: "Body must be an object" };
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.status !== "string") {
    return { success: false, error: "status is required and must be a string" };
  }

  const status = candidate.status.trim();

  if (!campaignStatuses.includes(status as CampaignStatus)) {
    return {
      success: false,
      error: `status must be one of: ${campaignStatuses.join(", ")}`,
    };
  }

  return { success: true, data: { status: status as CampaignStatus } };
};

export const validateCampaignWorkspaceBootstrapInput = (
  value: unknown,
): ValidationResult<CampaignWorkspaceBootstrapRequest> => {
  if (typeof value !== "object" || value === null) {
    return { success: false, error: "Body must be an object" };
  }

  const candidate = value as Record<string, unknown>;

  if (!Array.isArray(candidate.channels)) {
    return { success: false, error: "channels must be an array" };
  }

  const channels: CampaignWorkspaceBootstrapRequest["channels"] = [];

  for (const entry of candidate.channels) {
    if (typeof entry !== "object" || entry === null) {
      return {
        success: false,
        error: "each channel must be an object",
      };
    }

    const channel = entry as Record<string, unknown>;

    if (channel.source !== undefined && channel.source !== "wizard_shortlist") {
      return {
        success: false,
        error: 'channel source must be "wizard_shortlist"',
      };
    }

    if (typeof channel.username !== "string") {
      return {
        success: false,
        error: "channel username must be a string",
      };
    }

    const username = normalizeChannelReference(channel.username);

    if (username === null) {
      return {
        success: false,
        error:
          "channel username must look like @example or https://t.me/example",
      };
    }

    if (!isOptionalString(channel.title)) {
      return {
        success: false,
        error: "channel title must be a string",
      };
    }

    channels.push({
      username,
      title:
        typeof channel.title === "string" ? channel.title.trim() || null : null,
      source: "wizard_shortlist",
    });
  }

  return {
    success: true,
    data: {
      channels,
    },
  };
};

export const validateApprovalCounterInput = (
  value: unknown,
): ValidationResult<ApprovalCounterInput> => {
  if (typeof value !== "object" || value === null) {
    return { success: false, error: "Body must be an object" };
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.text !== "string" ||
    candidate.text.trim().length === 0
  ) {
    return { success: false, error: "text must be a non-empty string" };
  }

  return {
    success: true,
    data: {
      text: candidate.text.trim(),
    },
  };
};

export const validateGeneratePostInput = (
  value: unknown,
): ValidationResult<GeneratePostInput> => {
  if (typeof value !== "object" || value === null) {
    return { success: false, error: "Body must be an object" };
  }
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.description !== "string" ||
    candidate.description.trim().length === 0
  ) {
    return { success: false, error: "description must be a non-empty string" };
  }
  if (
    typeof candidate.language !== "string" ||
    !campaignLanguages.includes(
      candidate.language as (typeof campaignLanguages)[number],
    )
  ) {
    return { success: false, error: "language must be RU, EN, or OTHER" };
  }
  if (
    typeof candidate.goal !== "string" ||
    !campaignGoals.includes(candidate.goal as (typeof campaignGoals)[number])
  ) {
    return {
      success: false,
      error: "goal must be AWARENESS, TRAFFIC, SUBSCRIBERS, or SALES",
    };
  }
  if (
    candidate.channelDescription !== undefined &&
    typeof candidate.channelDescription !== "string"
  ) {
    return { success: false, error: "channelDescription must be a string" };
  }
  if (
    candidate.targetAudience !== undefined &&
    typeof candidate.targetAudience !== "string"
  ) {
    return { success: false, error: "targetAudience must be a string" };
  }
  return {
    success: true,
    data: {
      description: candidate.description.trim(),
      language: candidate.language as GeneratePostInput["language"],
      goal: candidate.goal as GeneratePostInput["goal"],
      channelDescription:
        typeof candidate.channelDescription === "string"
          ? candidate.channelDescription.trim() || undefined
          : undefined,
      targetAudience:
        typeof candidate.targetAudience === "string"
          ? candidate.targetAudience.trim() || undefined
          : undefined,
    },
  };
};
