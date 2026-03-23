import type { CampaignDraft, CampaignDraftErrors, WizardStepId } from "./types";

const positiveDecimalPattern = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

const looksLikeUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const dedupeStrings = (values: string[]): string[] => {
  const seen = new Set<string>();
  const normalizedValues: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalizedValues.push(trimmed);
  }

  return normalizedValues;
};

export const normalizeCampaignDraft = (
  draft: CampaignDraft,
): CampaignDraft => ({
  title: draft.title.trim(),
  text: draft.text.trim(),
  theme: draft.theme.trim(),
  tags: dedupeStrings(draft.tags),
  language: draft.language,
  goal: draft.goal,
  targetAudience: draft.targetAudience.trim(),
  media: draft.media.map((value) => value.trim()).filter((value) => value),
  budget: draft.budget.trim(),
  ctaUrl: draft.ctaUrl.trim(),
  buttonText: draft.buttonText.trim(),
  shortlistedChannelIds: dedupeStrings(draft.shortlistedChannelIds),
});

export const hasCampaignDraftErrors = (errors: CampaignDraftErrors): boolean =>
  Object.values(errors).some((value) => typeof value === "string");

export const validateBasicStep = (
  draft: CampaignDraft,
): CampaignDraftErrors => {
  const errors: CampaignDraftErrors = {};

  if (draft.title.trim().length === 0) {
    errors.title = "Campaign title is required.";
  }

  if (draft.text.trim().length === 0) {
    errors.text = "Campaign text is required.";
  }

  return errors;
};

export const validateTargetingStep = (
  draft: CampaignDraft,
): CampaignDraftErrors => {
  const errors: CampaignDraftErrors = {};

  if (draft.theme.trim().length === 0) {
    errors.theme = "Choose or enter a campaign theme.";
  }

  if (draft.goal === null) {
    errors.goal = "Choose a campaign goal.";
  }

  return errors;
};

export const validateCreativeStep = (
  draft: CampaignDraft,
): CampaignDraftErrors => {
  const errors: CampaignDraftErrors = {};

  if (
    draft.media.some((value) => value.trim().length > 0 && !looksLikeUrl(value))
  ) {
    errors.media = "Each media item must start with http:// or https://.";
  }

  if (draft.ctaUrl.trim().length > 0 && !looksLikeUrl(draft.ctaUrl.trim())) {
    errors.ctaUrl = "CTA URL must start with http:// or https://.";
  }

  if (draft.buttonText.trim().length > 0 && draft.ctaUrl.trim().length === 0) {
    errors.buttonText = "Add a CTA URL before setting button text.";
  }

  return errors;
};

export const validateBudgetStep = (
  draft: CampaignDraft,
): CampaignDraftErrors => {
  const errors: CampaignDraftErrors = {};

  if (
    draft.budget.trim().length === 0 ||
    !positiveDecimalPattern.test(draft.budget.trim()) ||
    Number(draft.budget) <= 0
  ) {
    errors.budget = "Budget must be a positive number.";
  }

  return errors;
};

export const validateCampaignDraftStep = (
  step: WizardStepId,
  draft: CampaignDraft,
): CampaignDraftErrors => {
  switch (step) {
    case "basic":
      return validateBasicStep(draft);
    case "targeting":
      return validateTargetingStep(draft);
    case "creative":
      return validateCreativeStep(draft);
    case "budget":
      return validateBudgetStep(draft);
    case "channels":
    case "finish":
      return {};
  }
};

export const validateCampaignDraft = (
  draft: CampaignDraft,
): CampaignDraftErrors => ({
  ...validateBasicStep(draft),
  ...validateTargetingStep(draft),
  ...validateCreativeStep(draft),
  ...validateBudgetStep(draft),
});

export const getFirstInvalidWizardStep = (
  draft: CampaignDraft,
): WizardStepId | null => {
  const steps: WizardStepId[] = ["basic", "targeting", "creative", "budget"];

  for (const step of steps) {
    if (hasCampaignDraftErrors(validateCampaignDraftStep(step, draft))) {
      return step;
    }
  }

  return null;
};
