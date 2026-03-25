/**
 * Query toncenter API to find the on-chain transaction hash
 * from the external message hash (extracted from BOC).
 *
 * Uses testnet or mainnet toncenter based on the `testnet` parameter.
 * Retries up to `maxRetries` times with `retryDelayMs` between attempts
 * (the tx may not appear on-chain immediately).
 */
export async function resolveTransactionHash(
  msgHash: string,
  options?: {
    testnet?: boolean;
    maxRetries?: number;
    retryDelayMs?: number;
  },
): Promise<string | null> {
  const testnet = options?.testnet ?? true;
  const maxRetries = options?.maxRetries ?? 3;
  const retryDelayMs = options?.retryDelayMs ?? 3000;

  const baseUrl = testnet
    ? "https://testnet.toncenter.com"
    : "https://toncenter.com";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, retryDelayMs));
    }

    try {
      const url = `${baseUrl}/api/v3/transactionsByMessage?direction=in&msg_hash=${encodeURIComponent(msgHash)}&limit=1`;
      const response = await fetch(url);

      if (!response.ok) continue;

      const data = (await response.json()) as {
        transactions?: Array<{ hash?: string }>;
      };

      const txHash = data.transactions?.[0]?.hash;
      if (typeof txHash === "string" && txHash.length > 0) {
        return txHash;
      }
    } catch {
      // Network error, retry
    }
  }

  return null;
}
