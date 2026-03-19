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
}

export interface OpenAiHealthCheckResult {
  ok: boolean;
  model: string;
  error?: string;
}

const fallbackDecision = (
  input: NegotiationLlmInput,
  message?: string,
): NegotiationDecision => ({
  action: "handoff_to_human",
  extracted: {
    offeredPriceTon: input.extractedFacts.offeredPriceTon,
  },
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
1. INTEREST CHECK: The outreach message already introduced you and asked if the admin is interested. If the admin's reply shows disinterest or rejection — whether polite ("not interested") or rude/hostile — respond with a polite goodbye like "Спасибо за ваше время! Хорошего дня!" and use action "decline". NEVER use "handoff_to_human" for rejections.
2. PRICE: If the admin is interested, ask how much one advertising post costs. Do NOT ask about anything else yet.
3. FORMAT: After learning the price, ask what format the post should be in. If the admin says "any format" / "whatever" / "без разницы" / "любой", treat that as "any format" and move on.
4. TIMING: After learning the format, ask when the post can be published.
5. APPROVAL: When price, format, and timing are all known, use action "request_user_approval".

RULES:
- Ask only ONE question per message. Never combine multiple questions.
- If the admin provides multiple pieces of information in one message (e.g. price AND format), acknowledge both and ask only for the remaining missing piece.
- Never reveal your budget or maximum price. If the price is too high, say something like "Спасибо! Это немного выше наших планов. Можете ли вы предложить более низкую цену?" without stating a number.
- Do not repeat questions for terms already known from the transcript.
- Sound natural and conversational, not scripted.
- Default to Russian unless the counterparty writes in another language.
- Never invent facts or promise payment or final confirmation.
- Treat the campaign budget as an internal hard maximum — never mention it.
- Use "decline" whenever the admin is not interested, refuses to negotiate, or tells you to go away — regardless of their tone or language (polite or rude). Always include a polite goodbye in replyText.
- All transactions are in TON. If the admin quotes a price in another currency (USD, EUR, rubles, etc.), politely acknowledge the amount and ask them to specify the price in TON. For example: "Спасибо! Мы работаем в TON — подскажите, пожалуйста, сколько это будет в TON?" Always use action "reply" in this case, never "wait".
- Use "handoff_to_human" only when the admin is engaged in negotiation but the situation becomes dangerous (threats, legal issues, scams). Do NOT use it for rejections, even rude ones.
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
                    },
                    summary: "optional string",
                  },
                  decisionRules: [
                    "Phase 1 (interest check): if admin says no/not interested/go away (any tone, including rude or hostile) → decline with polite goodbye. Never handoff_to_human for rejections.",
                    "Phase 2 (price): if price is unknown, ask ONLY about price. Nothing else.",
                    "Phase 3 (format): if price is known but format is unknown, ask ONLY about format.",
                    "Phase 4 (timing): if price and format are known but date is unknown, ask ONLY about publication timing.",
                    "Phase 5 (approval): if price + format + date are all known, use request_user_approval.",
                    "If admin provides info for multiple phases in one message, skip ahead to the next unknown phase.",
                    "If admin asks a question, answer it naturally and then continue with the current phase.",
                    "Never combine questions about different terms in one message.",
                    "If admin's price is too high, politely ask for a lower price WITHOUT revealing your budget number.",
                    "If admin firmly refuses to lower the price, politely decline with a goodbye.",
                    "If admin provides price in a non-TON currency (dollars, rubles, euros, etc.), acknowledge it and ask to specify the price in TON. Use action 'reply', never 'wait'.",
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
                replyText: { type: "string" },
                extracted: {
                  type: "object",
                  properties: {
                    offeredPriceTon: { type: "number" },
                    format: { type: "string" },
                    dateText: { type: "string" },
                  },
                  required: [],
                  additionalProperties: false,
                },
                summary: { type: "string" },
              },
              required: ["action", "extracted"],
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
              : input.extractedFacts.offeredPriceTon,
          format:
            typeof parsed.extracted?.format === "string"
              ? parsed.extracted.format
              : undefined,
          dateText:
            typeof parsed.extracted?.dateText === "string"
              ? parsed.extracted.dateText
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
    };

    if (!response.ok) {
      const details = payload.error?.message ?? "Unknown OpenAI error";
      throw new Error(
        `OpenAI request failed with status ${response.status}: ${details}`,
      );
    }

    const content = payload.output_text?.trim();

    if (content === undefined || content.length === 0) {
      throw new Error("LLM returned an empty response");
    }

    return JSON.parse(content) as unknown;
  }
}
