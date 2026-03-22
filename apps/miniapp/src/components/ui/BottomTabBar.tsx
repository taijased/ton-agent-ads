import { cn } from "../../lib/cn";
import type { BottomTabId } from "../../lib/route";

interface BottomTabBarProps {
  activeTab: BottomTabId;
  onSelect: (tabId: BottomTabId) => void;
}

const tabs: Array<{ id: BottomTabId; label: string }> = [
  { id: "campaigns", label: "Campaigns" },
  { id: "new-campaign", label: "New Campaign" },
  { id: "profile", label: "Profile" },
];

export const BottomTabBar = ({ activeTab, onSelect }: BottomTabBarProps) => {
  return (
    <nav aria-label="Primary" className="tabbar">
      {tabs.map((tab) => (
        <button
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
          <span className="tabbar__icon" aria-hidden="true" />
          <span className="tabbar__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};
