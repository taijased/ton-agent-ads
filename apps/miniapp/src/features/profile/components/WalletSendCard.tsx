import { useEffect, useState } from "react";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { TextField } from "../../../components/ui/TextField";
import {
  TESTNET_CHAIN_ID,
  formatWalletAddress,
  getWalletNetworkLabel,
  isTestnetChain,
  parseTonAmountToNano,
  validateTransferAddress,
} from "../lib/wallet-transfer";

interface WalletSendFormErrors {
  amount: string | null;
  recipientAddress: string | null;
}

interface WalletSendFeedback {
  tone: "error" | "success" | "warning";
  message: string;
}

const EMPTY_ERRORS: WalletSendFormErrors = {
  amount: null,
  recipientAddress: null,
};

const PENDING_TRANSFER_STORAGE_KEY = "miniapp.wallet-send.pending-transfer";

const readPendingTransferFlag = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(PENDING_TRANSFER_STORAGE_KEY) === "true";
};

const setPendingTransferFlag = (value: boolean): void => {
  if (typeof window === "undefined") {
    return;
  }

  if (value) {
    window.sessionStorage.setItem(PENDING_TRANSFER_STORAGE_KEY, "true");
    return;
  }

  window.sessionStorage.removeItem(PENDING_TRANSFER_STORAGE_KEY);
};

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

const isPendingRequestError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.toLowerCase().includes("request already pending");
};

export const WalletSendCard = () => {
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<WalletSendFormErrors>(EMPTY_ERRORS);
  const [feedback, setFeedback] = useState<WalletSendFeedback | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPendingTransfer, setHasPendingTransfer] = useState(false);

  const walletChain = wallet?.account.chain;
  const isWalletConnected = wallet !== null;
  const isWalletOnTestnet = isTestnetChain(walletChain);
  const senderAddress = wallet?.account.address ?? "";

  useEffect(() => {
    setHasPendingTransfer(readPendingTransferFlag());
  }, []);

  const clearPendingTransfer = () => {
    setPendingTransferFlag(false);
    setHasPendingTransfer(false);
    setFeedback(null);
  };

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: WalletSendFormErrors = {
      amount: null,
      recipientAddress: validateTransferAddress(recipientAddress),
    };

    let normalizedAmount = amount;
    let nanoAmount = "";

    try {
      const parsedAmount = parseTonAmountToNano(amount);
      normalizedAmount = parsedAmount.normalizedAmount;
      nanoAmount = parsedAmount.nanoAmount;
    } catch (error) {
      nextErrors.amount = getTransactionErrorMessage(error);
    }

    setErrors(nextErrors);
    setFeedback(null);

    if (nextErrors.recipientAddress || nextErrors.amount) {
      return;
    }

    if (!wallet) {
      setFeedback({
        tone: "warning",
        message: "Connect a TON wallet before sending testnet funds.",
      });
      return;
    }

    if (!isWalletOnTestnet) {
      setFeedback({
        tone: "warning",
        message:
          "The connected wallet is not on testnet. Switch the wallet to TON testnet and try again.",
      });
      return;
    }

    if (hasPendingTransfer) {
      setFeedback({
        tone: "warning",
        message:
          "There is already a pending transaction request in the wallet. Confirm or cancel it there, then clear the pending state here before sending again.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await tonConnectUI.sendTransaction(
        {
          validUntil: Math.floor(Date.now() / 1000) + 5 * 60,
          network: TESTNET_CHAIN_ID,
          from: wallet.account.address,
          messages: [
            {
              address: recipientAddress.trim(),
              amount: nanoAmount,
            },
          ],
        },
        {
          onRequestSent: () => {
            setPendingTransferFlag(true);
            setHasPendingTransfer(true);
            setFeedback({
              tone: "warning",
              message:
                "Transaction request was sent to the wallet. Finish it there before creating another one.",
            });
          },
        },
      );

      setRecipientAddress("");
      setAmount("");
      setErrors(EMPTY_ERRORS);
      setPendingTransferFlag(false);
      setHasPendingTransfer(false);
      setFeedback({
        tone: "success",
        message: `Transaction request created for ${formatWalletAddress(
          recipientAddress.trim(),
        )}. Confirm it in ${wallet.device.appName}.`,
      });
    } catch (error) {
      if (isPendingRequestError(error)) {
        setPendingTransferFlag(true);
        setHasPendingTransfer(true);
        setFeedback({
          tone: "warning",
          message:
            "The wallet already has a pending transaction request. Confirm or cancel it there, then press `Clear pending state` and try again.",
        });
        return;
      }

      setPendingTransferFlag(false);
      setHasPendingTransfer(false);
      setFeedback({
        tone: "error",
        message: getTransactionErrorMessage(error),
      });
      setAmount(normalizedAmount);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <form className="form-section" onSubmit={handleSubmit}>
        <div>
          <h2 className="placeholder-card__title">Send testnet TON</h2>
          <p className="placeholder-card__copy">
            Create a testnet transaction from the connected wallet by entering
            the recipient address and amount.
          </p>
        </div>

        <div className="wallet-send-card__meta">
          <div className="info-row">
            <span className="info-row__label">Sender</span>
            <span className="info-row__value wallet-card__value">
              {isWalletConnected
                ? formatWalletAddress(senderAddress)
                : "Connect wallet first"}
            </span>
          </div>
          <div className="info-row">
            <span className="info-row__label">Network</span>
            <span className="info-row__value">
              {isWalletConnected ? getWalletNetworkLabel(walletChain) : "None"}
            </span>
          </div>
        </div>

        {!isWalletConnected ? (
          <div className="wallet-send-card__banner wallet-send-card__banner--warning">
            Connect a wallet before sending. Transactions from this card are
            created only for TON testnet.
          </div>
        ) : null}

        {isWalletConnected && !isWalletOnTestnet ? (
          <div className="wallet-send-card__banner wallet-send-card__banner--warning">
            The connected wallet is on {getWalletNetworkLabel(walletChain)}.
            Switch it to TON testnet before sending.
          </div>
        ) : null}

        {feedback ? (
          <div
            className={`wallet-send-card__banner wallet-send-card__banner--${feedback.tone}`}
          >
            {feedback.message}
          </div>
        ) : null}

        {hasPendingTransfer ? (
          <div className="wallet-send-card__banner wallet-send-card__banner--warning">
            A previous transaction request is still marked as pending for this
            browser session. Complete it in the wallet, or clear the pending
            flag if it was already dismissed.
          </div>
        ) : null}

        <div className="form-stack">
          <TextField
            autoComplete="off"
            description="Paste the recipient TON wallet address."
            error={errors.recipientAddress ?? undefined}
            id="wallet-send-recipient"
            label="Recipient address"
            onChange={(value) => {
              setRecipientAddress(value);
              setErrors((currentErrors) => ({
                ...currentErrors,
                recipientAddress: null,
              }));
            }}
            placeholder="kQ..."
            value={recipientAddress}
          />

          <TextField
            autoComplete="off"
            description="The transfer will be sent on TON testnet."
            error={errors.amount ?? undefined}
            id="wallet-send-amount"
            inputMode="decimal"
            label="Amount"
            onChange={(value) => {
              setAmount(value);
              setErrors((currentErrors) => ({
                ...currentErrors,
                amount: null,
              }));
            }}
            placeholder="0.25"
            suffix="TON"
            value={amount}
          />
        </div>

        <div className="wallet-send-card__actions">
          {!isWalletConnected ? (
            <Button
              fullWidth
              onClick={() => {
                void openWalletModal();
              }}
              type="button"
              variant="secondary"
            >
              Connect wallet
            </Button>
          ) : null}

          {hasPendingTransfer ? (
            <Button
              fullWidth
              onClick={clearPendingTransfer}
              type="button"
              variant="secondary"
            >
              Clear pending state
            </Button>
          ) : null}

          <Button
            disabled={
              !isWalletConnected ||
              !isWalletOnTestnet ||
              isSubmitting ||
              hasPendingTransfer
            }
            fullWidth
            type="submit"
          >
            {isSubmitting
              ? "Creating transaction..."
              : hasPendingTransfer
                ? "Transaction pending"
                : "Send"}
          </Button>
        </div>
      </form>
    </Card>
  );
};
