import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { PublicationProofCard } from "./PublicationProofCard";

// ── Default props factory ────────────────────────────────────────────────────

interface TestProofCardProps {
  txHash: string | null;
  proofText: string | null;
  proofReceivedAt: string | null;
  dealStatus: string;
}

const createDefaultProps = (
  overrides?: Partial<TestProofCardProps>,
): TestProofCardProps => ({
  txHash: null,
  proofText: null,
  proofReceivedAt: null,
  dealStatus: "paid",
  ...overrides,
});

beforeEach(() => {
  vi.stubGlobal("__TON_NETWORK__", "testnet");
});

// ── PP1-PP3: Rendering for paid status ──────────────────────────────────────

describe("PublicationProofCard rendering for paid status", () => {
  it("PP1: renders payment confirmed text for paid deal", () => {
    const props = createDefaultProps({ dealStatus: "paid" });
    render(<PublicationProofCard {...props} />);

    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByText("Post-Payment Status")).toBeInTheDocument();
  });

  it("PP2: shows tx hash as explorer link when txHash is provided", () => {
    const txHash = "6eZH2Yylj1XDH4ziW7GBsIdEylmY2fz8Pn7sF+7m7TU=";
    const props = createDefaultProps({ dealStatus: "paid", txHash });
    render(<PublicationProofCard {...props} />);

    expect(screen.getByText("Transaction")).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      `https://testnet.tonviewer.com/transaction/${encodeURIComponent(txHash)}`,
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("PP3: shows 'Waiting for publication...' for paid status", () => {
    const props = createDefaultProps({ dealStatus: "paid" });
    render(<PublicationProofCard {...props} />);

    expect(screen.getByText("Waiting for publication...")).toBeInTheDocument();
  });
});

// ── PP4: proof_pending status ───────────────────────────────────────────────

describe("PublicationProofCard rendering for proof_pending status", () => {
  it("PP4: shows reminder text for proof_pending status", () => {
    const props = createDefaultProps({ dealStatus: "proof_pending" });
    render(<PublicationProofCard {...props} />);

    expect(
      screen.getByText("Reminder sent, waiting for proof..."),
    ).toBeInTheDocument();
  });
});

// ── PP5-PP7: completed status ───────────────────────────────────────────────

describe("PublicationProofCard rendering for completed status", () => {
  it("PP5: shows 'Published' for completed deal", () => {
    const props = createDefaultProps({ dealStatus: "completed" });
    render(<PublicationProofCard {...props} />);

    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText("Publication Complete")).toBeInTheDocument();
  });

  it("PP6: shows proof text for completed deal with proofText", () => {
    const props = createDefaultProps({
      dealStatus: "completed",
      proofText: "Check out our amazing product!",
    });
    render(<PublicationProofCard {...props} />);

    expect(
      screen.getByText("Check out our amazing product!"),
    ).toBeInTheDocument();
    expect(screen.getByText("Published Post")).toBeInTheDocument();
  });

  it("PP7: shows confirmed-at timestamp for completed deal with proofReceivedAt", () => {
    const timestamp = "2026-03-25T12:00:00.000Z";
    const props = createDefaultProps({
      dealStatus: "completed",
      proofReceivedAt: timestamp,
    });
    render(<PublicationProofCard {...props} />);

    expect(screen.getByText("Confirmed at")).toBeInTheDocument();
    // The component renders new Date(proofReceivedAt).toLocaleString()
    expect(
      screen.getByText(new Date(timestamp).toLocaleString()),
    ).toBeInTheDocument();
  });
});

// ── PP8-PP9: Hidden for non-applicable statuses ─────────────────────────────

describe("PublicationProofCard returns null for non-applicable statuses", () => {
  it("PP8: returns null for negotiating status", () => {
    const props = createDefaultProps({ dealStatus: "negotiating" });
    const { container } = render(<PublicationProofCard {...props} />);

    expect(container.innerHTML).toBe("");
  });

  it("PP9: returns null for terms_agreed status", () => {
    const props = createDefaultProps({ dealStatus: "terms_agreed" });
    const { container } = render(<PublicationProofCard {...props} />);

    expect(container.innerHTML).toBe("");
  });

  it("PP10: returns null for payment_pending status", () => {
    const props = createDefaultProps({ dealStatus: "payment_pending" });
    const { container } = render(<PublicationProofCard {...props} />);

    expect(container.innerHTML).toBe("");
  });
});

// ── PP11: no tx hash link when txHash is null ───────────────────────────────

describe("PublicationProofCard edge cases", () => {
  it("PP11: does not render transaction link when txHash is null", () => {
    const props = createDefaultProps({ dealStatus: "paid", txHash: null });
    render(<PublicationProofCard {...props} />);

    expect(screen.queryByText("Transaction")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("PP12: does not render proof text section when proofText is null on completed deal", () => {
    const props = createDefaultProps({
      dealStatus: "completed",
      proofText: null,
    });
    render(<PublicationProofCard {...props} />);

    expect(screen.queryByText("Published Post")).not.toBeInTheDocument();
  });
});
