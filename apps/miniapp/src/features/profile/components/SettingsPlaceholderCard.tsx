import { Card } from "../../../components/ui/Card";

export const SettingsPlaceholderCard = () => {
  return (
    <Card>
      <div className="placeholder-card">
        <h2 className="placeholder-card__title">Settings and preferences</h2>
        <p className="placeholder-card__copy">
          Notification rules, campaign defaults, and account preferences will
          appear here in a later phase.
        </p>
      </div>
    </Card>
  );
};
