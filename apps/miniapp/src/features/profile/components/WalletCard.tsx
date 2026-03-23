import { useTonAddress, useTonWallet } from "@tonconnect/ui-react";
import { Card } from "../../../components/ui/Card";

const formatWalletAddress = (value: string): string => {
  if (value.trim().length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-6)}`;
};

export const WalletCard = () => {
  const wallet = useTonWallet();
  const address = useTonAddress();

  return (
    <Card>
      <div className="form-section">
        <div>
          <h2 className="placeholder-card__title">Wallet</h2>
          <p className="placeholder-card__copy">
            Connect and manage your TON wallet from the header with TonConnect.
          </p>
        </div>

        <div className="info-row">
          <span className="info-row__label">Status</span>
          <span className="info-row__value">
            {wallet === null ? "Wallet not connected" : "Connected"}
          </span>
        </div>

        <div className="info-row">
          <span className="info-row__label">Wallet</span>
          <span className="info-row__value wallet-card__value">
            {wallet === null
              ? "Use Connect wallet in the header."
              : wallet.device.appName}
          </span>
        </div>

        <div className="info-row">
          <span className="info-row__label">Address</span>
          <span className="info-row__value wallet-card__value">
            {wallet === null || address.length === 0
              ? "Address will appear after connection."
              : formatWalletAddress(address)}
          </span>
        </div>
      </div>
    </Card>
  );
};
