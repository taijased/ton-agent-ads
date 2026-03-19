export interface MockChannel {
  id: string;
  username: string;
  title: string;
  description: string;
  subscriberCount: number;
  price: number;
  contacts: Array<{
    type: "username" | "link";
    value: string;
    source: "extracted_username" | "extracted_link";
    isAdsContact: boolean;
  }>;
}

export const mockChannels: MockChannel[] = [
  {
    id: "mock-channel-1",
    username: "@crypto_daily_ru",
    title: "Крипто Дайджест",
    description:
      "Ежедневные новости крипторынка и обзоры проектов. Реклама: @crypto_ads_manager",
    subscriberCount: 45000,
    price: 12,
    contacts: [
      {
        type: "username",
        value: "@crypto_ads_manager",
        source: "extracted_username",
        isAdsContact: true,
      },
    ],
  },
  {
    id: "mock-channel-2",
    username: "@tech_insights_en",
    title: "Tech Insights",
    description:
      "Deep dives into AI, Web3, and developer tools. Promos & collabs welcome.",
    subscriberCount: 82000,
    price: 20,
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
  {
    id: "mock-channel-3",
    username: "@nft_community_ru",
    title: "NFT Сообщество",
    description: "Обсуждаем NFT, коллекции и дропы.",
    subscriberCount: 12000,
    price: 5,
    contacts: [
      {
        type: "username",
        value: "@nft_mod",
        source: "extracted_username",
        isAdsContact: false,
      },
    ],
  },
  {
    id: "mock-channel-4",
    username: "@p2p_traders_chat",
    title: "P2P Трейдеры",
    description: "Чат для P2P трейдеров. Обмен опытом и сигналы.",
    subscriberCount: 28000,
    price: 15,
    contacts: [
      {
        type: "username",
        value: "@p2p_admin",
        source: "extracted_username",
        isAdsContact: false,
      },
    ],
  },
  {
    id: "mock-channel-5",
    username: "@token_launch_en",
    title: "Token Launch Hub",
    description:
      "Everything about token launches, IDOs, and launchpads. Ads: @launch_ads",
    subscriberCount: 55000,
    price: 25,
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
];
