import { Address, Cell } from "ton-core";

export interface TonWallet {
  address: Address;
}

export const createWalletAddress = (raw: string): Address => Address.parse(raw);

/**
 * Extract the external message hash from a BOC returned by TonConnect.
 *
 * NOTE: This is the hash of the external message cell, NOT the on-chain
 * transaction hash. The real tx hash is only assigned by the validator
 * after the message is processed. To get the real tx hash you would need
 * to query toncenter API (e.g. /api/v3/transactionsByMessage).
 *
 * The returned value is base64-encoded to match the format shown by
 * wallets like MyTonWallet and Tonkeeper.
 */
export function extractTxHashFromBoc(boc: string): string | null {
  try {
    const cells = Cell.fromBoc(Buffer.from(boc, "base64"));
    if (cells.length === 0) return null;
    return cells[0].hash().toString("base64");
  } catch {
    return null;
  }
}

export { convertToTon, type ConversionResult } from "./ton-price.js";
export { resolveTransactionHash } from "./toncenter-client.js";
