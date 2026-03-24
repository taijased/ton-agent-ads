import type { ReactNode } from "react";
import { StatusChip } from "./StatusChip";
import { CampaignDisplayStatus } from "../../features/campaigns/types";

interface ScreenHeaderProps {
  action?: ReactNode;
  eyebrow: string;
  subtitle: string;
  title: string;
  status?: CampaignDisplayStatus;
}

export const ScreenHeader = ({
  action,
  eyebrow,
  subtitle,
  title,
  status,
}: ScreenHeaderProps) => {
  return (
    <div className="screen-header">
      <div className="screen-header__content">
        <div className="screen-header__eyebrow">{eyebrow}</div>
        <h1 className="screen-header__title">{title}</h1>
        <p className="screen-header__subtitle">{subtitle}</p>
      </div>
      {action && <div>{action}</div>}
      {status && <StatusChip status={status} />}
    </div>
  );
};
