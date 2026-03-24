import type { CampaignLanguage } from "@repo/types";

export interface OutreachMessageInput {
  channelTitle: string;
  channelUsername: string;
  language: CampaignLanguage | null;
  /** Optional language detected from channel title — overrides campaign language */
  detectedLanguage?: "RU" | "EN";
  /** The campaign ad post text to include in the outreach */
  postText?: string;
}

export function buildOutreachMessage(input: OutreachMessageInput): string {
  const {
    channelTitle,
    channelUsername,
    language,
    detectedLanguage,
    postText,
  } = input;
  const effectiveLanguage = detectedLanguage ?? language;

  if (effectiveLanguage === "EN") {
    const lines = [
      "Hi! My name is Lumi Lapulio, I'm an advertising manager.",
      `We are looking for ad placement opportunities and came across ${channelTitle} (${channelUsername}).`,
    ];

    if (postText) {
      lines.push("", "Here is the ad we'd like to place:", `"${postText}"`, "");
      lines.push("Would you be interested in placing this advertisement?");
    } else {
      lines.push("Would you be interested in placing an advertisement?");
    }

    return lines.join("\n");
  }

  const lines = [
    "Здравствуйте! Меня зовут Lumi Lapulio, я рекламный менеджер.",
    `Мы ищем возможности для размещения рекламы и обратили внимание на ${channelTitle} (${channelUsername}).`,
  ];

  if (postText) {
    lines.push(
      "",
      "Вот реклама, которую мы хотели бы разместить:",
      `"${postText}"`,
      "",
    );
    lines.push("Было бы вам интересно разместить эту рекламную публикацию?");
  } else {
    lines.push("Было бы вам интересно разместить рекламную публикацию?");
  }

  return lines.join("\n");
}

export function buildNegotiationIntroMessage(
  language: CampaignLanguage | null,
): string {
  if (language === "RU") {
    return "Здравствуйте! Мы заинтересованы в рекламном размещении в вашем канале для кампании в экосистеме TON. Подскажите, пожалуйста, доступные даты и стоимость размещения.";
  }

  return "Hi! We’re interested in an advertising placement in your channel for a TON ecosystem campaign. Could you share placement availability and pricing?";
}
