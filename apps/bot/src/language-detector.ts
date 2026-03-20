/**
 * Detect the primary language of a Telegram channel title.
 *
 * Heuristics (applied in order):
 * 1. Explicit _ru or _en suffix (case-insensitive)
 * 2. Cyrillic character ratio > Latin character count → "RU"
 * 3. Default → "EN"
 */
export function detectLanguageFromTitle(title: string): "RU" | "EN" {
  if (title.length === 0) {
    return "EN";
  }

  // 1. Explicit suffix check (_ru or _en at word/end boundary)
  if (/_ru(\b|$)/i.test(title)) {
    return "RU";
  }
  if (/_en(\b|$)/i.test(title)) {
    return "EN";
  }

  // 2. Script ratio heuristic
  return detectByScript(title);
}

/**
 * Detect the primary language of a message text.
 *
 * Uses the same Cyrillic/Latin ratio heuristic.
 * Defaults to "EN" when no clear signal is present.
 */
export function detectMessageLanguage(text: string): "RU" | "EN" {
  if (text.length === 0) {
    return "EN";
  }

  return detectByScript(text);
}

/**
 * Shared heuristic: count Cyrillic vs Latin letters in text.
 * If Cyrillic letters strictly outnumber Latin letters, returns "RU".
 * Otherwise returns "EN".
 */
function detectByScript(text: string): "RU" | "EN" {
  let cyrillic = 0;
  let latin = 0;

  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    // Cyrillic block: U+0400–U+04FF
    if (code >= 0x0400 && code <= 0x04ff) {
      cyrillic++;
    } else if (
      // Basic Latin letters A-Z / a-z
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a)
    ) {
      latin++;
    }
  }

  if (cyrillic === 0 && latin === 0) {
    // No script characters — default to EN
    return "EN";
  }

  // Require Cyrillic to clearly outnumber Latin (margin > 1) to return RU.
  // Ties and near-ties default to EN.
  return cyrillic > latin + 1 ? "RU" : "EN";
}
