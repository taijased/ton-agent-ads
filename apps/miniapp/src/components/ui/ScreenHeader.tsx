import { useEffect, useRef, useState, type ReactNode } from "react";
import { StatusChip } from "./StatusChip";
import { CampaignDisplayStatus } from "../../features/campaigns/types";

interface ScreenHeaderProps {
  action?: ReactNode;
  description?: string;
  eyebrow: string;
  subtitle: string;
  title: string;
  status?: CampaignDisplayStatus;
}

export const ScreenHeader = ({
  action,
  description,
  eyebrow,
  subtitle,
  title,
  status,
}: ScreenHeaderProps) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [canToggleDescription, setCanToggleDescription] = useState(false);
  const measureRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (!description) {
      setCanToggleDescription(false);
      setIsDescriptionExpanded(false);
      return;
    }

    const updateClampState = () => {
      const measureElement = measureRef.current;

      if (!measureElement) {
        return;
      }

      const lineHeight = Number.parseFloat(
        window.getComputedStyle(measureElement).lineHeight,
      );
      const descriptionHeight = measureElement.getBoundingClientRect().height;
      const nextCanToggle =
        Number.isFinite(lineHeight) && descriptionHeight > lineHeight * 2 + 1;

      setCanToggleDescription(nextCanToggle);

      if (!nextCanToggle) {
        setIsDescriptionExpanded(false);
      }
    };

    updateClampState();
    window.addEventListener("resize", updateClampState);

    return () => {
      window.removeEventListener("resize", updateClampState);
    };
  }, [description]);

  return (
    <div className="screen-header">
      <div className="screen-header__content">
        <div className="screen-header__eyebrow">{eyebrow}</div>
        <h1 className="screen-header__title">{title}</h1>
        <p className="screen-header__subtitle">{subtitle}</p>
        {description ? (
          <>
            <p
              className={`screen-header__description${
                isDescriptionExpanded
                  ? " screen-header__description--expanded"
                  : ""
              }`}
            >
              {description}
            </p>
            {canToggleDescription ? (
              <button
                className="screen-header__description-toggle"
                onClick={() => {
                  setIsDescriptionExpanded((currentValue) => !currentValue);
                }}
                type="button"
              >
                Show {isDescriptionExpanded ? "less" : "more"}
              </button>
            ) : null}
            <p
              aria-hidden="true"
              className="screen-header__description screen-header__description--measure"
              ref={measureRef}
            >
              {description}
            </p>
          </>
        ) : null}
      </div>
      {action || status ? (
        <div className="screen-header__meta">
          {status ? <StatusChip status={status} /> : null}
          {action ? <div>{action}</div> : null}
        </div>
      ) : null}
    </div>
  );
};
