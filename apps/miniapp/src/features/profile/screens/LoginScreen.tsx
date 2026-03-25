import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { ScreenHeader } from "../../../components/ui/ScreenHeader";

interface LoginScreenProps {
  canUseTelegramInitData: boolean;
  errorMessage: string | null;
  isSubmitting: boolean;
  shouldOpenTelegram: boolean;
  onContinue: () => void;
}

export const LoginScreen = ({
  canUseTelegramInitData,
  errorMessage,
  isSubmitting,
  shouldOpenTelegram,
  onContinue,
}: LoginScreenProps) => {
  return (
    <div className="screen-stack">
      <ScreenHeader
        eyebrow="Authentication"
        subtitle="Use your Telegram mini app session to unlock campaigns, profile data, and workspace actions."
        title="Login with Telegram"
      />

      <Card>
        <div className="form-section">
          <div>
            <h2 className="placeholder-card__title">Telegram sign-in</h2>
            <p className="placeholder-card__copy">
              {canUseTelegramInitData
                ? "We found Telegram mini app data for this session. Continue to verify it with the API."
                : shouldOpenTelegram
                  ? "This browser session does not include Telegram mini app data. Open the app from Telegram, then sign in."
                  : "Telegram mini app data is unavailable in the current session. Reopen the mini app and try again."}
            </p>
            {errorMessage ? (
              <p className="placeholder-card__copy">{errorMessage}</p>
            ) : null}
          </div>

          <Button
            disabled={isSubmitting}
            fullWidth
            onClick={onContinue}
            type="button"
          >
            {isSubmitting
              ? "Connecting..."
              : shouldOpenTelegram
                ? "Open in Telegram"
                : "Login with Telegram"}
          </Button>
        </div>
      </Card>
    </div>
  );
};
