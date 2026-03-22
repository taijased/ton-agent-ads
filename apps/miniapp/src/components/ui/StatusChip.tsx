import type { CampaignDisplayStatus } from "../../features/campaigns/types";
import { cn } from "../../lib/cn";

interface StatusChipProps {
  status: CampaignDisplayStatus;
}

const toStatusClassName = (status: CampaignDisplayStatus) =>
  status.replaceAll(" ", "-");

export const StatusChip = ({ status }: StatusChipProps) => {
  return (
    <span
      className={cn("status-chip", `status-chip--${toStatusClassName(status)}`)}
    >
      {status}
    </span>
  );
};
