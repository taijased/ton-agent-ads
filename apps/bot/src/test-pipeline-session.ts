import { InlineKeyboard } from "grammy";
import type { MockChannel } from "./mock-channels.js";
import { TestSession } from "./test-session.js";
import { parseBudgetInput } from "./budget-parser.js";

export type PipelinePhase =
  | { kind: "campaign_creation"; step: "description" | "budget" | "post" }
  | { kind: "searching" }
  | { kind: "negotiating" }
  | {
      kind: "post_approval";
      revisionCount: number;
      awaitingBuyerRevision?: boolean;
    }
  | { kind: "collecting_time" }
  | { kind: "collecting_wallet" }
  | { kind: "invoicing" }
  | { kind: "awaiting_proof" }
  | { kind: "completed" }
  | { kind: "declined" };

export interface CampaignDraft {
  description?: string;
  budgetAmount?: string;
  postText?: string;
}

export interface PipelineMessageResult {
  reply?: string;
  replies?: Array<{ text: string; keyboard?: InlineKeyboard }>;
  keyboard?: InlineKeyboard;
  done?: boolean;
  triggerSearch?: boolean;
}

export class TestPipelineSession {
  public phase: PipelinePhase;
  public campaignDraft: CampaignDraft;
  private readonly userId: string;
  private readonly sendReply: (text: string) => Promise<void>;
  public readonly isFullPipeline: boolean;
  private searchResults: MockChannel[] = [];
  private selectedChannel: MockChannel | undefined;
  private testSession: TestSession | undefined;
  private readonly sessionId: string;
  private agreedPrice: string | undefined;
  private agreedTime: string | undefined;
  private adminWallet: string | undefined;
  private approvalRequestId: string | undefined;

  public get channelTitle(): string {
    return this.selectedChannel?.title ?? "Unknown";
  }

  public get channelUsername(): string {
    return this.selectedChannel?.username ?? "Unknown";
  }

  public constructor(
    userId: string,
    sendReply: (text: string) => Promise<void>,
    options?: { fullPipeline?: boolean },
  ) {
    this.userId = userId;
    this.sendReply = sendReply;
    this.isFullPipeline = options?.fullPipeline ?? false;
    this.phase = { kind: "campaign_creation", step: "description" };
    this.campaignDraft = {};
    this.sessionId = `pipe-${userId}-${Date.now()}`;
  }

  public getSearchKeywords(): string[] {
    if (!this.campaignDraft.description) return [];
    return this.campaignDraft.description
      .split(/\s+/)
      .filter((w) => w.length >= 3)
      .slice(0, 5);
  }

  public setSearchResults(channels: MockChannel[]): PipelineMessageResult {
    this.searchResults = channels;

    if (channels.length === 0) {
      this.phase = { kind: "completed" };
      return {
        reply: "No channels found matching your campaign. Try /test_search <keywords> with different terms.",
        done: true,
      };
    }

    const lines = channels.map(
      (ch, i) =>
        `${i + 1}. ${ch.title} (${ch.username})\n   \u{1F4CA} ${ch.subscriberCount.toLocaleString()} subscribers | \u{1F4B0} ~${ch.price} TON`,
    );

    const keyboard = new InlineKeyboard();
    channels.forEach((_, i) => {
      keyboard.text(`${i + 1}`, `pch:${i}:${this.sessionId}`);
    });

    return {
      reply: `Found ${channels.length} channels:\n\n${lines.join("\n\n")}\n\nSelect a channel to start negotiation:`,
      keyboard,
    };
  }

  public async selectChannel(
    index: number,
  ): Promise<PipelineMessageResult> {
    const channel = this.searchResults[index];
    if (!channel) {
      return { reply: "Invalid channel selection." };
    }

    this.selectedChannel = channel;
    this.phase = { kind: "negotiating" };

    const scenarioIndex = 0;
    this.testSession = new TestSession(
      this.userId,
      scenarioIndex,
      this.sendReply,
    );

    try {
      const result = await this.testSession.start();

      return {
        replies: [
          {
            text: [
              "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550",
              "\u{1F464} [You are now the CHANNEL ADMIN]",
              `The buyer's agent has contacted you about an ad placement in ${channel.title}.`,
              "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550",
            ].join("\n"),
          },
          {
            text: [
              "--- Outreach message (what admin receives) ---",
              "",
              result.outreachMessage,
              "",
              "---",
              "Type your response as the channel admin:",
            ].join("\n"),
          },
        ],
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      return { reply: `Failed to start negotiation: ${message}` };
    }
  }

  public async handleMessage(text: string): Promise<PipelineMessageResult> {
    if (this.phase.kind === "campaign_creation") {
      return this.handleCampaignCreationStep(text);
    }

    if (this.phase.kind === "negotiating" && this.testSession) {
      const result = await this.testSession.handleAdminMessage(text);

      if (
        result.action === "request_user_approval" &&
        result.approvalRequestId
      ) {
        // Intercept — enter post-price deterministic phases
        this.approvalRequestId = result.approvalRequestId;
        this.agreedPrice = "agreed";
        this.phase = { kind: "post_approval", revisionCount: 0 };
        return this.showPostToAdmin();
      }

      if (result.action === "decline") {
        this.phase = { kind: "declined" };
        return { reply: "Agent declined the deal.", done: true };
      }

      if (result.action === "wait") {
        return { reply: "[Agent decided to wait \u2014 no reply sent]" };
      }

      if (result.action === "handoff_to_human") {
        return {
          reply: `Handoff to human: ${result.summary ?? "Manual review needed"}`,
        };
      }

      // Agent already sent reply via sendReply callback — no additional message needed
      return {};
    }

    if (this.phase.kind === "post_approval") {
      return this.handlePostApproval(text);
    }

    if (this.phase.kind === "collecting_time") {
      return this.handleTimeCollection(text);
    }

    if (this.phase.kind === "collecting_wallet") {
      return this.handleWalletCollection(text);
    }

    if (this.phase.kind === "awaiting_proof") {
      return this.handleProofCollection(text);
    }

    return { reply: "Unexpected message in current phase." };
  }

  private handleCampaignCreationStep(text: string): PipelineMessageResult {
    const phase = this.phase as {
      kind: "campaign_creation";
      step: "description" | "budget" | "post";
    };

    if (phase.step === "description") {
      if (text.trim().length < 10) {
        return {
          reply:
            "Please provide a more detailed description (at least 10 characters). What topics will interest your target audience?",
        };
      }
      this.campaignDraft.description = text.trim();
      this.phase = { kind: "campaign_creation", step: "budget" };
      return {
        reply:
          "\u{1F4B0} How much TON do you have for advertising? (e.g., 15 or 10.5)",
      };
    }

    if (phase.step === "budget") {
      const parsed = parseBudgetInput(text.trim());

      if (parsed === null) {
        return {
          reply:
            "Please enter a valid budget amount in TON (e.g., 15 or 10.5)",
        };
      }

      if (parsed.currency === "other") {
        return {
          reply:
            "We work in TON only. Please enter your budget amount in TON (e.g., 15 or 10.5)",
        };
      }

      if (parsed.currency === "unknown") {
        return {
          reply: `Is ${parsed.amount} your budget in TON? Reply "yes" to confirm or enter a different amount.`,
        };
      }

      // currency === "TON"
      this.campaignDraft.budgetAmount = String(parsed.amount);
      this.phase = { kind: "campaign_creation", step: "post" };
      return {
        reply: "\u{1F4DD} Now send your advertising post text:",
      };
    }

    if (phase.step === "post") {
      if (text.trim().length < 5) {
        return {
          reply:
            "Post text is too short. Please provide your advertising post (at least 5 characters)",
        };
      }
      this.campaignDraft.postText = text.trim();
      return this.onCampaignComplete();
    }

    return { reply: "Unknown campaign creation step." };
  }

  private onCampaignComplete(): PipelineMessageResult {
    const summary = [
      "\u2705 Campaign created!",
      "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550",
      `\u{1F4CB} Description: ${this.campaignDraft.description}`,
      `\u{1F4B0} Budget: ${this.campaignDraft.budgetAmount} TON`,
      `\u{1F4DD} Post: ${this.campaignDraft.postText}`,
      "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550",
    ].join("\n");

    if (this.isFullPipeline) {
      this.phase = { kind: "searching" };
      return {
        reply: summary + "\n\n\u{1F50D} Searching for channels...",
        triggerSearch: true,
      };
    }

    // Standalone /test_new — just show summary and finish
    this.phase = { kind: "completed" };
    return {
      reply: summary,
      done: true,
    };
  }

  private rolePrefix(role: "admin" | "buyer"): string {
    return role === "admin"
      ? "\u{1F464} [You are the CHANNEL ADMIN]"
      : "\u{1F4BC} [You are the BUYER]";
  }

  private showPostToAdmin(): PipelineMessageResult {
    return {
      replies: [
        {
          text: [
            "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550",
            this.rolePrefix("admin"),
            "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550",
          ].join("\n"),
        },
        {
          text: [
            "Here's the post we'd like to place in your channel:",
            "",
            "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
            this.campaignDraft.postText ?? "",
            "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
            "",
            "Is this ok for your channel? (yes/ok or describe what to change)",
          ].join("\n"),
        },
      ],
    };
  }

  private handlePostApproval(text: string): PipelineMessageResult {
    const phase = this.phase as {
      kind: "post_approval";
      revisionCount: number;
      awaitingBuyerRevision?: boolean;
    };

    if (phase.awaitingBuyerRevision) {
      // Buyer is sending updated post
      if (text.trim().length < 5) {
        return {
          reply:
            "Post text is too short. Please provide your updated advertising post (at least 5 characters)",
        };
      }
      this.campaignDraft.postText = text.trim();
      this.phase = { kind: "post_approval", revisionCount: phase.revisionCount };
      // Re-show to admin
      return this.showPostToAdmin();
    }

    // Admin is responding to post
    const approvalWords =
      /^(yes|ok|да|ок|good|looks good|fine|хорошо|отлично|ладно|подходит|approve|lgtm)/i;

    if (approvalWords.test(text.trim())) {
      // Post approved — move to time collection
      this.phase = { kind: "collecting_time" };
      return {
        reply:
          "Great! When can you publish the post? (e.g., today, tomorrow, Monday, any date)",
      };
    }

    // Admin wants changes
    const newRevisionCount = phase.revisionCount + 1;

    if (newRevisionCount >= 3) {
      // Max revisions reached
      this.phase = { kind: "collecting_time" };
      return {
        replies: [
          {
            text: "\u26A0\uFE0F Maximum revision rounds reached (3). Proceeding with current post.",
          },
          {
            text: "When can you publish the post? (e.g., today, tomorrow, Monday)",
          },
        ],
      };
    }

    // Ask buyer to modify
    this.phase = {
      kind: "post_approval",
      revisionCount: newRevisionCount,
      awaitingBuyerRevision: true,
    };
    return {
      replies: [
        {
          text: [
            "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550",
            this.rolePrefix("buyer"),
            "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550",
          ].join("\n"),
        },
        {
          text: [
            `The channel admin asked to change the post:`,
            `"${text.trim()}"`,
            "",
            "Please send your updated post:",
          ].join("\n"),
        },
      ],
    };
  }

  private handleTimeCollection(text: string): PipelineMessageResult {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return {
        reply:
          "Please provide a publication date/time (e.g., today, tomorrow, Monday)",
      };
    }

    this.agreedTime = trimmed;
    this.phase = { kind: "collecting_wallet" };
    return {
      reply: `\u{1F4C5} Publication scheduled: ${trimmed}\n\nPlease share your TON wallet address for payment:`,
    };
  }

  private handleWalletCollection(text: string): PipelineMessageResult {
    const trimmed = text.trim();
    const walletPattern = /^(?:EQ|UQ|kQ|0Q)[A-Za-z0-9_-]{40,80}$/;

    if (!walletPattern.test(trimmed)) {
      return {
        reply:
          "That doesn't look like a valid TON wallet address. It should start with EQ, UQ, kQ, or 0Q followed by 40-80 characters.\n\nPlease share your TON wallet address:",
      };
    }

    this.adminWallet = trimmed;
    this.phase = { kind: "invoicing" };

    // Transition to invoicing — Phase 5 will implement the invoice display
    return this.showInvoice();
  }

  private showInvoice(): PipelineMessageResult {
    this.phase = { kind: "invoicing" };
    return {
      replies: [
        {
          text: [
            "═══════════════════════════",
            this.rolePrefix("buyer"),
            "═══════════════════════════",
          ].join("\n"),
        },
        {
          text: [
            "📋 INVOICE",
            "═══════════════════════════",
            `Channel: ${this.channelTitle} (${this.channelUsername})`,
            `Price: ${this.agreedPrice ?? "agreed"} TON`,
            `Publication: ${this.agreedTime}`,
            `Wallet: ${this.adminWallet}`,
            "═══════════════════════════",
            "",
            "Approve to send payment, or decline to cancel.",
          ].join("\n"),
          keyboard: new InlineKeyboard()
            .text("✅ Approve & Pay", `pinv:approve:${this.sessionId}`)
            .text("❌ Decline", `pinv:decline:${this.sessionId}`),
        },
      ],
    };
  }

  public handleInvoiceAction(action: "approve" | "decline"): PipelineMessageResult {
    if (action === "approve") {
      this.phase = { kind: "awaiting_proof" };
      return {
        replies: [
          {
            text: [
              this.rolePrefix("buyer"),
              "",
              `💸 Payment of ${this.agreedPrice ?? "agreed"} TON sent to ${this.adminWallet}`,
              "Waiting for the channel admin to forward the published post...",
            ].join("\n"),
          },
          {
            text: [
              "═══════════════════════════",
              this.rolePrefix("admin"),
              "═══════════════════════════",
            ].join("\n"),
          },
          {
            text: [
              "💰 Payment received!",
              "Please forward the published post from your channel to confirm publication.",
              "",
              "Type or paste the post content:",
            ].join("\n"),
          },
        ],
      };
    }

    // Decline
    this.phase = { kind: "declined" };
    return {
      replies: [
        {
          text: [
            this.rolePrefix("buyer"),
            "",
            "Deal cancelled. No payment was made.",
          ].join("\n"),
        },
        {
          text: [
            "═══════════════════════════",
            this.rolePrefix("admin"),
            "═══════════════════════════",
          ].join("\n"),
        },
        {
          text: [
            "Unfortunately, our customer decided not to proceed with the placement.",
            "Thank you for your time!",
          ].join("\n"),
        },
      ],
      done: true,
    };
  }

  private handleProofCollection(text: string): PipelineMessageResult {
    if (text.trim().length === 0) {
      return { reply: "Please forward or type the published post content." };
    }

    this.phase = { kind: "completed" };

    return {
      replies: [
        {
          text: [
            this.rolePrefix("admin"),
            "",
            "✅ Thank you! Post confirmed.",
          ].join("\n"),
        },
        {
          text: [
            "═══════════════════════════",
            this.rolePrefix("buyer"),
            "═══════════════════════════",
          ].join("\n"),
        },
        {
          text: [
            "📢 Your ad has been published!",
            "",
            `Channel: ${this.channelTitle} (${this.channelUsername})`,
            `Price paid: ${this.agreedPrice ?? "agreed"} TON`,
            "",
            "Published post:",
            "───────────────",
            text.trim(),
            "───────────────",
            "",
            "🎉 Deal completed successfully!",
            "",
            "Use /test to run another simulation or /stop to exit.",
          ].join("\n"),
        },
      ],
      done: true,
    };
  }

  public async handleCallback(data: string): Promise<PipelineMessageResult> {
    // Stub — will be implemented in Phase 3+
    void data;
    return { reply: "Callback not yet implemented." };
  }
}
