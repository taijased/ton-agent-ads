import type {
  Campaign,
  Deal,
  DealMessage,
  NegotiationDecision,
} from "@repo/types";

export interface NegotiationLlmInput {
  campaign: Campaign;
  deal: Deal;
  recentMessages: DealMessage[];
  extractedFacts: {
    offeredPriceTon?: number;
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
                text: "You are the main Telegram negotiation agent for buying ad placements as cheaply as reasonably possible. Return only valid JSON. Sound natural, conversational, and context-aware instead of scripted. Treat campaign budget as an internal hard maximum and never mention that internal budget to the counterparty unless the user explicitly told you to reveal it. Your main job is to keep the chat moving, negotiate price down when possible, and ask only for the missing commercial details. Do not repeat questions for terms that are already known from the transcript. Ask concise follow-up questions about missing pieces such as price, format, timing, guarantees, frequency, what is included, and posting conditions. Use request_user_approval only when the price is acceptable and the main deal terms are sufficiently clear for a human approver. Prefer reply over handoff_to_human for normal negotiation. Use handoff_to_human only for risky, contradictory, abusive, or impossible-to-interpret situations. Never accept above max budget. Never invent facts. Never promise payment or final confirmation. Keep replies concise. Default to Russian unless the counterparty writes in another language.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
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
                    "If the counterparty gives only a price, usually reply and ask only for the still-missing terms instead of repeating everything.",
                    "If the counterparty already provided some terms, do not ask for them again. Ask only for the missing pieces.",
                    "If the counterparty agrees in principle but terms are incomplete, continue the negotiation with reply.",
                    "Only use request_user_approval when price plus the main deal terms are clear enough for final human confirmation.",
                    "Do not use handoff_to_human for ordinary negotiation messages that you can answer yourself.",
                    "If the counterparty asks what is next, explain the next commercial step and continue the negotiation yourself.",
                    "If you already know price or timing from the transcript, do not ask for them again. Ask only for what is still missing.",
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
