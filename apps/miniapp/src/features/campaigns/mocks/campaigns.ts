import { recommendedChannels } from "../../create-campaign/mocks/recommended-channels";
import type { CampaignRecord } from "../types";

const now = Date.now();

const minutesAgo = (value: number) =>
  new Date(now - value * 60_000).toISOString();

export const buildMockCampaigns = (): CampaignRecord[] => {
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
      text: "Drive founders and growth operators from Telegram placements to the waitlist page with a simple CTA-focused creative.",
      theme: "Product launch",
      tags: ["TON", "Growth", "Launch"],
      language: "EN",
      goal: "TRAFFIC",
      targetAudience:
        "Founders and growth operators looking for Telegram-native product launches.",
      media: [],
      budget: "48",
      ctaUrl: "https://adagent.app/waitlist",
      buttonText: "Join waitlist",
      shortlistedChannelIds: [
        recommendedChannels[1]?.id ?? "channel-tech-insights",
        recommendedChannels[2]?.id ?? "channel-growth-signals",
      ],
      status: "Recommended",
      createdAt: minutesAgo(180),
      updatedAt: minutesAgo(64),
      source: "mock",
    },
    {
      id: "mock-subscriber-sprint",
      title: "Subscriber Sprint",
      text: "Test creator-led placements in business and crypto growth channels to push warm traffic into the Telegram community.",
      theme: "Community growth",
      tags: ["Community", "Crypto", "Audience"],
      language: "EN",
      goal: "SUBSCRIBERS",
      targetAudience:
        "Warm Telegram users interested in growth, communities, and product demos.",
      media: [
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      ],
      budget: "32",
      ctaUrl: "https://t.me/adagent_demo",
      buttonText: "Open channel",
      shortlistedChannelIds: [
        recommendedChannels[2]?.id ?? "channel-growth-signals",
      ],
      status: "In negotiation",
      createdAt: minutesAgo(420),
      updatedAt: minutesAgo(22),
      source: "mock",
    },
    {
      id: "mock-awareness-week",
      title: "Awareness Week Push",
      text: "Expand product awareness across founder and TON-native audiences before rolling out deal automation in Phase 2.",
      theme: "Brand awareness",
      tags: ["TON", "Awareness", "Founders"],
      language: "EN",
      goal: "AWARENESS",
      targetAudience:
        "Builder and founder audiences who already know the TON ecosystem.",
      media: [
        "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
      ],
      budget: "65",
      ctaUrl: "https://adagent.app/demo",
      buttonText: "Watch demo",
      shortlistedChannelIds: [
        recommendedChannels[3]?.id ?? "channel-founder-dispatch",
        recommendedChannels[4]?.id ?? "channel-web3-hub",
      ],
      status: "Awaiting payment",
      createdAt: minutesAgo(1260),
      updatedAt: minutesAgo(11),
      source: "mock",
    },
    {
      id: "mock-published-rollup",
      title: "Partnership Rollup",
      text: "Highlight recent partner wins and social proof while the team prepares analytics and attribution surfaces.",
      theme: "Brand awareness",
      tags: ["Partnerships", "Proof", "Web3"],
      language: "EN",
      goal: "AWARENESS",
      targetAudience:
        "Founders and ecosystem teams looking for campaign orchestration tooling.",
      media: [
        "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
      ],
      budget: "40",
      ctaUrl: "https://adagent.app",
      buttonText: "Visit site",
      shortlistedChannelIds: [recommendedChannels[4]?.id ?? "channel-web3-hub"],
      status: "Published",
      createdAt: minutesAgo(2480),
      updatedAt: minutesAgo(320),
      source: "mock",
    },
    {
      id: "mock-recovery-run",
      title: "Recovery Run",
      text: "A failed placement attempt kept here to show status coverage and make the list feel like a real operating surface.",
      theme: "Conversion push",
      tags: ["Traffic", "Recovery", "Test"],
      language: "EN",
      goal: "TRAFFIC",
      targetAudience:
        "Performance-oriented operators testing Telegram ad placements.",
      media: [],
      budget: "20",
      ctaUrl: "",
      buttonText: "",
      shortlistedChannelIds: [
        recommendedChannels[0]?.id ?? "channel-crypto-digest",
      ],
      status: "Failed",
      createdAt: minutesAgo(5120),
      updatedAt: minutesAgo(1440),
      source: "mock",
    },
    {
      id: "mock-fresh-draft",
      title: "Mini App Draft",
      text: "A newly prepared campaign draft waiting for creative polish and channel selection.",
      theme: "Product launch",
      tags: ["Mini App", "TON"],
      language: "EN",
      goal: "TRAFFIC",
      targetAudience: "Builders exploring Telegram-native acquisition flows.",
      media: [],
      budget: "18",
      ctaUrl: "",
      buttonText: "",
      shortlistedChannelIds: [],
      status: "Draft",
      createdAt: minutesAgo(90),
      updatedAt: minutesAgo(45),
      source: "mock",
    },
  ];
};
