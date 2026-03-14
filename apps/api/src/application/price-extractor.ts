export interface PriceExtractionResult {
  offeredPriceTon?: number;
}

const normalizeNumber = (value: string): number =>
  Number(value.replace(",", "."));
const tonUnitPattern = "(?:ton|tons|т|тон|тонн|тонн)";

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

  return {};
};
