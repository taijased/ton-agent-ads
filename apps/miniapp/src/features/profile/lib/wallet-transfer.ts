export const TESTNET_CHAIN_ID = "-3";
const MAINNET_CHAIN_ID = "-239";
const NANO_PER_TON = 1_000_000_000n;
const ADDRESS_CHARACTERS_PATTERN = /^[A-Za-z0-9:_-]+$/;

export const formatWalletAddress = (value: string): string => {
  if (value.trim().length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-6)}`;
};

export const getWalletNetworkLabel = (chain?: string): string => {
  switch (chain) {
    case TESTNET_CHAIN_ID:
      return "Testnet";
    case MAINNET_CHAIN_ID:
      return "Mainnet";
    default:
      return "Unknown";
  }
};

export const isTestnetChain = (chain?: string): boolean =>
  chain === TESTNET_CHAIN_ID;

export const validateTransferAddress = (value: string): string | null => {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    return "Enter the recipient wallet address.";
  }

  if (/\s/.test(normalizedValue)) {
    return "Wallet address must not contain spaces.";
  }

  if (normalizedValue.length < 32) {
    return "Wallet address looks too short.";
  }

  if (!ADDRESS_CHARACTERS_PATTERN.test(normalizedValue)) {
    return "Use a valid TON wallet address.";
  }

  return null;
};

const normalizeAmountInput = (value: string): string =>
  value.trim().replace(/,/g, ".");

export const parseTonAmountToNano = (
  value: string,
): { nanoAmount: string; normalizedAmount: string } => {
  const normalizedAmount = normalizeAmountInput(value);

  if (normalizedAmount.length === 0) {
    throw new Error("Enter the amount to send.");
  }

  if (!/^\d+(\.\d+)?$/.test(normalizedAmount)) {
    throw new Error("Use numbers only, for example 0.25.");
  }

  const [wholePart, fractionPart = ""] = normalizedAmount.split(".");

  if (fractionPart.length > 9) {
    throw new Error("Use up to 9 decimal places for TON amounts.");
  }

  const wholeNano = BigInt(wholePart) * NANO_PER_TON;
  const fractionNano =
    fractionPart.length === 0 ? 0n : BigInt(fractionPart.padEnd(9, "0"));
  const nanoAmount = (wholeNano + fractionNano).toString();

  if (nanoAmount === "0") {
    throw new Error("Amount must be greater than zero.");
  }

  return {
    nanoAmount,
    normalizedAmount,
  };
};
