/**
 * Detect the primary language of a message text.
 * Uses Cyrillic/Latin ratio heuristic.
 * Defaults to "EN" when no clear signal is present.
 */
export function detectMessageLanguage(text: string): "RU" | "EN" {
  if (text.length === 0) {
    return "EN";
  }

  let cyrillic = 0;
  let latin = 0;

  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x0400 && code <= 0x04ff) {
      cyrillic++;
    } else if (
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a)
    ) {
      latin++;
    }
  }

  if (cyrillic === 0 && latin === 0) {
    return "EN";
  }

  return cyrillic > latin + 1 ? "RU" : "EN";
}
