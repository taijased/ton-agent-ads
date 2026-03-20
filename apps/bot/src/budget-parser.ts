export type BudgetParseResult =
  | { amount: number; currency: "TON" }
  | { amount: number; currency: "unknown" }
  | { amount: number; currency: "other"; raw: string };

// Recognized TON currency tokens (case-insensitive)
const tonTokens = /^(ton|тон|тонн|toncoins?)$/i;

// Currency symbols and codes that indicate a non-TON currency
const nonTonPrefixPattern = /^([$€£¥₽])/u;
// Matches the full token (used against an already-isolated word, so no \b needed for Cyrillic)
const nonTonTokenPattern =
  /^(usd|eur|gbp|rub|rubles?|roubles?|rubley|rublej|рубл[ейяьи]|рублей|dollars?|euros?|pounds?|usdt|usdc|btc|eth|sol|bnb)$/iu;

/**
 * Parse a user budget input string into a structured result.
 *
 * Returns:
 *  - { amount, currency: "TON" }              — confirmed TON amount
 *  - { amount, currency: "unknown" }           — bare number, needs confirmation
 *  - { amount, currency: "other", raw }        — non-TON currency detected
 *  - null                                      — invalid / ambiguous input
 */
export function parseBudgetInput(input: string): BudgetParseResult | null {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return null;
  }

  // Normalize comma decimals ("10,5" → "10.5")
  const normalized = trimmed.replace(/,/g, ".");

  // Check for leading currency symbol (e.g. "$50", "€100")
  const prefixMatch = nonTonPrefixPattern.exec(normalized);
  if (prefixMatch !== null) {
    const raw = prefixMatch[1];
    const rest = normalized.slice(raw.length).trim();
    const amount = Number(rest);
    if (!isValidAmount(amount)) {
      return null;
    }
    return { amount, currency: "other", raw };
  }

  // Split into tokens
  const parts = normalized.trim().split(/\s+/);

  if (parts.length === 1) {
    // Pure number only
    const amount = Number(parts[0]);
    if (!isValidAmount(amount)) {
      return null;
    }
    return { amount, currency: "unknown" };
  }

  if (parts.length === 2) {
    const [first, second] = parts as [string, string];
    const firstNum = Number(first);
    const secondNum = Number(second);

    // "5 ton" or "ton 5" — number + currency token
    if (isValidAmount(firstNum) && !Number.isNaN(firstNum)) {
      // First is a number — check second token
      if (tonTokens.test(second)) {
        return { amount: firstNum, currency: "TON" };
      }
      if (nonTonTokenPattern.test(second)) {
        return { amount: firstNum, currency: "other", raw: second };
      }
      // Second token is something unrecognized — ambiguous
      return null;
    }

    if (isValidAmount(secondNum) && !Number.isNaN(secondNum)) {
      // Second is a number — first might be a currency prefix word ("about 5" → null)
      return null;
    }

    return null;
  }

  // More than 2 tokens — ambiguous (e.g. "about 5 ton" or "5 10")
  return null;
}

function isValidAmount(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}
