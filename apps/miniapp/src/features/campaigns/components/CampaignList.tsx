import { CampaignCard } from "./CampaignCard";
import type { CampaignSummary } from "../types";

interface CampaignListProps {
  campaigns: CampaignSummary[];
  onSelect: (campaignId: string) => void;
}

export const CampaignList = ({ campaigns, onSelect }: CampaignListProps) => {
  return (
    <div className="screen-stack">
      {campaigns.map((campaign) => (
        <CampaignCard
          campaign={campaign}
          key={campaign.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};
