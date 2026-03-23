/**
 * Fetches the current TON price from CoinGecko and converts a fiat amount to TON.
 *
 * Uses the free CoinGecko API (no key needed).
 * Caches the price for 60 seconds to avoid rate limits.
 */

interface CachedPrice {
  rates: Record<string, number>;
  fetchedAt: number;
}

const CACHE_TTL_MS = 60_000;
let cache: CachedPrice | null = null;

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd,eur,gbp,rub";

/**
 * Map raw currency tokens from budget-parser to CoinGecko currency keys.
 */
const currencyMap: Record<string, string> = {
  // Symbols
  $: "usd",
  "€": "eur",
  "£": "gbp",
  "₽": "rub",
  "¥": "usd", // fallback — CoinGecko doesn't have CNY in our query

  // English tokens
  usd: "usd",
  dollar: "usd",
  dollars: "usd",
  usdt: "usd",
  usdc: "usd",
  eur: "eur",
  euro: "eur",
  euros: "eur",
  gbp: "gbp",
  pound: "gbp",
  pounds: "gbp",
  rub: "rub",
  ruble: "rub",
  rubles: "rub",
  rouble: "rub",
  roubles: "rub",
  rubley: "rub",
  rublej: "rub",

  // Cyrillic tokens
  рублей: "rub",
  рубли: "rub",
  рубля: "rub",
  рубль: "rub",
};

async function fetchTonRates(): Promise<Record<string, number> | null> {
  if (cache !== null && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rates;
  }

  try {
    const response = await fetch(COINGECKO_URL, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      "the-open-network"?: Record<string, number>;
    };

    const rates = data["the-open-network"];
    if (rates === undefined) return null;

    cache = { rates, fetchedAt: Date.now() };
    return rates;
  } catch {
    return null;
  }
}

export interface ConversionResult {
  tonAmount: number;
  fiatAmount: number;
  fiatCurrency: string;
  tonPrice: number;
}

/**
 * Convert a fiat amount to TON.
 *
 * @param amount - the amount in fiat currency
 * @param rawCurrency - the raw currency token from budget-parser (e.g. "$", "usd", "рублей")
 * @returns conversion result or null if conversion is not possible
 */
export async function convertToTon(
  amount: number,
  rawCurrency: string,
): Promise<ConversionResult | null> {
  const key = currencyMap[rawCurrency.toLowerCase()];
  if (key === undefined) return null;

  const rates = await fetchTonRates();
  if (rates === null) return null;

  const tonPriceInFiat = rates[key];
  if (tonPriceInFiat === undefined || tonPriceInFiat <= 0) return null;

  const tonAmount = Math.round((amount / tonPriceInFiat) * 100) / 100;

  if (tonAmount <= 0) return null;

  return {
    tonAmount,
    fiatAmount: amount,
    fiatCurrency: key.toUpperCase(),
    tonPrice: tonPriceInFiat,
  };
}
