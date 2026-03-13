import type { CampaignGoal, CampaignLanguage } from "@repo/types";

export type CampaignCreationStep =
  | "text"
  | "budgetAmount"
  | "theme"
  | "language"
  | "goal";

export interface CampaignCreationDraft {
  text?: string;
  budgetAmount?: string;
  budgetCurrency: "TON";
  theme?: string | null;
  language?: CampaignLanguage | null;
  goal?: CampaignGoal | null;
}

export interface CampaignCreationState {
  step: CampaignCreationStep;
  draft: CampaignCreationDraft;
}

export interface ProofCaptureState {
  dealId: string;
}

const creatingCampaignUsers = new Map<string, CampaignCreationState>();
const proofCaptureUsers = new Map<string, ProofCaptureState>();

export const botState = {
  startCampaignCreation(userId: string): void {
    creatingCampaignUsers.set(userId, {
      step: "text",
      draft: {
        budgetCurrency: "TON"
      }
    });
  },

  updateCampaignCreation(
    userId: string,
    state: CampaignCreationState
  ): CampaignCreationState | undefined {
    if (!creatingCampaignUsers.has(userId)) {
      return undefined;
    }

    creatingCampaignUsers.set(userId, state);

    return state;
  },

  getCampaignCreation(userId: string): CampaignCreationState | undefined {
    return creatingCampaignUsers.get(userId);
  },

  startProofCapture(userId: string, dealId: string): void {
    proofCaptureUsers.set(userId, { dealId });
  },

  getProofCapture(userId: string): ProofCaptureState | undefined {
    return proofCaptureUsers.get(userId);
  },

  finishProofCapture(userId: string): void {
    proofCaptureUsers.delete(userId);
  },

  finishCampaignCreation(userId: string): void {
    creatingCampaignUsers.delete(userId);
  },

  isCreatingCampaign(userId: string): boolean {
    return creatingCampaignUsers.has(userId);
  }
};
