import { TextField } from "../../../components/ui/TextField";
import { cn } from "../../../lib/cn";
import { themeOptions } from "../types";

interface ThemeSelectorProps {
  error?: string;
  onChange: (value: string) => void;
  value: string;
}

const isPresetTheme = (value: string): boolean =>
  themeOptions.some((option) => option.value === value);

export const ThemeSelector = ({
  error,
  onChange,
  value,
}: ThemeSelectorProps) => {
  const showCustomInput = value.trim().length === 0 || !isPresetTheme(value);

  return (
    <div className="field">
      <div className="field__label">
        Theme
        <span className="field__required">*</span>
      </div>

      <div className="choice-grid">
        {themeOptions.map((option) => (
          <button
            className={cn(
              "choice-card",
              value === option.value ? "choice-card--active" : undefined,
            )}
            key={option.value}
            onClick={() => {
              onChange(option.value);
            }}
            type="button"
          >
            <span className="choice-card__title">{option.value}</span>
            <span className="choice-card__copy">{option.description}</span>
          </button>
        ))}

        <button
          className={cn(
            "choice-card",
            showCustomInput ? "choice-card--active" : undefined,
          )}
          onClick={() => {
            if (isPresetTheme(value)) {
              onChange("");
            }
          }}
          type="button"
        >
          <span className="choice-card__title">Custom theme</span>
          <span className="choice-card__copy">
            Enter your own angle when the brief needs a more specific direction.
          </span>
        </button>
      </div>

      {showCustomInput ? (
        <TextField
          autoComplete="off"
          error={error}
          id="campaign-draft-theme-input"
          label="Custom theme"
          onChange={onChange}
          placeholder="TON wallet onboarding push"
          value={value}
        />
      ) : null}

      {!error ? (
        <p className="field__description">
          Pick a starting angle now. We can use it later for recommendation and
          negotiation prompts.
        </p>
      ) : null}
    </div>
  );
};
