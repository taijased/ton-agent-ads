const telegramPathPattern = /^https?:\/\/(?:t\.me|telegram\.me)\/([A-Za-z0-9_]{5,})(?:[/?#].*)?$/i;
const telegramBarePathPattern = /^(?:t\.me|telegram\.me)\/([A-Za-z0-9_]{5,})(?:[/?#].*)?$/i;
const telegramUsernamePattern = /^@?([A-Za-z0-9_]{5,})$/;
const embeddedTelegramPathPattern = /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([A-Za-z0-9_]{5,})/i;
const embeddedTelegramUsernamePattern = /@([A-Za-z0-9_]{5,})/;

const stripTrailingPunctuation = (value: string): string => value.replace(/[),.;:!?]+$/g, "");

export const normalizeChannelReference = (value: string): string | null => {
  const trimmed = stripTrailingPunctuation(value.trim());

  if (trimmed.length === 0) {
    return null;
  }

  const directMatch = trimmed.match(telegramUsernamePattern);

  if (directMatch !== null) {
    return `@${directMatch[1]}`;
  }

  const urlMatch = trimmed.match(telegramPathPattern) ?? trimmed.match(telegramBarePathPattern);

  if (urlMatch !== null) {
    return `@${urlMatch[1]}`;
  }

  const embeddedUrlMatch = trimmed.match(embeddedTelegramPathPattern);

  if (embeddedUrlMatch !== null) {
    return `@${embeddedUrlMatch[1]}`;
  }

  const embeddedUsernameMatch = trimmed.match(embeddedTelegramUsernamePattern);

  if (embeddedUsernameMatch !== null) {
    return `@${embeddedUsernameMatch[1]}`;
  }

  return null;
};

export const normalizeTelegramLink = (value: string): string | null => {
  const match = value.match(telegramPathPattern) ?? value.match(telegramBarePathPattern);

  if (match === null) {
    return null;
  }

  return `https://t.me/${match[1]}`;
};
