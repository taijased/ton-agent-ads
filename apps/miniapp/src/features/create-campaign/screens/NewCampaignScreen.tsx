import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import { CampaignWizard } from "../components/CampaignWizard";
import {
  campaignWizardSteps,
  type CampaignEditorMode,
  type CampaignDraft,
  type CampaignDraftState,
  type RecommendedChannel,
  type WizardStepId,
} from "../types";

interface NewCampaignScreenProps {
  backLabel?: string;
  draftState: CampaignDraftState;
  focusedStep?: WizardStepId | null;
  mode?: CampaignEditorMode;
  onBack: () => void;
  onAppendChannel: (channel: RecommendedChannel) => void;
  onDraftPatch: (patch: Partial<CampaignDraft>) => void;
  onStepChange: (step: WizardStepId) => void;
  onSubmit: () => Promise<void>;
  recommendedChannels: RecommendedChannel[];
}

export const NewCampaignScreen = ({
  backLabel = "Back to campaigns",
  draftState,
  focusedStep = null,
  mode = "create",
  onBack,
  onAppendChannel,
  onDraftPatch,
  onStepChange,
  onSubmit,
  recommendedChannels,
}: NewCampaignScreenProps) => {
  const currentStepIndex = campaignWizardSteps.findIndex(
    (step) => step.id === draftState.step,
  );
  const currentStep =
    campaignWizardSteps[currentStepIndex] ?? campaignWizardSteps[0];
  const isEditMode = mode === "edit";
  const isFocusedEdit = isEditMode && focusedStep !== null;
  const progressPercent =
    ((currentStepIndex + 1) / campaignWizardSteps.length) * 100;

  return (
    <div className="screen-stack">
      <button className="details-back" onClick={onBack} type="button">
        <span aria-hidden="true">←</span>
        {backLabel}
      </button>
      {!isFocusedEdit ? (
        <ScreenHeader
          action={
            <div
              aria-label={`Step ${currentStepIndex + 1} of ${campaignWizardSteps.length}`}
              className="wizard-header-pill"
            >
              <div className="wizard-header-pill__meta">
                <span className="wizard-header-pill__label">
                  Wizard progress
                </span>
                <span className="wizard-header-pill__step">
                  {currentStep.label}
                </span>
              </div>
              <div className="wizard-header-pill__numbers">
                <span className="wizard-header-pill__value">
                  {currentStepIndex + 1}
                </span>
                <span className="wizard-header-pill__total">
                  /{campaignWizardSteps.length}
                </span>
              </div>
              <span aria-hidden="true" className="wizard-header-pill__bar">
                <span
                  className="wizard-header-pill__bar-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </span>
            </div>
          }
          eyebrow={isEditMode ? "Campaign editor" : "Campaign wizard"}
          subtitle={
            isEditMode
              ? "Refine the brief, targeting, creative, budget, and shortlist using the same six-step flow as create."
              : "Move from basic brief to shortlist in six compact steps. We only create the campaign on the final confirmation screen."
          }
          title={isEditMode ? "Edit campaign" : "Create campaign"}
        />
      ) : null}
      <CampaignWizard
        draftState={draftState}
        focusedStep={focusedStep}
        mode={mode}
        onAppendChannel={onAppendChannel}
        onDraftPatch={onDraftPatch}
        onStepChange={onStepChange}
        onSubmit={onSubmit}
        recommendedChannels={recommendedChannels}
      />
    </div>
  );
};
