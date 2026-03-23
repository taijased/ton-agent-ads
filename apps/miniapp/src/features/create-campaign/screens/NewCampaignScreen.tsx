import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import { CampaignWizard } from "../components/CampaignWizard";
import {
  campaignWizardSteps,
  type CampaignDraft,
  type CampaignDraftState,
  type RecommendedChannel,
  type WizardStepId,
} from "../types";

interface NewCampaignScreenProps {
  draftState: CampaignDraftState;
  onBack: () => void;
  onAppendChannel: (channel: RecommendedChannel) => void;
  onDraftPatch: (patch: Partial<CampaignDraft>) => void;
  onStepChange: (step: WizardStepId) => void;
  onSubmit: () => Promise<void>;
  recommendedChannels: RecommendedChannel[];
}

export const NewCampaignScreen = ({
  draftState,
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

  return (
    <div className="screen-stack">
      <button className="details-back" onClick={onBack} type="button">
        Back to campaigns
      </button>
      <ScreenHeader
        action={
          <div className="wizard-header-pill">
            Step {currentStepIndex + 1}/{campaignWizardSteps.length}
          </div>
        }
        eyebrow="Campaign wizard"
        subtitle="Move from basic brief to shortlist in six compact steps. We only create the campaign on the final confirmation screen."
        title="Create campaign"
      />
      <CampaignWizard
        draftState={draftState}
        onAppendChannel={onAppendChannel}
        onDraftPatch={onDraftPatch}
        onStepChange={onStepChange}
        onSubmit={onSubmit}
        recommendedChannels={recommendedChannels}
      />
    </div>
  );
};
