export interface KeywordExpansionResult {
  original: string[];
  expanded: string[];
  all: string[];
}

export class KeywordExpansionLlmService {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async expandKeywords(keywords: string[]): Promise<KeywordExpansionResult> {
    const fallback: KeywordExpansionResult = {
      original: keywords,
      expanded: [],
      all: keywords,
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
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
                  "You are a keyword expansion assistant for Telegram channel search.",
                  "Given search keywords, generate 15 to 20 closely related terms that would help find more relevant channels.",
                  "Include synonyms, abbreviations, related concepts, and translations if keywords are non-English.",
                  "Keep expanded keywords in the same language(s) as input, plus English equivalents if input is non-English.",
                  "Return ONLY closely related terms — do not add generic or unrelated words.",
                  "Aim for exactly 15-20 terms. More is better than fewer.",
                  'Respond in JSON: { "expanded": ["keyword1", "keyword2", ...] }',
                ].join("\n"),
              },
              {
                role: "user",
                content: `Keywords: ${keywords.join(", ")}`,
              },
            ],
            max_tokens: 400,
            response_format: { type: "json_object" },
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeout);

      const payload = (await response.json()) as {
        error?: { message?: string };
        choices?: Array<{ message?: { content?: string } }>;
      };

      if (!response.ok) {
        const details = payload.error?.message ?? "Unknown OpenAI error";
        console.warn(`KeywordExpansion LLM error: ${details}`);
        return fallback;
      }

      const content = payload.choices?.[0]?.message?.content?.trim();

      if (content === undefined || content.length === 0) {
        return fallback;
      }

      const parsed = JSON.parse(content) as { expanded?: unknown };

      if (!Array.isArray(parsed.expanded)) {
        return fallback;
      }

      const originalSet = new Set(keywords.map((k) => k.toLowerCase().trim()));

      const processed = (parsed.expanded as unknown[])
        .filter((v): v is string => typeof v === "string")
        .map((k) => k.toLowerCase().trim())
        .filter((k) => k.length >= 2)
        .filter((k) => !originalSet.has(k));

      const dedupedExpanded = [...new Set(processed)].slice(0, 20);

      return {
        original: keywords,
        expanded: dedupedExpanded,
        all: [...keywords, ...dedupedExpanded],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.warn(`KeywordExpansion LLM failed: ${message}`);
      return fallback;
    }
  }
}
