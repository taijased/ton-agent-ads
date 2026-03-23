import type { CampaignGoal } from "@repo/types";
import { cn } from "../../../lib/cn";
import { campaignGoalOptions, type CampaignFormGoal } from "../types";

interface GoalSelectorProps {
  error?: string;
  id?: string;
  onChange: (goal: CampaignFormGoal) => void;
  value: CampaignGoal | null;
}

const goalCopy: Record<CampaignFormGoal, string> = {
  AWARENESS: "Reach the right channels fast.",
  TRAFFIC: "Drive readers into your funnel.",
  SUBSCRIBERS: "Grow your Telegram audience.",
};

export const GoalSelector = ({
  error,
  id,
  onChange,
  value,
}: GoalSelectorProps) => {
  return (
    <div className="goal-selector">
      <div className="field__label" id={id}>
        Goal
        <span className="field__required">*</span>
      </div>

      <div
        aria-labelledby={id}
        className="goal-selector__list"
        role="radiogroup"
        tabIndex={-1}
      >
        {campaignGoalOptions.map((goal) => (
          <button
            aria-checked={value === goal.value}
            className={cn(
              "goal-selector__button",
              value === goal.value
                ? "goal-selector__button--active"
                : undefined,
            )}
            key={goal.value}
            onClick={() => {
              onChange(goal.value);
            }}
            role="radio"
            type="button"
          >
            <span className="goal-selector__button-title">{goal.label}</span>
            <span className="goal-selector__button-copy">
              {goalCopy[goal.value]}
            </span>
          </button>
        ))}
      </div>

      {error ? <p className="field__error">{error}</p> : null}
    </div>
  );
};
