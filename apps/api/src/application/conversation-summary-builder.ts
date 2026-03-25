import type { DealMessage } from "@repo/types";

export function buildConversationSummary(
  messages: DealMessage[],
  maxExchanges = 4,
  maxLineLength = 100,
): string[] {
  const adminMessages = messages.filter(
    (m) =>
      m.audience === "admin" ||
      (m.audience === undefined && m.senderType !== "system"),
  );

  if (adminMessages.length === 0) {
    return ["(no conversation yet)"];
  }

  const recent = adminMessages.slice(-(maxExchanges * 2));

  return recent.map((m) => {
    const prefix = m.direction === "inbound" ? "Admin" : "Lumi";
    const text =
      m.text.length > maxLineLength
        ? m.text.slice(0, maxLineLength) + "..."
        : m.text;
    return `${prefix}: ${text}`;
  });
}
