export type MiniAppRoute =
  | { name: "campaigns" }
  | { name: "new-campaign" }
  | { name: "edit-campaign"; campaignId: string }
  | { name: "profile" }
  | { name: "campaign-details"; campaignId: string };

export type BottomTabId = "campaigns" | "new-campaign" | "profile";

export const parseRoute = (hash: string): MiniAppRoute => {
  const normalizedHash = hash.trim();
  const path = normalizedHash.startsWith("#/")
    ? normalizedHash.slice(2)
    : normalizedHash.startsWith("#")
      ? normalizedHash.slice(1)
      : "";

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
      return {
        name: "edit-campaign",
        campaignId,
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
      return `#/campaigns/${route.campaignId}/edit`;
    case "profile":
      return "#/profile";
    case "campaign-details":
      return `#/campaigns/${route.campaignId}`;
  }
};
