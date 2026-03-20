import type { CampaignLanguage } from "@repo/types";

export interface OutreachMessageInput {
  channelTitle: string;
  channelUsername: string;
  language: CampaignLanguage | null;
  /** Optional language detected from channel title — overrides campaign language */
  detectedLanguage?: "RU" | "EN";
}

export function buildOutreachMessage(input: OutreachMessageInput): string {
  const { channelTitle, channelUsername, language, detectedLanguage } = input;
  const effectiveLanguage = detectedLanguage ?? language;

  if (effectiveLanguage === "EN") {
    return [
      "Hi! My name is Lumi Lapulio, I'm an advertising manager.",
      `We are looking for ad placement opportunities and came across ${channelTitle} (${channelUsername}).`,
      "Would you be interested in placing an advertisement?",
    ].join("\n");
  }

  return [
    "Здравствуйте! Меня зовут Lumi Lapulio, я рекламный менеджер.",
    `Мы ищем возможности для размещения рекламы и обратили внимание на ${channelTitle} (${channelUsername}).`,
    "Было бы вам интересно разместить рекламную публикацию?",
  ].join("\n");
}
