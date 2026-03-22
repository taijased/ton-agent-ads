import type { CampaignFormDraft, CampaignFormErrors } from "./types";

const positiveDecimalPattern = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

const looksLikeUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const validateCampaignForm = (
  draft: CampaignFormDraft,
): CampaignFormErrors => {
  const errors: CampaignFormErrors = {};

  if (draft.title.trim().length === 0) {
    errors.title = "Campaign title is required.";
  }

  if (draft.description.trim().length === 0) {
    errors.description = "Description is required.";
  }

  if (draft.goal.length === 0) {
    errors.goal = "Choose a campaign goal.";
  }

  if (
    draft.budget.trim().length === 0 ||
    !positiveDecimalPattern.test(draft.budget.trim()) ||
    Number(draft.budget) <= 0
  ) {
    errors.budget = "Budget must be a positive number.";
  }

  if (draft.ctaUrl.trim().length > 0 && !looksLikeUrl(draft.ctaUrl.trim())) {
    errors.ctaUrl = "CTA URL must start with http:// or https://.";
  }

  return errors;
};

export const hasCampaignFormErrors = (errors: CampaignFormErrors): boolean =>
  Object.values(errors).some((value) => typeof value === "string");

export const normalizeCampaignFormDraft = (
  draft: CampaignFormDraft,
): CampaignFormDraft => ({
  title: draft.title.trim(),
  description: draft.description.trim(),
  goal: draft.goal,
  budget: draft.budget.trim(),
  ctaUrl: draft.ctaUrl.trim(),
  buttonText: draft.buttonText.trim(),
  mediaUrl: draft.mediaUrl.trim(),
});
