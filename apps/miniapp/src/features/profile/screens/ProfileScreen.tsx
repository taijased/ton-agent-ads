import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import { ProfileCard } from "../components/ProfileCard";
import { SettingsPlaceholderCard } from "../components/SettingsPlaceholderCard";
import { WalletCard } from "../components/WalletCard";
import type { ProfileSummary } from "../types";

interface ProfileScreenProps {
  profile: ProfileSummary;
}

export const ProfileScreen = ({ profile }: ProfileScreenProps) => {
  return (
    <div className="screen-stack">
      <ScreenHeader
        eyebrow="Identity"
        subtitle="A lightweight home for Telegram identity, wallet actions, and future account preferences."
        title="Profile"
      />
      <ProfileCard profile={profile} />
      <WalletCard profile={profile} />
      <SettingsPlaceholderCard />
    </div>
  );
};
