import { useState } from "react";
import { ChevronDownIcon, SearchIcon } from "../../../components/ui/AppIcons";
import { Button } from "../../../components/ui/Button";
import { TextAreaField } from "../../../components/ui/TextAreaField";
import { TextField } from "../../../components/ui/TextField";
import {
  formatExpectedPriceLabel,
  formatGoalLabel,
  formatLanguageLabel,
  formatTonAmount,
  formatViewsLabel,
  getInitials,
} from "../../../lib/format";
import { cn } from "../../../lib/cn";
import { GoalSelector } from "./GoalSelector";
import { MediaListField } from "./MediaListField";
import { TagsField } from "./TagsField";
import { ThemeSelector } from "./ThemeSelector";
import {
  lookupChannelByUsername,
  normalizeTelegramUsername,
  validateTelegramUsername,
} from "../services/channel-lookup-service";
import {
  getFirstInvalidWizardStep,
  hasCampaignDraftErrors,
  validateCampaignDraft,
  validateCampaignDraftStep,
} from "../validators";
import {
  type CampaignEditorMode,
  campaignLanguageOptions,
  campaignTagSuggestions,
  campaignWizardSteps,
  type CampaignDraft,
  type CampaignDraftErrors,
  type CampaignDraftState,
  type RecommendedChannel,
  type WizardStepId,
} from "../types";

interface CampaignWizardProps {
  draftState: CampaignDraftState;
  focusedStep?: WizardStepId | null;
  mode: CampaignEditorMode;
  onAppendChannel: (channel: RecommendedChannel) => void;
  onDraftPatch: (patch: Partial<CampaignDraft>) => void;
  onStepChange: (step: WizardStepId) => void;
  onSubmit: () => Promise<void>;
  recommendedChannels: RecommendedChannel[];
}

interface StepProps {
  draft: CampaignDraft;
  errors: CampaignDraftErrors;
  onChange: <K extends keyof CampaignDraft>(
    field: K,
    value: CampaignDraft[K],
  ) => void;
}

interface ChannelsStepProps {
  channels: RecommendedChannel[];
  draft: CampaignDraft;
  onAppendChannel: (channel: RecommendedChannel) => void;
  onChange: <K extends keyof CampaignDraft>(
    field: K,
    value: CampaignDraft[K],
  ) => void;
}

interface FinishStepProps {
  channels: RecommendedChannel[];
  draft: CampaignDraft;
  mode: CampaignEditorMode;
}

const fieldIds: Partial<Record<keyof CampaignDraftErrors, string>> = {
  title: "campaign-draft-title",
  text: "campaign-draft-text",
  theme: "campaign-draft-theme-input",
  tags: "campaign-draft-tags-input",
  language: "campaign-draft-language",
  goal: "campaign-draft-goal",
  targetAudience: "campaign-draft-targetAudience",
  media: "campaign-draft-media-add",
  budget: "campaign-draft-budget",
  ctaUrl: "campaign-draft-ctaUrl",
  buttonText: "campaign-draft-buttonText",
  shortlistedChannelIds: "campaign-draft-shortlistedChannels",
};

const fieldOrderByStep: Record<
  WizardStepId,
  Array<keyof CampaignDraftErrors>
> = {
  basic: ["title", "text"],
  targeting: ["theme", "tags", "language", "goal", "targetAudience"],
  creative: ["media", "ctaUrl", "buttonText"],
  budget: ["budget"],
  channels: ["shortlistedChannelIds"],
  finish: [
    "title",
    "text",
    "theme",
    "tags",
    "language",
    "goal",
    "targetAudience",
    "media",
    "budget",
    "ctaUrl",
    "buttonText",
    "shortlistedChannelIds",
  ],
};

const getFirstInvalidField = (
  errors: CampaignDraftErrors,
  step: WizardStepId,
): keyof CampaignDraftErrors | null =>
  fieldOrderByStep[step].find((fieldName) => Boolean(errors[fieldName])) ??
  null;

const focusField = (fieldName: keyof CampaignDraftErrors) => {
  const fieldId = fieldIds[fieldName];

  if (!fieldId) {
    return;
  }

  const element = document.getElementById(fieldId);

  if (element instanceof HTMLElement) {
    element.focus();
  }
};

const buildChannelLookup = (
  channels: RecommendedChannel[],
): Map<string, RecommendedChannel> =>
  new Map(channels.map((channel) => [channel.id, channel]));

export const CampaignWizard = ({
  draftState,
  focusedStep = null,
  mode,
  onAppendChannel,
  onDraftPatch,
  onStepChange,
  onSubmit,
  recommendedChannels,
}: CampaignWizardProps) => {
  const [errors, setErrors] = useState<CampaignDraftErrors>({});
  const currentStepIndex = campaignWizardSteps.findIndex(
    (step) => step.id === draftState.step,
  );
  const currentStep = campaignWizardSteps[currentStepIndex];
  const isFocusedEdit = mode === "edit" && focusedStep !== null;
  const visibleSteps = isFocusedEdit
    ? campaignWizardSteps.filter((step) => step.id === focusedStep)
    : campaignWizardSteps;
  const channelLookup = buildChannelLookup(recommendedChannels);
  const shortlistedChannels = draftState.draft.shortlistedChannelIds
    .map((channelId) => channelLookup.get(channelId) ?? null)
    .filter((channel): channel is RecommendedChannel => channel !== null);

  const updateField = <K extends keyof CampaignDraft>(
    field: K,
    value: CampaignDraft[K],
  ) => {
    onDraftPatch({ [field]: value } as Pick<CampaignDraft, K>);
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));
  };

  const handleNext = () => {
    if (!currentStep || currentStep.id === "finish") {
      return;
    }

    const nextErrors = validateCampaignDraftStep(
      currentStep.id,
      draftState.draft,
    );

    if (hasCampaignDraftErrors(nextErrors)) {
      setErrors((currentErrors) => ({ ...currentErrors, ...nextErrors }));

      const firstInvalidField = getFirstInvalidField(
        nextErrors,
        currentStep.id,
      );
      if (firstInvalidField) {
        window.requestAnimationFrame(() => {
          focusField(firstInvalidField);
        });
      }

      return;
    }

    const nextStep = campaignWizardSteps[currentStepIndex + 1];

    if (nextStep) {
      onStepChange(nextStep.id);
    }
  };

  const handleBack = () => {
    const previousStep = campaignWizardSteps[currentStepIndex - 1];

    if (previousStep) {
      onStepChange(previousStep.id);
    }
  };

  const handleSubmit = async () => {
    if (isFocusedEdit && currentStep) {
      const nextErrors = validateCampaignDraftStep(
        currentStep.id,
        draftState.draft,
      );

      if (hasCampaignDraftErrors(nextErrors)) {
        setErrors((currentErrors) => ({ ...currentErrors, ...nextErrors }));

        const firstInvalidField = getFirstInvalidField(
          nextErrors,
          currentStep.id,
        );
        if (firstInvalidField) {
          window.requestAnimationFrame(() => {
            focusField(firstInvalidField);
          });
        }
        return;
      }

      await onSubmit();
      return;
    }

    const nextErrors = validateCampaignDraft(draftState.draft);

    if (hasCampaignDraftErrors(nextErrors)) {
      setErrors(nextErrors);

      const firstInvalidStep = getFirstInvalidWizardStep(draftState.draft);
      if (firstInvalidStep) {
        onStepChange(firstInvalidStep);

        const firstInvalidField = getFirstInvalidField(
          nextErrors,
          firstInvalidStep,
        );
        if (firstInvalidField) {
          window.requestAnimationFrame(() => {
            focusField(firstInvalidField);
          });
        }
      }

      return;
    }

    await onSubmit();
  };

  const wizardCardBody = (
    <>
      {!isFocusedEdit ? (
        <div className="wizard-card__header">
          <div>
            <div className="campaign-card__eyebrow">
              Step {currentStepIndex + 1} of {campaignWizardSteps.length}
            </div>
            <h2 className="form-section__title">{currentStep?.label}</h2>
          </div>
        </div>
      ) : null}

      {draftState.submitError ? (
        <div className="form-banner">{draftState.submitError}</div>
      ) : null}

      {draftState.step === "basic" ? (
        <BasicStep
          draft={draftState.draft}
          errors={errors}
          onChange={updateField}
        />
      ) : null}

      {draftState.step === "targeting" ? (
        <TargetingStep
          draft={draftState.draft}
          errors={errors}
          onChange={updateField}
        />
      ) : null}

      {draftState.step === "creative" ? (
        <CreativeStep
          draft={draftState.draft}
          errors={errors}
          onChange={updateField}
        />
      ) : null}

      {draftState.step === "budget" ? (
        <BudgetStep
          draft={draftState.draft}
          errors={errors}
          onChange={updateField}
        />
      ) : null}

      {draftState.step === "channels" ? (
        <ChannelsStep
          channels={recommendedChannels}
          draft={draftState.draft}
          onAppendChannel={onAppendChannel}
          onChange={updateField}
        />
      ) : null}

      {draftState.step === "finish" ? (
        <FinishStep
          channels={shortlistedChannels}
          draft={draftState.draft}
          mode={mode}
        />
      ) : null}
    </>
  );

  return (
    <div className="wizard-shell">
      {!isFocusedEdit ? (
        <div
          className="wizard-steps"
          aria-label={
            mode === "edit"
              ? "Campaign editing steps"
              : "Campaign creation steps"
          }
        >
          {visibleSteps.map((step) => {
            const isActive = step.id === draftState.step;
            const stepIndex = campaignWizardSteps.findIndex(
              (candidate) => candidate.id === step.id,
            );
            const isCompleted = stepIndex < currentStepIndex;

            return (
              <button
                className={cn(
                  "wizard-step",
                  isActive ? "wizard-step--active" : undefined,
                  isCompleted ? "wizard-step--completed" : undefined,
                )}
                disabled={stepIndex > currentStepIndex}
                key={step.id}
                onClick={() => {
                  if (stepIndex <= currentStepIndex) {
                    onStepChange(step.id);
                  }
                }}
                type="button"
              >
                <span className="wizard-step__index">{stepIndex + 1}</span>
                <span className="wizard-step__label">{step.shortLabel}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="wizard-card wizard-card--plain">{wizardCardBody}</div>

      <div
        className={cn(
          "wizard-navigation",
          isFocusedEdit ? "wizard-navigation--single" : undefined,
        )}
      >
        {isFocusedEdit ? (
          <Button
            disabled={draftState.submitStatus === "submitting"}
            fullWidth
            onClick={() => {
              void handleSubmit();
            }}
          >
            {draftState.submitStatus === "submitting"
              ? "Saving changes..."
              : "Save changes"}
          </Button>
        ) : (
          <>
            {currentStepIndex > 0 ? (
              <Button fullWidth onClick={handleBack} variant="ghost">
                Back
              </Button>
            ) : (
              <div className="wizard-navigation__spacer" />
            )}

            {draftState.step === "finish" ? (
              <Button
                disabled={draftState.submitStatus === "submitting"}
                fullWidth
                onClick={() => {
                  void handleSubmit();
                }}
              >
                {draftState.submitStatus === "submitting"
                  ? mode === "edit"
                    ? "Saving changes..."
                    : "Creating campaign..."
                  : mode === "edit"
                    ? "Save changes"
                    : "Create campaign"}
              </Button>
            ) : (
              <Button fullWidth onClick={handleNext}>
                {draftState.step === "channels" ? "Review draft" : "Next"}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const BasicStep = ({ draft, errors, onChange }: StepProps) => (
  <div className="form-section">
    <p className="wizard-step-copy">
      Start with the core brief. This gives the agent the offer, framing, and
      intent before we enrich targeting.
    </p>

    <TextField
      autoComplete="off"
      error={errors.title}
      id="campaign-draft-title"
      label="Title"
      onChange={(value) => {
        onChange("title", value);
      }}
      placeholder="Launch week awareness push"
      requiredIndicator
      value={draft.title}
    />

    <TextAreaField
      description="Use the actual ad copy or a compact internal brief. This becomes the main source text for later steps."
      error={errors.text}
      id="campaign-draft-text"
      label="Campaign text"
      onChange={(value) => {
        onChange("text", value);
      }}
      placeholder="Explain the offer, audience, and why readers should care right now."
      requiredIndicator
      rows={6}
      value={draft.text}
    />
  </div>
);

const TargetingStep = ({ draft, errors, onChange }: StepProps) => (
  <div className="form-section">
    <p className="wizard-step-copy">
      Add enrichment fields so the shortlist can feel intentional instead of
      generic.
    </p>

    <ThemeSelector
      error={errors.theme}
      onChange={(value) => {
        onChange("theme", value);
      }}
      value={draft.theme}
    />

    <TagsField
      error={errors.tags}
      onChange={(value) => {
        onChange("tags", value);
      }}
      suggestions={campaignTagSuggestions}
      value={draft.tags}
    />

    <div className="field">
      <div className="field__label" id="campaign-draft-language">
        Language
      </div>
      <div className="language-selector">
        {campaignLanguageOptions.map((option) => (
          <button
            className={cn(
              "language-selector__button",
              draft.language === option.value
                ? "language-selector__button--active"
                : undefined,
            )}
            key={option.label}
            onClick={() => {
              onChange("language", option.value);
            }}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      {errors.language ? (
        <p className="field__error">{errors.language}</p>
      ) : (
        <p className="field__description">
          English stays preselected, but you can keep it open if the channel mix
          should decide.
        </p>
      )}
    </div>

    <GoalSelector
      error={errors.goal}
      id="campaign-draft-goal"
      onChange={(goal) => {
        onChange("goal", goal);
      }}
      value={draft.goal}
    />

    <TextAreaField
      description="Optional note about who should resonate with the message."
      error={errors.targetAudience}
      id="campaign-draft-targetAudience"
      label="Target audience"
      onChange={(value) => {
        onChange("targetAudience", value);
      }}
      placeholder="Founders shipping Telegram mini apps, crypto marketers, growth operators."
      rows={4}
      value={draft.targetAudience}
    />
  </div>
);

const CreativeStep = ({ draft, errors, onChange }: StepProps) => (
  <div className="form-section">
    <p className="wizard-step-copy">
      Add creative URLs and the call-to-action that should travel with the ad
      placement.
    </p>

    <MediaListField
      error={errors.media}
      onChange={(value) => {
        onChange("media", value);
      }}
      value={draft.media}
    />

    <TextField
      description="Optional. If you add it, the URL must be a valid http or https link."
      error={errors.ctaUrl}
      id="campaign-draft-ctaUrl"
      inputMode="url"
      label="CTA URL"
      onChange={(value) => {
        onChange("ctaUrl", value);
      }}
      placeholder="https://adagent.app/demo"
      value={draft.ctaUrl}
    />

    <TextField
      description="Optional. Pair this with a CTA URL for a button-ready placement."
      error={errors.buttonText}
      id="campaign-draft-buttonText"
      label="Button text"
      onChange={(value) => {
        onChange("buttonText", value);
      }}
      placeholder="Watch demo"
      value={draft.buttonText}
    />
  </div>
);

const BudgetStep = ({ draft, errors, onChange }: StepProps) => (
  <div className="form-section">
    <div className="budget-highlight">
      <div className="campaign-card__eyebrow">Budget setup</div>
      <div className="budget-highlight__value">
        {draft.budget.trim().length > 0
          ? formatTonAmount(Number(draft.budget) || 0)
          : "Set your TON budget"}
      </div>
      <p className="budget-highlight__copy">
        Use the total campaign budget. Negotiation and payments stay out of
        scope for this phase.
      </p>
    </div>

    <TextField
      error={errors.budget}
      id="campaign-draft-budget"
      inputMode="decimal"
      label="Budget"
      onChange={(value) => {
        onChange("budget", value);
      }}
      placeholder="25"
      requiredIndicator
      suffix="TON"
      value={draft.budget}
    />
  </div>
);

interface ChannelOptionCardProps {
  channel: RecommendedChannel;
  isSelected: boolean;
  onToggle: () => void;
}

const ChannelOptionCard = ({
  channel,
  isSelected,
  onToggle,
}: ChannelOptionCardProps) => (
  <div
    className={cn(
      "channel-card",
      isSelected ? "channel-card--active" : undefined,
    )}
  >
    <div className="channel-card__header">
      <div className="channel-card__identity">
        <div className="shortlist-avatar">
          {channel.avatar ? (
            <img alt={channel.name} src={channel.avatar} />
          ) : (
            getInitials(channel.name)
          )}
        </div>
        <div>
          <div className="channel-card__title">{channel.name}</div>
          <div className="channel-card__handle">
            @{channel.username.replace(/^@/, "")}
          </div>
        </div>
      </div>
      <Button
        onClick={onToggle}
        size="small"
        type="button"
        variant={isSelected ? "primary" : "secondary"}
      >
        {isSelected ? "Shortlisted" : "Shortlist"}
      </Button>
    </div>

    <p className="channel-card__description">{channel.description}</p>

    <div className="channel-card__stats">
      <div className="channel-card__stat">
        <span className="channel-card__stat-label">Reach</span>
        <span className="channel-card__stat-value">
          {formatViewsLabel(channel.avgViews)}
        </span>
      </div>
      <div className="channel-card__stat">
        <span className="channel-card__stat-label">Price</span>
        <span className="channel-card__stat-value">
          {formatExpectedPriceLabel(channel.expectedPrice)}
        </span>
      </div>
    </div>

    <div className="chip-list">
      {channel.tags.map((tag) => (
        <span className="tag-chip" key={`${channel.id}-${tag}`}>
          {tag}
        </span>
      ))}
    </div>
  </div>
);

const ChannelsStep = ({
  channels,
  draft,
  onAppendChannel,
  onChange,
}: ChannelsStepProps) => {
  const shortlistedIds = draft.shortlistedChannelIds;
  const [query, setQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<RecommendedChannel | null>(
    null,
  );
  const [searchStatus, setSearchStatus] = useState<"idle" | "searching">(
    "idle",
  );
  const [isRecommendationsOpen, setIsRecommendationsOpen] = useState(false);

  const toggleShortlist = (channelId: string) => {
    if (shortlistedIds.includes(channelId)) {
      onChange(
        "shortlistedChannelIds",
        shortlistedIds.filter((value) => value !== channelId),
      );
      return;
    }

    onChange("shortlistedChannelIds", [...shortlistedIds, channelId]);
  };

  const resolvedSearchResult =
    searchResult === null
      ? null
      : (channels.find(
          (channel) =>
            channel.id === searchResult.id ||
            channel.username.toLowerCase() ===
              searchResult.username.toLowerCase(),
        ) ?? searchResult);

  const handleSearch = async () => {
    const validationError = validateTelegramUsername(query);

    if (validationError) {
      setSearchError(validationError);
      setSearchResult(null);
      return;
    }

    setSearchStatus("searching");
    setSearchError(null);

    try {
      const channel = await lookupChannelByUsername(query);

      setSearchResult(channel);
    } catch (error: unknown) {
      setSearchResult(null);
      setSearchError(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Channel lookup failed. Please try again.",
      );
    } finally {
      setSearchStatus("idle");
    }
  };

  const handleToggleResolvedResult = () => {
    if (resolvedSearchResult === null) {
      return;
    }

    const existingChannel = channels.find(
      (channel) =>
        channel.id === resolvedSearchResult.id ||
        channel.username.toLowerCase() ===
          resolvedSearchResult.username.toLowerCase(),
    );

    if (!existingChannel) {
      onAppendChannel(resolvedSearchResult);
    }

    toggleShortlist(existingChannel?.id ?? resolvedSearchResult.id);
  };

  return (
    <div className="form-section">
      <div className="channel-search">
        <div className="channel-search__header">
          <div>
            <div className="campaign-card__eyebrow">Manual add</div>
            <h3 className="form-section__title">Search by @username</h3>
          </div>
        </div>

        <div className="channel-search__row">
          <TextField
            autoComplete="off"
            id="campaign-draft-channel-search"
            label="Channel username"
            onChange={(value) => {
              setQuery(value);
              setSearchError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleSearch();
              }
            }}
            placeholder="@durov"
            value={query}
          />
          <Button
            aria-label={searchStatus === "searching" ? "Searching" : "Search"}
            className="icon-button"
            disabled={
              searchStatus === "searching" ||
              normalizeTelegramUsername(query).length === 0
            }
            onClick={() => {
              void handleSearch();
            }}
            title={searchStatus === "searching" ? "Searching..." : "Search"}
            type="button"
          >
            <SearchIcon className="button__icon" />
          </Button>
        </div>

        {searchError ? <p className="field__error">{searchError}</p> : null}
        {!searchError ? (
          <p className="field__description">
            Use an exact public Telegram username. Private channels and unknown
            pricing metadata may not resolve fully.
          </p>
        ) : null}
      </div>

      {resolvedSearchResult ? (
        <div className="channel-search__result">
          <div className="channel-search__label">Found channel</div>
          <ChannelOptionCard
            channel={resolvedSearchResult}
            isSelected={shortlistedIds.includes(resolvedSearchResult.id)}
            onToggle={handleToggleResolvedResult}
          />
        </div>
      ) : null}

      <div className="channels-summary">
        <div>
          <div className="campaign-card__eyebrow">Recommended channels</div>
          <h3 className="form-section__title">Shortlist the best matches</h3>
        </div>
        <div className="channels-summary__actions">
          <div className="channels-summary__value">
            {shortlistedIds.length} selected
          </div>
          <button
            aria-controls="campaign-draft-shortlistedChannels-panel"
            aria-expanded={isRecommendationsOpen}
            className={cn(
              "channels-summary__toggle",
              isRecommendationsOpen && "channels-summary__toggle--open",
            )}
            onClick={() => {
              setIsRecommendationsOpen((value) => !value);
            }}
            type="button"
          >
            <span>{isRecommendationsOpen ? "Hide list" : "Show list"}</span>
            <ChevronDownIcon className="button__icon" />
          </button>
        </div>
      </div>

      <div
        className="channels-summary__panel"
        hidden={!isRecommendationsOpen}
        id="campaign-draft-shortlistedChannels-panel"
      >
        <p className="wizard-step-copy">
          Start from the recommended list or add a known public channel by exact
          username through the API lookup.
        </p>

        <div className="channel-picker" id="campaign-draft-shortlistedChannels">
          {channels.map((channel) => {
            return (
              <ChannelOptionCard
                channel={channel}
                isSelected={shortlistedIds.includes(channel.id)}
                key={channel.id}
                onToggle={() => {
                  toggleShortlist(channel.id);
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

const FinishStep = ({ channels, draft, mode }: FinishStepProps) => (
  <div className="form-section wizard-review">
    <p className="wizard-step-copy">
      {mode === "edit"
        ? "Review the campaign draft before we save the updated version."
        : "Review the campaign draft before we create it. The actual create action only happens when you confirm below."}
    </p>

    <div className="review-section">
      <div className="campaign-card__eyebrow">Basic</div>
      <h3 className="review-section__title">
        {draft.title || "Untitled campaign"}
      </h3>
      <p className="details-text">{draft.text || "No campaign text yet."}</p>
    </div>

    <div className="review-section">
      <div className="campaign-card__eyebrow">Targeting</div>
      <div className="review-list">
        <div className="info-row">
          <span className="info-row__label">Theme</span>
          <span className="info-row__value">{draft.theme || "Not set"}</span>
        </div>
        <div className="info-row">
          <span className="info-row__label">Language</span>
          <span className="info-row__value">
            {formatLanguageLabel(draft.language)}
          </span>
        </div>
        <div className="info-row">
          <span className="info-row__label">Goal</span>
          <span className="info-row__value">{formatGoalLabel(draft.goal)}</span>
        </div>
        <div className="info-row">
          <span className="info-row__label">Audience</span>
          <span className="info-row__value">
            {draft.targetAudience || "No audience note"}
          </span>
        </div>
      </div>
      <div className="chip-list">
        {draft.tags.length > 0 ? (
          draft.tags.map((tag) => (
            <span className="tag-chip" key={tag}>
              {tag}
            </span>
          ))
        ) : (
          <span className="tag-chip tag-chip--ghost">No tags yet</span>
        )}
      </div>
    </div>

    <div className="review-section">
      <div className="campaign-card__eyebrow">Creative</div>
      <div className="review-list">
        <div className="info-row">
          <span className="info-row__label">Assets</span>
          <span className="info-row__value">{draft.media.length}</span>
        </div>
        <div className="info-row">
          <span className="info-row__label">CTA URL</span>
          <span className="info-row__value">
            {draft.ctaUrl || "No CTA URL"}
          </span>
        </div>
        <div className="info-row">
          <span className="info-row__label">Button text</span>
          <span className="info-row__value">
            {draft.buttonText || "No button text"}
          </span>
        </div>
      </div>
    </div>

    <div className="review-section">
      <div className="campaign-card__eyebrow">Budget and channels</div>
      <div className="review-list">
        <div className="info-row">
          <span className="info-row__label">Budget</span>
          <span className="info-row__value">
            {draft.budget.trim().length > 0
              ? formatTonAmount(Number(draft.budget) || 0)
              : "Not set"}
          </span>
        </div>
        <div className="info-row">
          <span className="info-row__label">Shortlisted</span>
          <span className="info-row__value">{channels.length}</span>
        </div>
      </div>

      {channels.length > 0 ? (
        <div className="shortlist-list">
          {channels.map((channel) => (
            <div className="shortlist-item" key={channel.id}>
              <div className="shortlist-avatar">
                {channel.avatar ? (
                  <img alt={channel.name} src={channel.avatar} />
                ) : (
                  getInitials(channel.name)
                )}
              </div>
              <div>
                <div className="channel-card__title">{channel.name}</div>
                <div className="channel-card__handle">
                  @{channel.username.replace(/^@/, "")}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="field__description">
          {mode === "edit"
            ? "You can still save the campaign without a shortlist."
            : "You can still create the campaign without a shortlist."}
        </p>
      )}
    </div>
  </div>
);
