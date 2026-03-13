const creatingCampaignUsers = new Set<string>();

export const botState = {
  startCampaignCreation(userId: string): void {
    creatingCampaignUsers.add(userId);
  },

  finishCampaignCreation(userId: string): void {
    creatingCampaignUsers.delete(userId);
  },

  isCreatingCampaign(userId: string): boolean {
    return creatingCampaignUsers.has(userId);
  }
};
