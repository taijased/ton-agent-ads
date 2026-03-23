export interface ProfileSummary {
  displayName: string;
  username: string;
  telegramId: string;
  avatarUrl: string | null;
  walletLabel: string;
  walletConnected: boolean;
  isTelegramVerified: boolean;
}
