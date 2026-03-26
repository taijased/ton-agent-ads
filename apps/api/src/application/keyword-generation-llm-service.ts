export class KeywordGenerationLlmService {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generateKeywords(
    description: string,
    language?: string,
  ): Promise<string[]> {
    const fallback = this.buildFallback(description);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const languageInstruction =
        language !== undefined && language.length > 0
          ? `The campaign language is "${language}". Generate keywords in that language AND their English equivalents.`
          : "Generate keywords in the same language as the description.";

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
                  "You are a keyword extraction assistant for Telegram channel search.",
                  "Given a campaign description, extract 3 to 5 highly relevant search keywords.",
                  "Keywords should be useful for finding Telegram channels where this ad would be relevant.",
                  "Include the main topic, industry, and audience terms.",
                  languageInstruction,
                  'Respond in JSON: { "keywords": ["keyword1", "keyword2", ...] }',
                ].join("\n"),
              },
              {
                role: "user",
                content: `Campaign description: ${description}`,
              },
            ],
            max_tokens: 200,
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
        console.warn(`KeywordGeneration LLM error: ${details}`);
        return fallback;
      }

      const content = payload.choices?.[0]?.message?.content?.trim();

      if (content === undefined || content.length === 0) {
        return fallback;
      }

      const parsed = JSON.parse(content) as { keywords?: unknown };

      if (!Array.isArray(parsed.keywords)) {
        return fallback;
      }

      const keywords = (parsed.keywords as unknown[])
        .filter((v): v is string => typeof v === "string")
        .map((k) => k.trim())
        .filter((k) => k.length >= 2);

      if (keywords.length === 0) {
        return fallback;
      }

      return [...new Set(keywords)].slice(0, 5);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.warn(`KeywordGeneration LLM failed: ${message}`);
      return fallback;
    }
  }

  private buildFallback(description: string): string[] {
    return description
      .split(/\s+/)
      .filter((w) => w.length >= 3)
      .slice(0, 5);
  }
}
