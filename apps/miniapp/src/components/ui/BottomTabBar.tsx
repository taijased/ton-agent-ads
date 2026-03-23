import { cn } from "../../lib/cn";
import type { BottomTabId } from "../../lib/route";
import { CampaignsIcon, NewCampaignIcon, ProfileIcon } from "./AppIcons";

interface BottomTabBarProps {
  activeTab: BottomTabId;
  onSelect: (tabId: BottomTabId) => void;
}

const tabs = [
  { icon: CampaignsIcon, id: "campaigns", label: "Campaigns" },
  { icon: NewCampaignIcon, id: "new-campaign", label: "New Campaign" },
  { icon: ProfileIcon, id: "profile", label: "Profile" },
] satisfies Array<{
  icon: typeof CampaignsIcon;
  id: BottomTabId;
  label: string;
}>;

export const BottomTabBar = ({ activeTab, onSelect }: BottomTabBarProps) => {
  return (
    <nav aria-label="Primary" className="tabbar">
      {tabs.map((tab) => (
        <button
          aria-label={tab.label}
          key={tab.id}
          aria-current={activeTab === tab.id ? "page" : undefined}
          className={cn(
            "tabbar__button",
            activeTab === tab.id ? "tabbar__button--active" : undefined,
          )}
          onClick={() => {
            onSelect(tab.id);
          }}
          type="button"
        >
          <tab.icon aria-hidden="true" className="tabbar__icon" />
        </button>
      ))}
    </nav>
  );
};
