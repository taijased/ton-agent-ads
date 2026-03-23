import type { RecommendedChannel } from "../types";

export const recommendedChannels: RecommendedChannel[] = [
  {
    id: "channel-crypto-digest",
    name: "Crypto Digest",
    username: "@crypto_daily_ru",
    avatar: null,
    description:
      "Daily crypto market news, project breakdowns, and ad slots for launches.",
    tags: ["Crypto", "TON", "News"],
    avgViews: 45000,
    expectedPrice: 12,
  },
  {
    id: "channel-tech-insights",
    name: "Tech Insights",
    username: "@tech_insights_en",
    avatar: null,
    description:
      "AI, developer tools, and web3 deep dives for an English-speaking founder audience.",
    tags: ["AI", "Web3", "Founders"],
    avgViews: 82000,
    expectedPrice: 20,
  },
  {
    id: "channel-growth-signals",
    name: "Growth Signals",
    username: "@growthsignals",
    avatar: null,
    description:
      "Performance marketing, funnels, and launch tactics for operators.",
    tags: ["Growth", "Startups", "Traffic"],
    avgViews: 36000,
    expectedPrice: 15,
  },
  {
    id: "channel-founder-dispatch",
    name: "Founder Dispatch",
    username: "@founderdispatch",
    avatar: null,
    description:
      "Founder stories, product launches, and partnership announcements.",
    tags: ["Founders", "Launch", "Startups"],
    avgViews: 28000,
    expectedPrice: 14,
  },
  {
    id: "channel-web3-hub",
    name: "Web3 Founders Hub",
    username: "@web3foundershub",
    avatar: null,
    description:
      "A curated channel for builders, communities, and ecosystem operators in web3.",
    tags: ["Web3", "Community", "TON"],
    avgViews: 61000,
    expectedPrice: 24,
  },
  {
    id: "channel-ton-builders",
    name: "TON Builders",
    username: "@tonbuilders",
    avatar: null,
    description:
      "TON-native product launches, mini app updates, and builder ecosystem news.",
    tags: ["TON", "Mini App", "Builders"],
    avgViews: 19000,
    expectedPrice: 9,
  },
];
