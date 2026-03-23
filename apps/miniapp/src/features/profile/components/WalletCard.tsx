import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import type { ProfileSummary } from "../types";

interface WalletCardProps {
  profile: ProfileSummary;
}

export const WalletCard = ({ profile }: WalletCardProps) => {
  return (
    <Card>
      {/* TODO(phase-2): replace this UI placeholder with real wallet connection state and actions. */}
      <div className="form-section">
        <div>
          <h2 className="placeholder-card__title">Wallet</h2>
          <p className="placeholder-card__copy">
            Keep payment and approval actions close to the campaign record once
            wallet integration is available.
          </p>
        </div>

        <div className="info-row">
          <span className="info-row__label">Status</span>
          <span className="info-row__value">{profile.walletLabel}</span>
        </div>

        <Button variant="secondary">Connect wallet</Button>
      </div>
    </Card>
  );
};
