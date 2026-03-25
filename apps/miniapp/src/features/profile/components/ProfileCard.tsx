import { Card } from "../../../components/ui/Card";
import { getInitials } from "../../../lib/format";
import type { ProfileSummary } from "../types";

interface ProfileCardProps {
  profile: ProfileSummary;
}

export const ProfileCard = ({ profile }: ProfileCardProps) => {
  const authMethodLabel =
    profile.authMethod === "telegram_init_data"
      ? "Telegram mini app"
      : profile.authMethod === "telegram_login_widget"
        ? "Telegram login widget"
        : "Not authenticated";

  return (
    <Card>
      <div className="profile-card">
        <div className="profile-avatar">
          {profile.avatarUrl ? (
            <img
              alt={`${profile.displayName} avatar`}
              src={profile.avatarUrl}
            />
          ) : (
            <span>{getInitials(profile.displayName)}</span>
          )}
        </div>

        <div className="profile-card__content">
          <h2 className="profile-card__title">{profile.displayName}</h2>
          <p className="profile-card__handle">{profile.username}</p>
          <p className="profile-card__meta">
            Telegram ID: {profile.telegramId}
          </p>
          <p className="profile-card__meta">Auth: {authMethodLabel}</p>
        </div>
      </div>
    </Card>
  );
};
