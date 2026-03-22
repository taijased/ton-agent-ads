import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import { CampaignForm } from "../components/CampaignForm";
import type { CampaignFormDraft } from "../types";

interface NewCampaignScreenProps {
  onSubmit: (draft: CampaignFormDraft) => Promise<void>;
}

export const NewCampaignScreen = ({ onSubmit }: NewCampaignScreenProps) => {
  return (
    <div className="screen-stack">
      <ScreenHeader
        eyebrow="Launch setup"
        subtitle="Create a clean campaign brief now. Recommendation, negotiation, payment, and analytics stay out of scope for Phase 1."
        title="New campaign"
      />
      <CampaignForm onSubmit={onSubmit} />
    </div>
  );
};
