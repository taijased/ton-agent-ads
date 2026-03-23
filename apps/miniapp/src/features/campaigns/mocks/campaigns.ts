import type { CampaignSummary } from "../types";

const now = Date.now();

const minutesAgo = (value: number) =>
  new Date(now - value * 60_000).toISOString();

export const buildMockCampaigns = (): CampaignSummary[] => {
  if (typeof window !== "undefined") {
    const scenario = new URLSearchParams(window.location.search).get(
      "campaigns",
    );

    if (scenario === "empty") {
      return [];
    }
  }

  return [
    {
      id: "mock-traffic-blitz",
      title: "TON Launch Traffic Blitz",
      description:
        "Drive founders and growth operators from Telegram placements to the waitlist page with a simple CTA-focused creative.",
      goal: "TRAFFIC",
      status: "Recommended",
      selectedChannelLabel: "Shortlist in progress",
      amountTon: 48,
      amountKind: "budget",
      metricLabel: "Views",
      metricValue: "No data yet",
      previewUrl: null,
      previewKind: "image",
      previewLabel: "Static creative",
      previewTone: "ocean",
      createdAt: minutesAgo(180),
      updatedAt: minutesAgo(64),
      source: "mock",
    },
    {
      id: "mock-subscriber-sprint",
      title: "Subscriber Sprint",
      description:
        "Test creator-led placements in business and crypto growth channels to push warm traffic into the Telegram community.",
      goal: "SUBSCRIBERS",
      status: "In negotiation",
      selectedChannelLabel: "@growthsignals",
      amountTon: 32,
      amountKind: "agreed",
      metricLabel: "Views",
      metricValue: "18.2K",
      previewUrl: null,
      previewKind: "video",
      previewLabel: "Short video",
      previewTone: "night",
      createdAt: minutesAgo(420),
      updatedAt: minutesAgo(22),
      source: "mock",
    },
    {
      id: "mock-awareness-week",
      title: "Awareness Week Push",
      description:
        "Expand product awareness across founder and TON-native audiences before rolling out deal automation in Phase 2.",
      goal: "AWARENESS",
      status: "Awaiting payment",
      selectedChannelLabel: "@founderdispatch",
      amountTon: 65,
      amountKind: "agreed",
      metricLabel: "Views",
      metricValue: "27.4K",
      previewUrl: null,
      previewKind: "image",
      previewLabel: "Brand image",
      previewTone: "sunset",
      createdAt: minutesAgo(1260),
      updatedAt: minutesAgo(11),
      source: "mock",
    },
    {
      id: "mock-published-rollup",
      title: "Partnership Rollup",
      description:
        "Highlight recent partner wins and social proof while the team prepares analytics and attribution surfaces.",
      goal: "AWARENESS",
      status: "Published",
      selectedChannelLabel: "@web3foundershub",
      amountTon: 40,
      amountKind: "agreed",
      metricLabel: "Views",
      metricValue: "128K",
      previewUrl: null,
      previewKind: "image",
      previewLabel: "Story card",
      previewTone: "mint",
      createdAt: minutesAgo(2480),
      updatedAt: minutesAgo(320),
      source: "mock",
    },
    {
      id: "mock-recovery-run",
      title: "Recovery Run",
      description:
        "A failed placement attempt kept here to show status coverage and make the list feel like a real operating surface.",
      goal: "TRAFFIC",
      status: "Failed",
      selectedChannelLabel: "@adsmanager_placeholder",
      amountTon: 20,
      amountKind: "budget",
      metricLabel: "Views",
      metricValue: "No data yet",
      previewUrl: null,
      previewKind: "video",
      previewLabel: "Video placeholder",
      previewTone: "night",
      createdAt: minutesAgo(5120),
      updatedAt: minutesAgo(1440),
      source: "mock",
    },
  ];
};
