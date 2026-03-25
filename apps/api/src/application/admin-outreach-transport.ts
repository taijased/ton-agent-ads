export interface SendIntroMessageInput {
  campaignId: string;
  threadId: string;
  adminHandle: string;
  text: string;
}

export interface SendIntroMessageResult {
  telegramMessageId: string | null;
  telegramChatId: string | null;
}

export interface AdminOutreachTransport {
  sendIntroMessage(
    input: SendIntroMessageInput,
  ): Promise<SendIntroMessageResult>;
}

export class DeterministicAdminOutreachTransport implements AdminOutreachTransport {
  public async sendIntroMessage(
    input: SendIntroMessageInput,
  ): Promise<SendIntroMessageResult> {
    const normalizedHandle = input.adminHandle.replace(/^@/, "") || "admin";

    return {
      telegramMessageId: `stub-msg-${input.threadId}`,
      telegramChatId: `stub-chat-${normalizedHandle}`,
    };
  }
}
