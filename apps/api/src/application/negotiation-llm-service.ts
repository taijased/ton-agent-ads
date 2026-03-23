import type {
  Campaign,
  Deal,
  DealMessage,
  NegotiationDecision,
} from "@repo/types";

export interface NegotiationLlmInput {
  campaign: Campaign;
  deal: Deal;
  channelTitle: string;
  recentMessages: DealMessage[];
  extractedFacts: {
    offeredPriceTon?: number;
    mentionedNonTonCurrency?: boolean;
    rawAmount?: number;
  };
  lastInboundMessage: string;
  knownTerms: {
    offeredPriceTon?: number;
    format?: string;
    dateText?: string;
    wallet?: string;
  };
  missingTerms: string[];
  convertedPriceTon?: number;
  conversionNote?: string;
}

export interface OpenAiHealthCheckResult {
  ok: boolean;
  model: string;
  error?: string;
}

const fallbackDecision = (
  _input: NegotiationLlmInput,
  message?: string,
): NegotiationDecision => ({
  action: "wait",
  extracted: {},
  summary: message ?? "Negotiation requires manual review",
});

export class NegotiationLlmService {
  private readonly env = {
    OPEN_AI_TOKEN: process.env.OPEN_AI_TOKEN ?? "",
    OPEN_AI_MODEL: process.env.OPEN_AI_MODEL ?? "",
  };

  public async checkHealth(): Promise<OpenAiHealthCheckResult> {
    const token = this.env.OPEN_AI_TOKEN.trim();
    const model = this.env.OPEN_AI_MODEL.trim();

    if (token.length === 0) {
      return {
        ok: false,
        model,
        error: "OPEN_AI_TOKEN is required",
      };
    }

    if (model.length === 0) {
      return {
        ok: false,
        model,
        error: "OPEN_AI_MODEL is required",
      };
    }

    try {
      await this.requestJson({
        model,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: 'Reply with valid JSON only: {"ok":true}',
              },
            ],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: "Health check" }],
          },
        ],
        max_output_tokens: 60,
        text: {
          format: {
            type: "json_schema",
            name: "openai_health_check",
            schema: {
              type: "object",
              properties: {
                ok: { type: "boolean" },
              },
              required: ["ok"],
              additionalProperties: false,
            },
          },
        },
      });

      return { ok: true, model };
    } catch (error: unknown) {
      return {
        ok: false,
        model,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  public async decide(
    input: NegotiationLlmInput,
  ): Promise<NegotiationDecision> {
    if (this.env.OPEN_AI_TOKEN.trim().length === 0) {
      throw new Error("OPEN_AI_TOKEN is required for negotiation LLM service");
    }

    const model = this.env.OPEN_AI_MODEL.trim();

    if (model.length === 0) {
      throw new Error("OPEN_AI_MODEL is required for negotiation LLM service");
    }

    try {
      const parsed = (await this.requestJson({
        model,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: `You are Lumi Lapulio, an advertising manager negotiating ad placements in Telegram channels. You are polite, professional, and patient. You never pressure or annoy the counterparty.

CONVERSATION PHASES — follow this order strictly:
1. INTEREST CHECK: The outreach message already showed the admin the ad post and asked if they are interested. If the admin's reply shows disinterest or rejection — whether polite ("not interested") or rude/hostile — respond with a polite goodbye and use action "decline". NEVER use "handoff_to_human" for rejections.
2. PRICE: If the admin is interested, ask how much one advertising post costs. Do NOT ask about anything else yet.
3. TIMING: After learning the price, ask when the post can be published. If the admin says "anytime" / "в любое время" / "когда угодно" / "any time", accept it immediately — do NOT re-ask. Treat it as "flexible / any time".
4. WALLET: After learning the timing, ask for their TON wallet address for payment.
5. APPROVAL: When price, timing, and wallet are all known, use action "request_user_approval".

RULES:
- Ask only ONE question per message. Never combine multiple questions.
- If the admin provides multiple pieces of information in one message (e.g. price AND timing), acknowledge both and ask only for the remaining missing piece.
- Never reveal your budget or maximum price. If the price is too high, politely ask for a lower price without stating a number.
- NEVER repeat a question that has already been answered in the conversation history. Check knownTerms and recentMessages before asking.
- ALWAYS respond in the same language the admin uses. If they write in Russian, reply in Russian. If they write in English, reply in English. Do not default to any specific language.
- Sound natural and conversational, not scripted.
- Never invent facts or promise payment or final confirmation.
- Treat the campaign budget as an internal hard maximum — never mention it.
- Use "decline" whenever the admin is not interested, refuses to negotiate, or tells you to go away — regardless of their tone. Always include a polite goodbye in replyText.
- All transactions are in TON. If the admin quotes a price in another currency, extract the amount and currency. The system auto-converts to TON. If convertedPriceTon is provided in the input, acknowledge the original amount and mention the TON equivalent (e.g. "50 USD ≈ 1.8 TON"), then continue to the next phase. If no convertedPriceTon is provided but mentionedNonTonCurrency is true, politely ask the admin to specify in TON. Set extracted.mentionedNonTonCurrency to true.
- Use "handoff_to_human" only for dangerous situations (threats, legal issues, scams). Do NOT use it for rejections.
- Keep replies concise — 1-3 sentences maximum.`,
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  channelTitle: input.channelTitle,
                  campaignTheme: input.campaign.theme,
                  campaignLanguage: input.campaign.language,
                  campaignGoal: input.campaign.goal,
                  maxBudgetTon: Number(input.campaign.budgetAmount),
                  internalRule:
                    "maxBudgetTon is internal only; do not disclose it to the admin",
                  dealStatus: input.deal.status,
                  extractedFacts: input.extractedFacts,
                  knownTerms: input.knownTerms,
                  missingTerms: input.missingTerms,
                  convertedPriceTon: input.convertedPriceTon,
                  conversionNote: input.conversionNote,
                  lastInboundMessage: input.lastInboundMessage,
                  recentMessages: input.recentMessages
                    .slice(-8)
                    .map((message) => ({
                      direction: message.direction,
                      senderType: message.senderType,
                      text: message.text,
                    })),
                  expectedJsonShape: {
                    action:
                      "reply | request_user_approval | decline | handoff_to_human | wait",
                    replyText: "optional string",
                    extracted: {
                      offeredPriceTon: "optional number",
                      format: "optional string",
                      dateText: "optional string",
                      wallet: "optional string — TON wallet address",
                    },
                    summary: "optional string",
                  },
                  decisionRules: [
                    "Phase 1 (interest check): if admin says no/not interested/go away (any tone, including rude or hostile) → decline with polite goodbye. Never handoff_to_human for rejections.",
                    "Phase 2 (price): if price is unknown, ask ONLY about price. Nothing else.",
                    "Phase 3 (timing): if price is known but date is unknown, ask ONLY about publication timing. If admin says 'anytime'/'в любое время'/'когда угодно', accept immediately and move to wallet.",
                    "Phase 4 (wallet): if price and date are known but wallet is unknown, ask for TON wallet address.",
                    "Phase 5 (approval): if price + date + wallet are all known, use request_user_approval.",
                    "If admin provides info for multiple phases in one message, skip ahead to the next unknown phase.",
                    "If admin asks a question, answer it naturally and then continue with the current phase.",
                    "Never combine questions about different terms in one message.",
                    "NEVER re-ask a question that was already answered. Check knownTerms carefully.",
                    "If admin's price is too high, politely ask for a lower price WITHOUT revealing your budget number.",
                    "If admin firmly refuses to lower the price, politely decline with a goodbye.",
                    "If admin provides price in a non-TON currency and convertedPriceTon is provided, acknowledge the original amount and the TON equivalent from conversionNote, then continue to the next missing term. Use the convertedPriceTon as the offeredPriceTon.",
                    "If admin provides price in a non-TON currency and convertedPriceTon is NOT provided, politely ask them to specify in TON. Use action 'reply', never 'wait'.",
                    "Always reply in the same language the admin used in their last message.",
                  ],
                }),
              },
            ],
          },
        ],
        max_output_tokens: 400,
        text: {
          format: {
            type: "json_schema",
            name: "negotiation_decision",
            schema: {
              type: "object",
              properties: {
                action: {
                  type: "string",
                  enum: [
                    "reply",
                    "request_user_approval",
                    "decline",
                    "handoff_to_human",
                    "wait",
                  ],
                },
                replyText: { type: ["string", "null"] },
                extracted: {
                  type: "object",
                  properties: {
                    offeredPriceTon: { type: ["number", "null"] },
                    format: { type: ["string", "null"] },
                    dateText: { type: ["string", "null"] },
                    wallet: { type: ["string", "null"] },
                    mentionedNonTonCurrency: { type: ["boolean", "null"] },
                  },
                  required: ["offeredPriceTon", "format", "dateText", "wallet", "mentionedNonTonCurrency"],
                  additionalProperties: false,
                },
                summary: { type: ["string", "null"] },
              },
              required: ["action", "extracted", "replyText", "summary"],
              additionalProperties: false,
            },
          },
        },
      })) as Partial<NegotiationDecision>;

      if (
        parsed.action !== "reply" &&
        parsed.action !== "request_user_approval" &&
        parsed.action !== "decline" &&
        parsed.action !== "handoff_to_human" &&
        parsed.action !== "wait"
      ) {
        return fallbackDecision(input, "LLM returned unsupported action");
      }

      return {
        action: parsed.action,
        replyText:
          typeof parsed.replyText === "string" ? parsed.replyText : undefined,
        extracted: {
          offeredPriceTon:
            typeof parsed.extracted?.offeredPriceTon === "number"
              ? parsed.extracted.offeredPriceTon
              : undefined,
          format:
            typeof parsed.extracted?.format === "string"
              ? parsed.extracted.format
              : undefined,
          dateText:
            typeof parsed.extracted?.dateText === "string"
              ? parsed.extracted.dateText
              : undefined,
          wallet:
            typeof (parsed.extracted as Record<string, unknown>)?.wallet ===
            "string"
              ? ((parsed.extracted as Record<string, unknown>).wallet as string)
              : undefined,
          mentionedNonTonCurrency:
            typeof (parsed.extracted as Record<string, unknown>)
              ?.mentionedNonTonCurrency === "boolean"
              ? ((parsed.extracted as Record<string, unknown>)
                  .mentionedNonTonCurrency as boolean)
              : undefined,
        },
        summary:
          typeof parsed.summary === "string" ? parsed.summary : undefined,
      };
    } catch (error: unknown) {
      return fallbackDecision(
        input,
        error instanceof Error
          ? error.message
          : "LLM returned invalid response",
      );
    }
  }

  private async requestJson(body: Record<string, unknown>): Promise<unknown> {
    const maxRetries = 3;
    const backoffMs = [0, 1000, 3000];

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs[attempt]));
      }

      try {
        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${this.env.OPEN_AI_TOKEN}`,
          },
          body: JSON.stringify(body),
        });

        const payload = (await response.json()) as {
          error?: { message?: string; type?: string; code?: string };
          output_text?: string;
          output?: Array<{ content?: Array<{ text?: string }> }>;
        };

        if (!response.ok) {
          const details = payload.error?.message ?? "Unknown OpenAI error";
          lastError = new Error(
            `OpenAI request failed with status ${response.status}: ${details}`,
          );
          continue; // retry on HTTP errors
        }

        console.info(JSON.stringify({
          source: "negotiation-llm-service",
          msg: "OpenAI raw response keys",
          keys: Object.keys(payload),
          hasOutputText: payload.output_text !== undefined,
          outputText: payload.output_text?.slice(0, 200),
          outputLength: payload.output?.length,
          firstOutputContent: payload.output?.[0]?.content?.[0]?.text?.slice(0, 200),
        }));

        const content = (
          payload.output_text ??
          payload.output?.[0]?.content?.[0]?.text
        )?.trim();

        if (content === undefined || content.length === 0) {
          throw new Error("LLM returned an empty response"); // NOT retried
        }

        return JSON.parse(content) as unknown;
      } catch (error: unknown) {
        if (error instanceof SyntaxError) {
          throw error; // JSON parse error — NOT retried
        }
        lastError = error instanceof Error ? error : new Error(String(error));
        // Network errors, timeouts → retry
      }
    }

    throw lastError ?? new Error("LLM request failed after retries");
  }
}
