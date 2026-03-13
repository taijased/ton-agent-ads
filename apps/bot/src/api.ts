import type { Campaign, CreateCampaignInput } from "@repo/types";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

export const createCampaign = async (
  input: CreateCampaignInput
): Promise<Campaign> => {
  const response = await fetch(`${API_BASE_URL}/campaigns`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;

    throw new Error(body?.message ?? `API request failed with status ${response.status}`);
  }

  return (await response.json()) as Campaign;
};
