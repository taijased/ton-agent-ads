import type { CampaignGoal, CampaignLanguage } from "@repo/types";
import type { TestSession } from "./test-session.js";

export type CampaignCreationStep =
  | "text"
  | "budgetAmount"
  | "theme"
  | "language"
  | "goal"
  | "targetChannel";

export interface CampaignCreationDraft {
  campaignId?: string;
  text?: string;
  budgetAmount?: string;
  budgetCurrency: "TON";
  theme?: string | null;
  language?: CampaignLanguage | null;
  goal?: CampaignGoal | null;
  targetChannelReference?: string;
}

export interface CampaignCreationState {
  step: CampaignCreationStep;
  draft: CampaignCreationDraft;
}

export interface ProofCaptureState {
  dealId: string;
}

export interface ApprovalCounterState {
  approvalRequestId: string;
}

export interface DealContextState {
  channelTitle: string;
  channelUsername: string;
  contactValue: string | null;
}

export interface TestModeState {
  session: TestSession;
}

const creatingCampaignUsers = new Map<string, CampaignCreationState>();
const proofCaptureUsers = new Map<string, ProofCaptureState>();
const approvalCounterUsers = new Map<string, ApprovalCounterState>();
const dealContexts = new Map<string, DealContextState>();
const testModeUsers = new Map<string, TestModeState>();

export const botState = {
  startCampaignCreation(userId: string): void {
    creatingCampaignUsers.set(userId, {
      step: "text",
      draft: {
        budgetCurrency: "TON",
      },
    });
  },

  updateCampaignCreation(
    userId: string,
    state: CampaignCreationState,
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

  startApprovalCounter(userId: string, approvalRequestId: string): void {
    approvalCounterUsers.set(userId, { approvalRequestId });
  },

  getApprovalCounter(userId: string): ApprovalCounterState | undefined {
    return approvalCounterUsers.get(userId);
  },

  setDealContext(dealId: string, context: DealContextState): void {
    dealContexts.set(dealId, context);
  },

  getDealContext(dealId: string): DealContextState | undefined {
    return dealContexts.get(dealId);
  },

  clearDealContext(dealId: string): void {
    dealContexts.delete(dealId);
  },

  finishProofCapture(userId: string): void {
    proofCaptureUsers.delete(userId);
  },

  finishApprovalCounter(userId: string): void {
    approvalCounterUsers.delete(userId);
  },

  finishCampaignCreation(userId: string): void {
    creatingCampaignUsers.delete(userId);
  },

  isCreatingCampaign(userId: string): boolean {
    return creatingCampaignUsers.has(userId);
  },

  startTestMode(userId: string, session: TestSession): void {
    testModeUsers.set(userId, { session });
  },

  getTestMode(userId: string): TestModeState | undefined {
    return testModeUsers.get(userId);
  },

  finishTestMode(userId: string): void {
    testModeUsers.delete(userId);
  },

  isInTestMode(userId: string): boolean {
    return testModeUsers.has(userId);
  },
};
