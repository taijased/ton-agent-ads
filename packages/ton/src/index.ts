import { Address } from "ton-core";

export interface TonWallet {
  address: Address;
}

export const createWalletAddress = (raw: string): Address => Address.parse(raw);
