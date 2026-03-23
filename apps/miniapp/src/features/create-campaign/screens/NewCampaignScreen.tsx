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
  const isEditMode = mode === "edit";

  return (
    <div className="screen-stack">
      <button className="details-back" onClick={onBack} type="button">
        {backLabel}
      </button>
      <ScreenHeader
        action={
          <div className="wizard-header-pill">
            Step {currentStepIndex + 1}/{campaignWizardSteps.length}
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
      <CampaignWizard
        draftState={draftState}
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
