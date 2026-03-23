export interface ChannelSearchRequest {
  keywords: string[];
}

export interface ResolveChannelByUsernameRequest {
  username: string;
}

export interface ResolveChannelByUsernameResult {
  id: string;
  title: string;
  username: string;
  description: string | null;
  avatarUrl: string | null;
  subscriberCount: number | null;
}

export interface ChannelSearchResultContact {
  type: "username" | "link";
  value: string;
  isAdsContact: boolean;
}

export interface ChannelSearchResultItem {
  id: string;
  title: string;
  username: string;
  subscriberCount: number | null;
  description: string | null;
  contact: ChannelSearchResultContact | null;
}

export interface ChannelSearchResponse {
  results: ChannelSearchResultItem[];
  totalFound: number;
  keywords: string[];
  expandedKeywords: string[];
}
