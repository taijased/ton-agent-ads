import type {
  ConversationThread,
  CreateConversationThreadInput,
  UpdateConversationThreadInput,
} from "@repo/types";

export interface ConversationThreadRepository {
  create(input: CreateConversationThreadInput): Promise<ConversationThread>;
  getById(id: string): Promise<ConversationThread | undefined>;
  getByCampaignId(campaignId: string): Promise<ConversationThread[]>;
  findByCampaignChannelAdmin(
    campaignId: string,
    channelId: string,
    adminContactId: string,
  ): Promise<ConversationThread | null>;
  getByTelegramChatId(chatId: string): Promise<ConversationThread | undefined>;
  update(
    id: string,
    input: UpdateConversationThreadInput,
  ): Promise<ConversationThread | undefined>;
}
