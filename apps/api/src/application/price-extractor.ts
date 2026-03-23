export interface PriceExtractionResult {
  offeredPriceTon?: number;
  mentionedNonTonCurrency?: boolean;
  rawAmount?: number;
}

const normalizeNumber = (value: string): number =>
  Number(value.replace(",", "."));
const tonUnitPattern = "(?:ton|tons|тонн?|т(?:он(?:ов|а)?)?)";

export const extractPriceTon = (text: string): PriceExtractionResult => {
  const normalized = text.toLowerCase();
  const rangeMatch = normalized.match(
    new RegExp(
      `(\\d+(?:[.,]\\d+)?)\\s*[-–]\\s*(\\d+(?:[.,]\\d+)?)\\s*${tonUnitPattern}`,
      "i",
    ),
  );

  if (rangeMatch !== null) {
    return { offeredPriceTon: normalizeNumber(rangeMatch[2]) };
  }

  const fromMatch = normalized.match(
    new RegExp(
      `(?:от|minimum|minimum price|min|минимум)\\s*(\\d+(?:[.,]\\d+)?)\\s*${tonUnitPattern}`,
      "i",
    ),
  );

  if (fromMatch !== null) {
    return { offeredPriceTon: normalizeNumber(fromMatch[1]) };
  }

  const simpleMatch = normalized.match(
    new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${tonUnitPattern}`, "i"),
  );

  if (simpleMatch !== null) {
    return { offeredPriceTon: normalizeNumber(simpleMatch[1]) };
  }

  // No TON match — check for non-TON currencies
  const nonTonSuffix = normalized.match(
    /(\d+(?:[.,]\d+)?)\s*(?:dollars?|долларов|доллар[а-я]*|usd|euros?|евро|eur|рублей|рубл[а-я]*|руб|rub)/i,
  );

  if (nonTonSuffix !== null) {
    return {
      mentionedNonTonCurrency: true,
      rawAmount: normalizeNumber(nonTonSuffix[1]),
    };
  }

  const nonTonPrefix = normalized.match(/(?:\$|€|₽)\s*(\d+(?:[.,]\d+)?)/);

  if (nonTonPrefix !== null) {
    return {
      mentionedNonTonCurrency: true,
      rawAmount: normalizeNumber(nonTonPrefix[1]),
    };
  }

  return {};
};
