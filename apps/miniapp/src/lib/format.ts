import type { CampaignGoal } from "@repo/types";

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

const shortDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

const shortDateTimeFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const formatTonAmount = (value: number): string => {
  const normalizedValue =
    Number.isInteger(value) && Math.abs(value) < 1000
      ? String(value)
      : value.toLocaleString("en-US", {
          maximumFractionDigits: 2,
        });

  return `${normalizedValue} TON`;
};

export const formatCampaignAmount = (
  value: number,
  kind: "budget" | "agreed",
): string =>
  `${kind === "agreed" ? "Agreed" : "Budget"} ${formatTonAmount(value)}`;

export const formatGoalLabel = (goal: CampaignGoal | null): string => {
  switch (goal) {
    case "AWARENESS":
      return "Awareness";
    case "TRAFFIC":
      return "Traffic";
    case "SUBSCRIBERS":
      return "Subscribers";
    case "SALES":
      return "Sales";
    default:
      return "Campaign";
  }
};

export const formatRelativeTime = (value: string): string => {
  const date = new Date(value);
  const differenceInMilliseconds = date.getTime() - Date.now();
  const differenceInMinutes = Math.round(differenceInMilliseconds / 60000);

  if (Math.abs(differenceInMinutes) < 60) {
    return relativeTimeFormatter.format(differenceInMinutes, "minute");
  }

  const differenceInHours = Math.round(differenceInMinutes / 60);
  if (Math.abs(differenceInHours) < 24) {
    return relativeTimeFormatter.format(differenceInHours, "hour");
  }

  const differenceInDays = Math.round(differenceInHours / 24);
  if (Math.abs(differenceInDays) < 7) {
    return relativeTimeFormatter.format(differenceInDays, "day");
  }

  return shortDateFormatter.format(date);
};

export const formatDetailTimestamp = (value: string): string =>
  shortDateTimeFormatter.format(new Date(value));

export const getInitials = (value: string): string => {
  const parts = value
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .slice(0, 2);

  if (parts.length === 0) {
    return "AA";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
};
