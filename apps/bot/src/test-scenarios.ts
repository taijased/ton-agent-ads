export interface TestScenario {
  name: string;
  description: string;
  campaign: {
    userId: string;
    text: string;
    budgetAmount: string;
    budgetCurrency: "TON";
    theme: string | null;
    language: "RU" | "EN" | "OTHER";
    goal: "AWARENESS" | "TRAFFIC" | "SUBSCRIBERS" | "SALES";
  };
  channel: {
    id: string;
    username: string;
    title: string;
    description: string | null;
    price: number;
    avgViews: number;
    contacts: Array<{
      type: "username" | "link";
      value: string;
      source: "extracted_username" | "extracted_link";
      isAdsContact: boolean;
    }>;
  };
  dealPrice: number;
}

export const testScenarios: TestScenario[] = [
  {
    name: "Budget Crypto Channel (RU)",
    description:
      "A crypto channel with 15K avg views. Budget 15 TON, price 12 TON — within budget. Tests normal negotiation flow.",
    campaign: {
      userId: "",
      text: "Запускаем новый DeFi протокол на TON — лучшие условия стейкинга для ранних участников!",
      budgetAmount: "15",
      budgetCurrency: "TON",
      theme: "crypto",
      language: "RU",
      goal: "AWARENESS",
    },
    channel: {
      id: "test-channel-1",
      username: "@crypto_daily_ru",
      title: "Крипто Дайджест",
      description:
        "Ежедневные новости крипторынка и обзоры проектов. Реклама: @crypto_ads_manager",
      price: 12,
      avgViews: 15000,
      contacts: [
        {
          type: "username",
          value: "@crypto_ads_manager",
          source: "extracted_username",
          isAdsContact: true,
        },
      ],
    },
    dealPrice: 12,
  },
  {
    name: "Expensive Tech Channel (EN)",
    description:
      "A tech channel priced at 20 TON but budget is only 8 TON. Tests over-budget negotiation and price pushback.",
    campaign: {
      userId: "",
      text: "Build AI agents with our new SDK — 10x faster development, full TypeScript support.",
      budgetAmount: "8",
      budgetCurrency: "TON",
      theme: "technology",
      language: "EN",
      goal: "TRAFFIC",
    },
    channel: {
      id: "test-channel-2",
      username: "@tech_insights_en",
      title: "Tech Insights",
      description:
        "Deep dives into AI, Web3, and developer tools. Promos & collabs welcome.",
      price: 20,
      avgViews: 30000,
      contacts: [
        {
          type: "username",
          value: "@tech_admin",
          source: "extracted_username",
          isAdsContact: false,
        },
        {
          type: "link",
          value: "https://t.me/tech_ads_bot",
          source: "extracted_link",
          isAdsContact: true,
        },
      ],
    },
    dealPrice: 20,
  },
  {
    name: "Cheap Small Channel (RU)",
    description:
      "A small channel at 5 TON with a 50 TON budget. Tests easy approval scenario where price is well within budget.",
    campaign: {
      userId: "",
      text: "Новый NFT маркетплейс на TON — минтьте и торгуйте без комиссий первый месяц!",
      budgetAmount: "50",
      budgetCurrency: "TON",
      theme: "nft",
      language: "RU",
      goal: "SUBSCRIBERS",
    },
    channel: {
      id: "test-channel-3",
      username: "@nft_community_ru",
      title: "NFT Сообщество",
      description: "Обсуждаем NFT, коллекции и дропы.",
      price: 5,
      avgViews: 2000,
      contacts: [
        {
          type: "username",
          value: "@nft_mod",
          source: "extracted_username",
          isAdsContact: false,
        },
      ],
    },
    dealPrice: 5,
  },
  {
    name: "No Ads Contact Channel (RU)",
    description:
      "Channel contact extracted from username, no explicit ads contact. Tests contact selection fallback.",
    campaign: {
      userId: "",
      text: "Заработай на TON — наш бот автоматизирует P2P арбитраж. Первые 100 пользователей бесплатно!",
      budgetAmount: "20",
      budgetCurrency: "TON",
      theme: "finance",
      language: "RU",
      goal: "SALES",
    },
    channel: {
      id: "test-channel-4",
      username: "@p2p_traders_chat",
      title: "P2P Трейдеры",
      description: "Чат для P2P трейдеров. Обмен опытом и сигналы.",
      price: 15,
      avgViews: 8000,
      contacts: [
        {
          type: "username",
          value: "@p2p_admin",
          source: "extracted_username",
          isAdsContact: false,
        },
      ],
    },
    dealPrice: 15,
  },
  {
    name: "Multi-contact Channel (EN)",
    description:
      "Channel with multiple contacts and high price (25 TON, budget 30 TON). Tests multi-contact selection and close-to-budget negotiation.",
    campaign: {
      userId: "",
      text: "Launch your token on TON — our launchpad handles smart contracts, liquidity, and marketing.",
      budgetAmount: "30",
      budgetCurrency: "TON",
      theme: "crypto",
      language: "EN",
      goal: "AWARENESS",
    },
    channel: {
      id: "test-channel-5",
      username: "@token_launch_en",
      title: "Token Launch Hub",
      description:
        "Everything about token launches, IDOs, and launchpads. Ads: @launch_ads",
      price: 25,
      avgViews: 20000,
      contacts: [
        {
          type: "username",
          value: "@launch_ads",
          source: "extracted_username",
          isAdsContact: true,
        },
        {
          type: "username",
          value: "@launch_mod",
          source: "extracted_username",
          isAdsContact: false,
        },
        {
          type: "link",
          value: "https://t.me/launch_promo_bot",
          source: "extracted_link",
          isAdsContact: true,
        },
      ],
    },
    dealPrice: 25,
  },
];
