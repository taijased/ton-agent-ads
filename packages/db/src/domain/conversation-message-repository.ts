import type {
  ConversationMessage,
  CreateConversationMessageInput,
  UpdateConversationMessageInput,
} from "@repo/types";

export interface ConversationMessageRepository {
  create(input: CreateConversationMessageInput): Promise<ConversationMessage>;
  listByThreadId(threadId: string): Promise<ConversationMessage[]>;
  getByThreadIdAndTelegramMessageId(
    threadId: string,
    telegramMessageId: string,
  ): Promise<ConversationMessage | undefined>;
  update(
    id: string,
    input: UpdateConversationMessageInput,
  ): Promise<ConversationMessage | undefined>;
}
