import type {
  GeneratePostInput,
  PostGenerationOutcome,
  CampaignGoal,
} from "@repo/types";

const goalSystemInstruction = (goal: CampaignGoal): string => {
  switch (goal) {
    case "AWARENESS":
      return "Write an engaging, attention-grabbing post that raises awareness about the topic.";
    case "TRAFFIC":
      return "Write a post with a strong call-to-action to click a link and drive traffic.";
    case "SUBSCRIBERS":
      return "Write a post that encourages joining/subscribing to the channel or community.";
    case "SALES":
      return "Write a post that promotes a product/service with urgency to drive purchases.";
  }
};

const languageInstruction = (language: GeneratePostInput["language"]): string => {
  switch (language) {
    case "RU":
      return "Write the post in Russian.";
    case "EN":
      return "Write the post in English.";
    case "OTHER":
      return "Write the post in the same language as the description provided.";
  }
};

export class PostGenerationLlmService {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generate(input: GeneratePostInput): Promise<PostGenerationOutcome> {
    const truncatedDescription = input.description.slice(0, 2000);

    const systemPrompt = [
      goalSystemInstruction(input.goal),
      languageInstruction(input.language),
      "Keep the post under 300 characters.",
      "Include exactly 2-3 relevant hashtags.",
      "Do not include explicit, offensive, or misleading content.",
      'Respond in JSON: { "postText": "...", "hashtags": ["#tag1", "#tag2"] }',
    ].join("\n");

    const userContent: Record<string, string> = {
      description: truncatedDescription,
    };
    if (input.channelDescription !== undefined) {
      userContent.channelDescription = input.channelDescription;
    }
    if (input.targetAudience !== undefined) {
      userContent.targetAudience = input.targetAudience;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

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
                content: systemPrompt,
              },
              {
                role: "user",
                content: JSON.stringify(userContent),
              },
            ],
            max_tokens: 500,
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
        console.warn(`PostGeneration LLM error: ${details}`);
        return { ok: false, error: details };
      }

      const content = payload.choices?.[0]?.message?.content?.trim();

      if (content === undefined || content.length === 0) {
        console.warn("PostGeneration LLM returned empty content");
        return { ok: false, error: "LLM returned empty content" };
      }

      const parsed = JSON.parse(content) as {
        postText?: unknown;
        hashtags?: unknown;
      };

      if (typeof parsed.postText !== "string" || parsed.postText.trim().length === 0) {
        console.warn("PostGeneration LLM returned missing or empty postText");
        return { ok: false, error: "LLM returned missing or empty postText" };
      }

      const hashtags = Array.isArray(parsed.hashtags)
        ? (parsed.hashtags as unknown[])
            .filter((v): v is string => typeof v === "string")
            .map((h) => h.trim())
            .filter((h) => h.length > 0)
        : [];

      return {
        ok: true,
        data: {
          postText: parsed.postText.trim(),
          hashtags,
        },
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(`PostGeneration LLM failed: ${message}`);
      return { ok: false, error: message };
    }
  }
}
