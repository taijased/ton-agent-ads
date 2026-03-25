export interface ProfileSummary {
  displayName: string;
  username: string;
  telegramId: string;
  avatarUrl: string | null;
  isTelegramVerified: boolean;
  authMethod: "telegram_init_data" | "telegram_login_widget" | "none";
}

export interface TelegramInitDataUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramInitData {
  user: TelegramInitDataUser;
  auth_date: number;
  hash: string;
  query_id?: string;
  chat_instance?: string;
  chat_type?: string;
}

export interface TelegramAuthRequest {
  initData: string;
}

export interface TelegramAuthResponse {
  token: string;
}
