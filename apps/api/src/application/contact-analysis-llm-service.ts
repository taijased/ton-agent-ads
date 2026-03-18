export interface ContactAnalysisResult {
  selectedContact: string | null;
  isRelevant: boolean;
  reason: string;
}

const BLOCKED_CONTACTS = new Set([
  "@wallet",
  "@support",
  "@telegram",
  "@notcoin_bot",
  "@tonkeeper",
  "@fragment",
  "@donate",
  "@premium",
  "@BotFather",
  "@SpamBot",
  "@GDPRbot",
  "@GroupAnonymousBot",
  "@Channel_Bot",
]);

export function isBlockedContact(contact: string): boolean {
  const lower = contact.toLowerCase();
  return (
    BLOCKED_CONTACTS.has(contact) ||
    lower.endsWith("bot") ||
    lower.endsWith("_bot") ||
    lower.startsWith("@wallet") ||
    lower.startsWith("@support")
  );
}

export class ContactAnalysisLlmService {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async analyzeContacts(
    channelUsername: string,
    channelTitle: string,
    description: string,
    extractedContacts: Array<{
      type: string;
      value: string;
      isAdsContact: boolean;
    }>,
    searchKeywords: string[],
  ): Promise<ContactAnalysisResult> {
    const safeContacts = extractedContacts.filter(
      (c) => !isBlockedContact(c.value),
    );

    if (description.trim().length === 0 || safeContacts.length === 0) {
      return {
        selectedContact: null,
        isRelevant: false,
        reason: "no description or contacts",
      };
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content: [
                "You are analyzing a Telegram channel to:",
                "1. Determine if the channel is relevant to the search query",
                "2. Find the best contact for advertising inquiries",
                "",
                "Rules for relevance:",
                `- The user searched for: ${searchKeywords.join(", ")}`,
                "- The channel must be topically related to the search keywords",
                "- Job boards, unrelated news, or off-topic channels are NOT relevant",
                "",
                "Rules for contact selection:",
                "- Pick the contact most likely responsible for advertising/promotion deals",
                "- Prefer contacts explicitly labeled for advertising/promotion/collaboration in ANY language (e.g. ads, promo, реклама, сотрудничество, размещение, reklama, werbung, publicidad, pubblicità, 广告, 廣告, 広告, iklan, reclame, annonce, etc.)",
                `- The channel's own username is ${channelUsername}. Prefer a dedicated ads manager contact over it, but if no other suitable person exists, you MAY select the channel owner's personal username as a fallback`,
                '- Do NOT select bots (usernames ending in "bot" or "Bot")',
                "- Do NOT select product/service accounts, official apps, or support channels (e.g. @wallet, @support, service bots)",
                "- The contact must be a PERSON or advertising manager, not a product or service link",
                "- If only product/service/support contacts exist and no real person contact, return contact as null",
                "- If no suitable contact exists at all, return contact as null",
                "",
                'Respond in JSON only: { "relevant": true|false, "contact": "@username" | null, "reason": "brief explanation" }',
              ].join("\n"),
            },
            {
              role: "user",
              content: [
                `Channel: ${channelTitle} (${channelUsername})`,
                "Description:",
                "---",
                description,
                "---",
                `Available contacts: ${JSON.stringify(safeContacts.map((c) => c.value))}`,
              ].join("\n"),
            },
          ],
          max_tokens: 150,
          response_format: { type: "json_object" },
        }),
      });

      const payload = (await response.json()) as {
        error?: { message?: string };
        choices?: Array<{ message?: { content?: string } }>;
      };

      if (!response.ok) {
        const details = payload.error?.message ?? "Unknown OpenAI error";
        console.warn(`ContactAnalysis LLM error: ${details}`);
        return { selectedContact: null, isRelevant: true, reason: `LLM error: ${details}` };
      }

      const content = payload.choices?.[0]?.message?.content?.trim();

      if (content === undefined || content.length === 0) {
        return { selectedContact: null, isRelevant: true, reason: "LLM returned empty response" };
      }

      const parsed = JSON.parse(content) as {
        relevant?: boolean;
        contact: string | null;
        reason: string;
      };

      const isRelevant = parsed.relevant !== false;

      if (parsed.contact === null) {
        return {
          selectedContact: null,
          isRelevant,
          reason: parsed.reason ?? "LLM found no suitable contact",
        };
      }

      if (isBlockedContact(parsed.contact)) {
        console.warn(
          `ContactAnalysis LLM returned blocked contact "${parsed.contact}", rejecting`,
        );
        return {
          selectedContact: null,
          isRelevant,
          reason: `LLM selected blocked contact: ${parsed.contact}`,
        };
      }

      const contactValues = extractedContacts.map((c) => c.value);
      if (!contactValues.includes(parsed.contact)) {
        console.warn(
          `ContactAnalysis LLM returned "${parsed.contact}" which is not in extracted contacts: ${JSON.stringify(contactValues)}`,
        );
        return {
          selectedContact: null,
          isRelevant,
          reason: "LLM output not in contacts list",
        };
      }

      return {
        selectedContact: parsed.contact,
        isRelevant,
        reason: parsed.reason ?? "LLM selected contact",
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(`ContactAnalysis LLM failed: ${message}`);
      return { selectedContact: null, isRelevant: true, reason: `LLM error: ${message}` };
    }
  }
}
