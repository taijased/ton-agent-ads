import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { ScreenHeader } from "../../../components/ui/ScreenHeader";

interface LoginScreenProps {
  canUseTelegramInitData: boolean;
  errorMessage: string | null;
  isSubmitting: boolean;
  onContinue: () => void;
}

export const LoginScreen = ({
  canUseTelegramInitData,
  errorMessage,
  isSubmitting,
  onContinue,
}: LoginScreenProps) => {
  return (
    <div className="screen-stack">
      <ScreenHeader
        eyebrow="Authentication"
        subtitle="Use your Telegram mini app session to unlock campaigns, profile data, and workspace actions."
        title="Continue with Telegram"
      />

      <Card>
        <div className="form-section">
          <div>
            <h2 className="placeholder-card__title">Telegram sign-in</h2>
            <p className="placeholder-card__copy">
              {canUseTelegramInitData
                ? "We found Telegram mini app data for this session. Continue to verify it with the API."
                : "This browser session does not include Telegram mini app data. Open the app from Telegram, then try again."}
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
              : canUseTelegramInitData
                ? "Continue with Telegram"
                : "Open in Telegram"}
          </Button>
        </div>
      </Card>
    </div>
  );
};
