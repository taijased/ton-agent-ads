import type { CreateCampaignInput } from "@repo/types";

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
