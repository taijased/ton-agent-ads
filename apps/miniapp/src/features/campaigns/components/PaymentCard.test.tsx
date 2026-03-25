import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { PaymentCard } from "./PaymentCard";

// ── Mock TonConnect ──────────────────────────────────────────────────────────

const mockSendTransaction = vi.fn();
const mockOpenModal = vi.fn();
let mockWallet: { account: { address: string; chain: string } } | null = null;

vi.mock("@tonconnect/ui-react", () => ({
  useTonWallet: () => mockWallet,
  useTonConnectUI: () => [
    { sendTransaction: mockSendTransaction, openModal: mockOpenModal },
  ],
}));

// ── Mock API service ─────────────────────────────────────────────────────────

const mockPayDeal = vi.fn();
const mockConfirmPayment = vi.fn();
vi.mock("../services/api-campaign-workspace-service", () => ({
  payDeal: (...args: unknown[]) => mockPayDeal(...args),
  confirmPayment: (...args: unknown[]) => mockConfirmPayment(...args),
}));

// ── Mock wallet-transfer utilities ───────────────────────────────────────────

vi.mock("../../../profile/lib/wallet-transfer", () => ({
  parseTonAmountToNano: (amount: string) => ({
    nanoAmount: (parseFloat(amount) * 1e9).toString(),
  }),
  formatWalletAddress: (addr: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-6)}` : "",
  validateTransferAddress: () => ({ valid: true }),
}));

// ── Default props factory ────────────────────────────────────────────────────

interface TestPaymentCardProps {
  dealId: string;
  channelName: string;
  priceTon: number;
  dateText: string | null;
  adminWallet: string | null;
  dealStatus: string;
  onPaymentComplete: () => void;
}

const createDefaultProps = (
  overrides?: Partial<TestPaymentCardProps>,
): TestPaymentCardProps => ({
  dealId: "deal-001",
  channelName: "Test Channel",
  priceTon: 5,
  dateText: "March 30",
  adminWallet: "EQAbcdefghijklmnopqrstuvwxyz1234567890ABCDEF",
  dealStatus: "terms_agreed",
  onPaymentComplete: vi.fn(),
  ...overrides,
});

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockWallet = null;
});

// ── T17-T22: Rendering states ────────────────────────────────────────────────

describe("PaymentCard rendering states", () => {
  it("T17: renders payment details - price, date, channel, wallet", () => {
    mockWallet = {
      account: { address: "EQTestWalletAddress", chain: "-239" },
    };
    const props = createDefaultProps();
    render(<PaymentCard {...props} />);

    expect(screen.getByText("5 TON")).toBeInTheDocument();
    expect(screen.getByText("March 30")).toBeInTheDocument();
    expect(screen.getByText("Test Channel")).toBeInTheDocument();
    // Wallet address is formatted by mock: first 6 + ... + last 6
    expect(screen.getByText("EQAbcd...ABCDEF")).toBeInTheDocument();
  });

  it("T18: shows Connect wallet when no TonConnect wallet connected", () => {
    mockWallet = null;
    const props = createDefaultProps();
    render(<PaymentCard {...props} />);

    expect(screen.getByText("Connect wallet")).toBeInTheDocument();
    expect(screen.queryByText(/Pay \d+ TON/)).not.toBeInTheDocument();
  });

  it("T19: shows Pay X TON when wallet connected and deal is terms_agreed", () => {
    mockWallet = {
      account: { address: "EQTestWalletAddress", chain: "-239" },
    };
    const props = createDefaultProps({ dealStatus: "terms_agreed" });
    render(<PaymentCard {...props} />);

    expect(screen.getByText("Pay 5 TON")).toBeInTheDocument();
  });

  it("T20: shows wallet missing warning when adminWallet is null", () => {
    mockWallet = {
      account: { address: "EQTestWalletAddress", chain: "-239" },
    };
    const props = createDefaultProps({ adminWallet: null });
    render(<PaymentCard {...props} />);

    expect(
      screen.getByText(/Wallet address not available/),
    ).toBeInTheDocument();
  });

  it("T21: shows Payment sent when deal status is payment_pending", () => {
    const props = createDefaultProps({ dealStatus: "payment_pending" });
    render(<PaymentCard {...props} />);

    expect(screen.getByText("Payment sent")).toBeInTheDocument();
  });

  it("T22: does not show Pay button when dealStatus is payment_pending", () => {
    mockWallet = {
      account: { address: "EQTestWalletAddress", chain: "-239" },
    };
    const props = createDefaultProps({ dealStatus: "payment_pending" });
    render(<PaymentCard {...props} />);

    expect(
      screen.queryByRole("button", { name: /Pay/i }),
    ).not.toBeInTheDocument();
  });
});

// ── T23-T26: Interactions ────────────────────────────────────────────────────

describe("PaymentCard interactions", () => {
  it("T23: clicking Connect wallet opens TonConnect modal", async () => {
    mockWallet = null;
    const props = createDefaultProps();
    render(<PaymentCard {...props} />);

    fireEvent.click(screen.getByText("Connect wallet"));

    await waitFor(() => {
      expect(mockOpenModal).toHaveBeenCalledTimes(1);
    });
  });

  it("T24: Pay button disabled while submitting", async () => {
    mockWallet = {
      account: { address: "EQTestWalletAddress", chain: "-239" },
    };
    // sendTransaction returns a promise that never resolves during the test
    let resolveSendTx: ((value: { boc: string }) => void) | undefined;
    mockSendTransaction.mockReturnValue(
      new Promise<{ boc: string }>((resolve) => {
        resolveSendTx = resolve;
      }),
    );
    const props = createDefaultProps();
    render(<PaymentCard {...props} />);

    const payButton = screen.getByRole("button", { name: /Pay 5 TON/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(payButton).toBeDisabled();
    });

    // Clean up: resolve the pending promise to avoid unhandled rejection
    resolveSendTx?.({ boc: "cleanup" });
  });

  it("T25: successful payment calls payDeal API with boc", async () => {
    mockWallet = {
      account: { address: "EQTestWalletAddress", chain: "-239" },
    };
    mockSendTransaction.mockResolvedValue({ boc: "test-boc-value" });
    mockPayDeal.mockResolvedValue({
      id: "deal-001",
      status: "payment_pending",
      paymentBoc: "test-boc-value",
      paidAt: null,
    });

    const props = createDefaultProps();
    render(<PaymentCard {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /Pay 5 TON/i }));

    await waitFor(() => {
      expect(mockPayDeal).toHaveBeenCalledWith("deal-001", "test-boc-value");
    });
  });

  it("T26: successful payment calls onPaymentComplete callback", async () => {
    mockWallet = {
      account: { address: "EQTestWalletAddress", chain: "-239" },
    };
    mockSendTransaction.mockResolvedValue({ boc: "test-boc" });
    mockPayDeal.mockResolvedValue({
      id: "deal-001",
      status: "payment_pending",
      paymentBoc: "test-boc",
      paidAt: null,
    });

    const onPaymentComplete = vi.fn();
    const props = createDefaultProps({ onPaymentComplete });
    render(<PaymentCard {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /Pay 5 TON/i }));

    await waitFor(() => {
      expect(onPaymentComplete).toHaveBeenCalledTimes(1);
    });
  });
});

// ── T27-T30: Error handling ──────────────────────────────────────────────────

describe("PaymentCard error handling", () => {
  it("T27: shows Transaction cancelled when TonConnect rejects", async () => {
    mockWallet = {
      account: { address: "EQTestWalletAddress", chain: "-239" },
    };
    mockSendTransaction.mockRejectedValue(
      new Error("User rejected the transaction"),
    );

    const props = createDefaultProps();
    render(<PaymentCard {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /Pay 5 TON/i }));

    await waitFor(() => {
      expect(screen.getByText(/cancelled/i)).toBeInTheDocument();
    });
  });

  it("T28: shows API error when payDeal fails", async () => {
    mockWallet = {
      account: { address: "EQTestWalletAddress", chain: "-239" },
    };
    mockSendTransaction.mockResolvedValue({ boc: "test-boc" });
    mockPayDeal.mockRejectedValue(new Error("Deal not found"));

    const props = createDefaultProps();
    render(<PaymentCard {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /Pay 5 TON/i }));

    await waitFor(() => {
      expect(screen.getByText("Deal not found")).toBeInTheDocument();
    });
  });

  it("T29: handles unknown error gracefully", async () => {
    mockWallet = {
      account: { address: "EQTestWalletAddress", chain: "-239" },
    };
    mockSendTransaction.mockRejectedValue("non-error-value");

    const props = createDefaultProps();
    render(<PaymentCard {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /Pay 5 TON/i }));

    await waitFor(() => {
      expect(screen.getByText(/could not be created/i)).toBeInTheDocument();
    });
  });

  it("T30: re-enables Pay button after error", async () => {
    mockWallet = {
      account: { address: "EQTestWalletAddress", chain: "-239" },
    };
    mockSendTransaction.mockRejectedValue(new Error("User rejected"));

    const props = createDefaultProps();
    render(<PaymentCard {...props} />);

    const payButton = screen.getByRole("button", { name: /Pay 5 TON/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(payButton).not.toBeDisabled();
    });
  });
});
