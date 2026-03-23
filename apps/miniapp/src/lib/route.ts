export type MiniAppRoute =
  | { name: "campaigns" }
  | { name: "new-campaign" }
  | { name: "edit-campaign"; campaignId: string; step?: string }
  | { name: "profile" }
  | { name: "campaign-details"; campaignId: string };

export type BottomTabId = "campaigns" | "new-campaign" | "profile";

const decodeRouteValue = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const parseRoute = (hash: string): MiniAppRoute => {
  const normalizedHash = hash.trim();
  const rawPath = normalizedHash.startsWith("#/")
    ? normalizedHash.slice(2)
    : normalizedHash.startsWith("#")
      ? normalizedHash.slice(1)
      : "";
  const normalizedPath = decodeRouteValue(rawPath);
  const [path, query = ""] = normalizedPath.split("?");

  const editStepMatch = path.match(/^campaigns\/(.+?)\/edit\/([^/]+)$/);

  if (editStepMatch) {
    const [, rawCampaignId, rawStep] = editStepMatch;
    const campaignId = rawCampaignId?.trim();
    const step = rawStep?.trim();

    if (campaignId && step) {
      return {
        name: "edit-campaign",
        campaignId,
        step,
      };
    }
  }

  if (path.length === 0 || path === "campaigns") {
    return { name: "campaigns" };
  }

  if (path === "campaigns/new") {
    return { name: "new-campaign" };
  }

  if (path.startsWith("campaigns/") && path.endsWith("/edit")) {
    const campaignId = path
      .slice("campaigns/".length, path.length - "/edit".length)
      .trim();

    if (campaignId.length > 0) {
      const step = new URLSearchParams(query).get("step")?.trim() || undefined;

      return {
        name: "edit-campaign",
        campaignId,
        step,
      };
    }
  }

  if (path === "profile") {
    return { name: "profile" };
  }

  if (path.startsWith("campaigns/")) {
    const campaignId = path.slice("campaigns/".length).trim();

    if (campaignId.length > 0) {
      return {
        name: "campaign-details",
        campaignId,
      };
    }
  }

  return { name: "campaigns" };
};

export const toHash = (route: MiniAppRoute): string => {
  switch (route.name) {
    case "campaigns":
      return "#/campaigns";
    case "new-campaign":
      return "#/campaigns/new";
    case "edit-campaign":
      return route.step?.trim().length
        ? `#/campaigns/${encodeURIComponent(route.campaignId)}/edit/${encodeURIComponent(route.step)}`
        : `#/campaigns/${encodeURIComponent(route.campaignId)}/edit`;
    case "profile":
      return "#/profile";
    case "campaign-details":
      return `#/campaigns/${encodeURIComponent(route.campaignId)}`;
  }
};
