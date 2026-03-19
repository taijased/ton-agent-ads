import type { CampaignLanguage } from "@repo/types";

export interface OutreachMessageInput {
  channelTitle: string;
  channelUsername: string;
  language: CampaignLanguage | null;
}

export function buildOutreachMessage(input: OutreachMessageInput): string {
  const { channelTitle, channelUsername, language } = input;

  if (language === "EN") {
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
