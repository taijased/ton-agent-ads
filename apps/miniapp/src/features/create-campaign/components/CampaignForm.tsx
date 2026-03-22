import { useState, type FormEvent } from "react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { TextAreaField } from "../../../components/ui/TextAreaField";
import { TextField } from "../../../components/ui/TextField";
import { GoalSelector } from "./GoalSelector";
import {
  emptyCampaignFormDraft,
  type CampaignFormDraft,
  type CampaignFormErrors,
} from "../types";
import {
  hasCampaignFormErrors,
  normalizeCampaignFormDraft,
  validateCampaignForm,
} from "../validators";

interface CampaignFormProps {
  onSubmit: (draft: CampaignFormDraft) => Promise<void>;
}

const getFormErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Campaign could not be created. Please try again.";
};

const getFirstInvalidField = (
  errors: CampaignFormErrors,
): keyof CampaignFormErrors | null => {
  const fieldOrder: Array<keyof CampaignFormErrors> = [
    "title",
    "description",
    "goal",
    "budget",
    "ctaUrl",
  ];

  return fieldOrder.find((fieldName) => Boolean(errors[fieldName])) ?? null;
};

export const CampaignForm = ({ onSubmit }: CampaignFormProps) => {
  const [draft, setDraft] = useState<CampaignFormDraft>(emptyCampaignFormDraft);
  const [errors, setErrors] = useState<CampaignFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const focusField = (fieldName: keyof CampaignFormErrors) => {
    const fieldId = `campaign-form-${fieldName}`;
    const element = document.getElementById(fieldId);

    if (element instanceof HTMLElement) {
      element.focus();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedDraft = normalizeCampaignFormDraft(draft);
    const nextErrors = validateCampaignForm(normalizedDraft);

    if (hasCampaignFormErrors(nextErrors)) {
      setErrors(nextErrors);
      setFormError(null);

      const firstInvalidField = getFirstInvalidField(nextErrors);
      if (firstInvalidField) {
        window.requestAnimationFrame(() => {
          focusField(firstInvalidField);
        });
      }

      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setFormError(null);

    try {
      await onSubmit(normalizedDraft);
      setDraft(emptyCampaignFormDraft);
    } catch (error: unknown) {
      setFormError(getFormErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      {formError ? <div className="form-banner">{formError}</div> : null}

      <Card>
        <div className="form-section">
          <h2 className="form-section__title">Campaign basics</h2>
          <TextField
            autoComplete="off"
            error={errors.title}
            id="campaign-form-title"
            label="Campaign title"
            onChange={(value) => {
              setDraft((currentDraft) => ({ ...currentDraft, title: value }));
            }}
            placeholder="Launch week awareness push"
            requiredIndicator
            value={draft.title}
          />
          <TextAreaField
            description="Use the ad text or a concise campaign brief. This becomes the source copy for future automation."
            error={errors.description}
            id="campaign-form-description"
            label="Description / ad text"
            onChange={(value) => {
              setDraft((currentDraft) => ({
                ...currentDraft,
                description: value,
              }));
            }}
            placeholder="Explain the offer, audience, and the action you want readers to take."
            requiredIndicator
            value={draft.description}
          />
          <GoalSelector
            error={errors.goal}
            id="campaign-form-goal"
            onChange={(goal) => {
              setDraft((currentDraft) => ({ ...currentDraft, goal }));
            }}
            value={draft.goal}
          />
          <TextField
            error={errors.budget}
            id="campaign-form-budget"
            inputMode="decimal"
            label="Budget"
            onChange={(value) => {
              setDraft((currentDraft) => ({ ...currentDraft, budget: value }));
            }}
            placeholder="25"
            requiredIndicator
            suffix="TON"
            value={draft.budget}
          />
        </div>
      </Card>

      <Card>
        <div className="form-section">
          <h2 className="form-section__title">Destination and CTA</h2>
          <TextField
            error={errors.ctaUrl}
            id="campaign-form-ctaUrl"
            inputMode="url"
            label="CTA URL"
            onChange={(value) => {
              setDraft((currentDraft) => ({ ...currentDraft, ctaUrl: value }));
            }}
            placeholder="https://adagent.app/demo"
            value={draft.ctaUrl}
          />
          <TextField
            id="campaign-form-buttonText"
            label="Button text"
            onChange={(value) => {
              setDraft((currentDraft) => ({
                ...currentDraft,
                buttonText: value,
              }));
            }}
            placeholder="Open demo"
            value={draft.buttonText}
          />
        </div>
      </Card>

      <Card>
        <div className="form-section">
          <h2 className="form-section__title">Creative</h2>
          <div className="media-placeholder">
            <p className="media-placeholder__title">Media upload comes next</p>
            <p className="media-placeholder__copy">
              Phase 1 keeps this simple. Use a hosted image or video URL for
              now, and we will wire upload handling in a later iteration.
            </p>
          </div>
          <TextField
            id="campaign-form-mediaUrl"
            inputMode="url"
            label="Media URL"
            onChange={(value) => {
              setDraft((currentDraft) => ({
                ...currentDraft,
                mediaUrl: value,
              }));
            }}
            placeholder="https://cdn.example.com/creative.jpg"
            value={draft.mediaUrl}
          />
        </div>
      </Card>

      <Button disabled={isSubmitting} fullWidth type="submit">
        {isSubmitting ? "Creating campaign..." : "Create campaign"}
      </Button>
    </form>
  );
};
