import { useState } from "react";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { Button } from "../../../components/ui/Button";
import {
  formatWalletAddress,
  parseTonAmountToNano,
} from "../../profile/lib/wallet-transfer";
import {
  payDeal,
  confirmPayment,
} from "../services/api-campaign-workspace-service";

interface PaymentCardProps {
  dealId: string;
  channelName: string;
  priceTon: number;
  dateText: string | null;
  adminWallet: string | null;
  dealStatus: string;
  onPaymentComplete: () => void;
}

interface PaymentFeedback {
  tone: "error" | "success" | "warning";
  message: string;
}

const getTransactionErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return "Transaction could not be created. Please try again.";
  }

  const message = error.message.trim();
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("reject") ||
    normalizedMessage.includes("declin") ||
    normalizedMessage.includes("cancel")
  ) {
    return "Transaction was cancelled in the wallet.";
  }

  if (message.length > 0) {
    return message;
  }

  return "Transaction could not be created. Please try again.";
};

export const PaymentCard = ({
  dealId,
  channelName,
  priceTon,
  dateText,
  adminWallet,
  dealStatus,
  onPaymentComplete,
}: PaymentCardProps) => {
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<PaymentFeedback | null>(null);

  const isWalletConnected = wallet !== null;

  const openWalletModal = async () => {
    setFeedback(null);
    try {
      await tonConnectUI.openModal();
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getTransactionErrorMessage(error),
      });
    }
  };

  const handlePay = async () => {
    if (adminWallet === null) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const { nanoAmount } = parseTonAmountToNano(priceTon.toString());

      const result = await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 5 * 60,
        messages: [
          {
            address: adminWallet.trim(),
            amount: nanoAmount,
          },
        ],
      });

      await payDeal(dealId, result.boc);
      // Confirm payment to extract txHash and trigger post-payment flow
      await confirmPayment(dealId);

      onPaymentComplete();

      setFeedback({ tone: "success", message: "Payment sent successfully!" });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getTransactionErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (dealStatus === "payment_pending") {
    return (
      <div className="approval-card">
        <div className="approval-card__header">Payment sent</div>
        <div className="approval-card__details">
          <div className="approval-card__detail">
            <span className="approval-card__detail-label">Channel</span>
            <span className="approval-card__detail-value">{channelName}</span>
          </div>
          <div className="approval-card__detail">
            <span className="approval-card__detail-label">Amount</span>
            <span className="approval-card__detail-value">{priceTon} TON</span>
          </div>
          <p className="approval-card__summary">
            Your payment has been submitted and is awaiting confirmation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="approval-card">
      <div className="approval-card__header">Payment</div>
      <div className="approval-card__details">
        <div className="approval-card__detail">
          <span className="approval-card__detail-label">Channel</span>
          <span className="approval-card__detail-value">{channelName}</span>
        </div>
        <div className="approval-card__detail">
          <span className="approval-card__detail-label">Price</span>
          <span className="approval-card__detail-value">{priceTon} TON</span>
        </div>
        <div className="approval-card__detail">
          <span className="approval-card__detail-label">Date</span>
          <span className="approval-card__detail-value">
            {dateText ?? "Not specified"}
          </span>
        </div>
        <div className="approval-card__detail">
          <span className="approval-card__detail-label">Wallet</span>
          <span className="approval-card__detail-value">
            {adminWallet !== null
              ? formatWalletAddress(adminWallet)
              : "Not provided"}
          </span>
        </div>
      </div>

      {feedback !== null ? (
        <div
          className={`wallet-send-card__banner wallet-send-card__banner--${feedback.tone}`}
        >
          {feedback.message}
        </div>
      ) : null}

      {adminWallet === null ? (
        <div className="wallet-send-card__banner wallet-send-card__banner--warning">
          Wallet address not available. The channel admin has not provided a TON
          wallet.
        </div>
      ) : null}

      <div className="approval-card__actions">
        {adminWallet !== null && !isWalletConnected ? (
          <Button
            aria-label="Connect TON wallet"
            fullWidth
            onClick={() => {
              void openWalletModal();
            }}
            variant="secondary"
          >
            Connect wallet
          </Button>
        ) : null}

        {adminWallet !== null && isWalletConnected ? (
          <Button
            aria-label={`Pay ${String(priceTon)} TON`}
            disabled={isSubmitting}
            fullWidth
            onClick={() => {
              void handlePay();
            }}
          >
            {isSubmitting
              ? "Processing payment..."
              : `Pay ${String(priceTon)} TON`}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
