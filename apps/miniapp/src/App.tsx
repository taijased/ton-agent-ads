import type { Campaign } from "@repo/types";

const apiCampaign: Campaign = {
  id: "demo",
  userId: "demo-user",
  text: "Awaiting API connection",
  budget: 0,
  spent: 0,
  status: "draft",
  createdAt: new Date(0).toISOString()
};

export const App = () => {
  return (
    <main>
      <h1>ton-adagent miniapp</h1>
      <p>UI calls API only. Current placeholder campaign:</p>
      <pre>{JSON.stringify(apiCampaign, null, 2)}</pre>
    </main>
  );
};
