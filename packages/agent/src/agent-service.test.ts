import assert from "node:assert/strict";
import test from "node:test";
import { AgentService } from "./agent-service.js";

interface CreateDealInput {
  campaignId: string;
  channelId: string;
  price: number;
  status: string;
}

test("AgentService picks the cheapest eligible channel", async () => {
  const service = new AgentService(
    {
      findById: async () => ({
        id: "campaign-1",
        budgetAmount: "10",
        theme: "TON",
        language: "EN",
        goal: "traffic",
      }),
    } as never,
    {
      getChannels: async () => [
        { id: "channel-1", username: "@expensive", price: 11 },
        { id: "channel-2", username: "@winner", price: 6 },
        { id: "channel-3", username: "@other", price: 8 },
      ],
    } as never,
    {
      createDeal: async ({
        campaignId,
        channelId,
        price,
        status,
      }: CreateDealInput) => ({
        id: "deal-1",
        campaignId,
        channelId,
        price,
        status,
      }),
    } as never,
  );

  const result = await service.run("campaign-1");

  assert.equal(result.success, true);
  assert.equal(result.selectedChannel?.id, "channel-2");
  assert.equal(result.deal?.channelId, "channel-2");
  assert.match(result.reason ?? "", /cheapest channel/i);
});

test("AgentService returns a budget failure when no channel fits", async () => {
  const service = new AgentService(
    {
      findById: async () => ({
        id: "campaign-2",
        budgetAmount: "5",
        theme: null,
        language: null,
        goal: null,
      }),
    } as never,
    {
      getChannels: async () => [
        { id: "channel-1", username: "@tooexpensive", price: 9 },
      ],
    } as never,
    {
      createDeal: async () => {
        throw new Error("createDeal should not be called");
      },
    } as never,
  );

  const result = await service.run("campaign-2");

  assert.equal(result.success, false);
  assert.equal(result.error, "No channel matches campaign budget");
  assert.equal(result.evaluation?.[0]?.eligible, false);
});
