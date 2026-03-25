import { Button } from "../../../components/ui/Button";
import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import { ProfileCard } from "../components/ProfileCard";
import { SettingsPlaceholderCard } from "../components/SettingsPlaceholderCard";
import { WalletCard } from "../components/WalletCard";
import { WalletSendCard } from "../components/WalletSendCard";
import type { ProfileSummary } from "../types";

interface ProfileScreenProps {
  onLogout: () => void;
  profile: ProfileSummary;
}

export const ProfileScreen = ({ onLogout, profile }: ProfileScreenProps) => {
  return (
    <div className="screen-stack">
      <ScreenHeader
        eyebrow="Identity"
        subtitle="A lightweight home for Telegram identity, wallet actions, and future account preferences."
        title="Profile"
      />
      <ProfileCard profile={profile} />
      <Button fullWidth onClick={onLogout} variant="secondary">
        Log out
      </Button>
      <WalletCard />
      <SettingsPlaceholderCard />
      <WalletSendCard />
    </div>
  );
};
