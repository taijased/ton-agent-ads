import type { Campaign } from "@repo/types";

export interface NegotiationTool {
  negotiate(campaign: Campaign): Promise<Campaign>;
}
