import type {
  AgentRunResult,
  Campaign,
  CreateCampaignInput,
  Deal,
  DealStatus
} from "@repo/types";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

const parseErrorMessage = async (response: Response): Promise<string> => {
  const body = (await response.json().catch(() => null)) as
    | { message?: string; error?: string; reason?: string }
    | null;

  return (
    body?.message ??
    body?.reason ??
    body?.error ??
    `API request failed with status ${response.status}`
  );
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as T;
};

export const createCampaign = async (
  input: CreateCampaignInput
): Promise<Campaign> => {
  return request<Campaign>("/campaigns", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(input)
  });
};

export const runAgent = async (campaignId: string): Promise<AgentRunResult> => {
  return request<AgentRunResult>("/agent/run", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ campaignId })
  });
};

export const approveDeal = async (dealId: string): Promise<Deal> => {
  return request<Deal>(`/deals/${dealId}/approve`, {
    method: "POST"
  });
};

export const rejectDeal = async (dealId: string): Promise<Deal> => {
  return request<Deal>(`/deals/${dealId}/reject`, {
    method: "POST"
  });
};

export const updateDealStatus = async (
  dealId: string,
  input: {
    status: DealStatus;
    proofText?: string | null;
    proofUrl?: string | null;
  }
): Promise<Deal> => {
  return request<Deal>(`/deals/${dealId}/status`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(input)
  });
};
