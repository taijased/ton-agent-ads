import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAINNET_CHAIN_ID,
  TESTNET_CHAIN_ID,
  getRequiredWalletChainId,
  getTonNetwork,
  getTonviewerTransactionUrl,
  isExpectedWalletChain,
} from "./wallet-transfer";

describe("wallet-transfer TON network helpers", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses testnet by default for unexpected env values", () => {
    vi.stubGlobal("__TON_NETWORK__", "staging");

    expect(getTonNetwork()).toBe("testnet");
    expect(getRequiredWalletChainId()).toBe(TESTNET_CHAIN_ID);
    expect(isExpectedWalletChain(TESTNET_CHAIN_ID)).toBe(true);
  });

  it("uses mainnet chain and explorer when TON_NETWORK=mainnet", () => {
    vi.stubGlobal("__TON_NETWORK__", "mainnet");

    expect(getTonNetwork()).toBe("mainnet");
    expect(getRequiredWalletChainId()).toBe(MAINNET_CHAIN_ID);
    expect(isExpectedWalletChain(MAINNET_CHAIN_ID)).toBe(true);
    expect(getTonviewerTransactionUrl("abc/123")).toBe(
      "https://tonviewer.com/transaction/abc%2F123",
    );
  });

  it("uses testnet explorer when TON_NETWORK=testnet", () => {
    vi.stubGlobal("__TON_NETWORK__", "testnet");

    expect(getTonviewerTransactionUrl("abc/123")).toBe(
      "https://testnet.tonviewer.com/transaction/abc%2F123",
    );
  });
});
