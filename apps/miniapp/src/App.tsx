import type { Campaign } from "@repo/types";

const apiCampaign: Campaign = {
  id: "demo",
  userId: "demo-user",
  text: "Awaiting API connection",
  budgetAmount: "0",
  budgetCurrency: "TON",
  theme: null,
  tags: [],
  language: null,
  goal: null,
  ctaUrl: null,
  buttonText: null,
  mediaUrl: null,
  targetAudience: null,
  spent: 0,
  status: "draft",
  createdAt: new Date(0).toISOString(),
};

export const App = () => {
  return (
    <main>
      <h1>Ton-adagent miniapp</h1>
      <p>UI calls API only. Current placeholder campaign:</p>
      <pre>{JSON.stringify(apiCampaign, null, 2)}</pre>
    </main>
  );
};
