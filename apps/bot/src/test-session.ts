import {
  InMemoryCampaignRepository,
  InMemoryChannelRepository,
  InMemoryDealApprovalRequestRepository,
  InMemoryDealExternalThreadRepository,
  InMemoryDealMessageRepository,
  InMemoryDealRepository,
} from "@repo/db";
import {
  DealNegotiationService,
  NegotiationLlmService,
} from "@repo/api";
import type { SendAdminMessageResult } from "@repo/api";
import type { DealApprovalRequest } from "@repo/types";
import { testScenarios } from "./test-scenarios.js";

export interface TestSessionResult {
  outreachMessage: string;
  scenarioName: string;
  scenarioDescription: string;
  campaignBudget: string;
  channelTitle: string;
  channelUsername: string;
  contactValue: string;
}

class TestChatAdminClient {
  public constructor(
    private readonly sendReply: (text: string) => Promise<void>,
  ) {}

  public async sendAdminMessage(
    _username: string,
    text: string,
  ): Promise<SendAdminMessageResult> {
    await this.sendReply(text);
    return { messageId: "test-msg-" + Date.now(), chatId: "test-chat" };
  }
}

class TestBotNotifier {
  public readonly notifications: Array<{
    chatId: string;
    approvalRequest: DealApprovalRequest;
  }> = [];

  public async sendApprovalRequestNotification(input: {
    chatId: string;
    channelTitle: string;
    channelUsername: string;
    contactValue: string | null;
    approvalRequest: DealApprovalRequest;
  }): Promise<void> {
    this.notifications.push({
      chatId: input.chatId,
      approvalRequest: input.approvalRequest,
    });
  }
}

export class TestSession {
  private negotiationService: DealNegotiationService | undefined;
  private currentDealId: string | undefined;
  private readonly scenarioIndex: number;
  private readonly userId: string;
  private readonly sendReply: (text: string) => Promise<void>;
  private readonly testChatId = "test-chat";

  public constructor(
    userId: string,
    scenarioIndex: number,
    sendReply: (text: string) => Promise<void>,
  ) {
    this.userId = userId;
    this.scenarioIndex = Math.max(0, Math.min(scenarioIndex, testScenarios.length - 1));
    this.sendReply = sendReply;
  }

  public async start(): Promise<TestSessionResult> {
    const scenario = testScenarios[this.scenarioIndex];

    const campaignRepo = new InMemoryCampaignRepository();
    const channelRepo = new InMemoryChannelRepository();
    const dealRepo = new InMemoryDealRepository();
    const dealMessageRepo = new InMemoryDealMessageRepository();
    const dealApprovalRepo = new InMemoryDealApprovalRequestRepository();
    const dealExternalThreadRepo = new InMemoryDealExternalThreadRepository();

    const campaign = await campaignRepo.create({
      userId: this.userId,
      text: scenario.campaign.text,
      budgetAmount: scenario.campaign.budgetAmount,
      budgetCurrency: scenario.campaign.budgetCurrency,
      theme: scenario.campaign.theme,
      language: scenario.campaign.language,
      goal: scenario.campaign.goal,
    });

    const channel = await channelRepo.saveParsedChannel({
      id: scenario.channel.id,
      username: scenario.channel.username,
      title: scenario.channel.title,
      description: scenario.channel.description,
      category: "telegram",
      price: scenario.channel.price,
      avgViews: scenario.channel.avgViews,
      contacts: scenario.channel.contacts,
    });

    const deal = await dealRepo.createDeal({
      campaignId: campaign.id,
      channelId: channel.id,
      price: scenario.dealPrice,
      status: "admin_contacted",
    });

    this.currentDealId = deal.id;

    const contactValue =
      scenario.channel.contacts.find((c) => c.isAdsContact)?.value ??
      scenario.channel.contacts[0]?.value ??
      scenario.channel.username;

    await dealExternalThreadRepo.create({
      dealId: deal.id,
      platform: "telegram",
      chatId: this.testChatId,
      contactValue,
    });

    const testAdminClient = new TestChatAdminClient(this.sendReply);
    const testBotNotifier = new TestBotNotifier();
    const negotiationLlmService = new NegotiationLlmService();

    this.negotiationService = new DealNegotiationService(
      campaignRepo,
      channelRepo,
      dealRepo,
      dealMessageRepo,
      dealApprovalRepo,
      dealExternalThreadRepo,
      negotiationLlmService,
      testAdminClient as never,
      testBotNotifier as never,
    );

    const normalizedDescription = channel.description?.toLowerCase() ?? "";
    const intro =
      normalizedDescription.includes("ads") ||
      normalizedDescription.includes("реклама")
        ? `Hello! We found ${channel.title} and saw that advertising requests are handled here.`
        : normalizedDescription.includes("promo") ||
            normalizedDescription.includes("collab") ||
            normalizedDescription.includes("сотруднич")
          ? `Hello! We are reaching out about a possible collaboration with ${channel.title}.`
          : `Hello! We would like to discuss a potential ad placement in ${channel.title}.`;

    const outreachMessage = [
      intro,
      "",
      `Campaign ID: ${campaign.id}`,
      `Requested channel: ${channel.title} (${channel.username})`,
      `Campaign text: ${campaign.text}`,
      scenario.campaign.theme ? `Theme: ${scenario.campaign.theme}` : null,
      scenario.campaign.language ? `Language: ${scenario.campaign.language}` : null,
      scenario.campaign.goal ? `Goal: ${scenario.campaign.goal}` : null,
      `Proposed placement price: ${deal.price} TON`,
      "",
      "Could you please share your available ad formats, conditions, and your current rate for this placement?",
    ]
      .filter((value): value is string => value !== null)
      .join("\n");

    await dealMessageRepo.create({
      dealId: deal.id,
      direction: "outbound",
      senderType: "agent",
      contactValue,
      text: outreachMessage,
      externalMessageId: null,
    });

    return {
      outreachMessage,
      scenarioName: scenario.name,
      scenarioDescription: scenario.description,
      campaignBudget: scenario.campaign.budgetAmount,
      channelTitle: channel.title,
      channelUsername: channel.username,
      contactValue,
    };
  }

  public async handleAdminMessage(
    text: string,
  ): Promise<{
    action: string;
    replyText?: string;
    summary?: string;
    approvalRequestId?: string;
  }> {
    if (this.negotiationService === undefined) {
      throw new Error("Test session not started");
    }

    const result = await this.negotiationService.handleIncomingAdminMessage({
      platform: "telegram",
      chatId: this.testChatId,
      text,
    });

    if (!result.matched) {
      throw new Error("Message did not match any deal thread");
    }

    return {
      action: result.action ?? "unknown",
      approvalRequestId: result.approvalRequestId,
    };
  }

  public async approveApproval(
    approvalRequestId: string,
  ): Promise<{ confirmationText: string; dealStatus: string }> {
    if (this.negotiationService === undefined) {
      throw new Error("Test session not started");
    }

    const result =
      await this.negotiationService.approveApprovalRequest(approvalRequestId);

    return {
      confirmationText: `Deal approved — status: ${result.deal.status}`,
      dealStatus: result.deal.status,
    };
  }

  public async rejectApproval(
    approvalRequestId: string,
  ): Promise<{ dealStatus: string }> {
    if (this.negotiationService === undefined) {
      throw new Error("Test session not started");
    }

    const result =
      await this.negotiationService.rejectApprovalRequest(approvalRequestId);

    return { dealStatus: result.deal.status };
  }

  public async counterApproval(
    approvalRequestId: string,
    text: string,
  ): Promise<{ dealStatus: string }> {
    if (this.negotiationService === undefined) {
      throw new Error("Test session not started");
    }

    const result = await this.negotiationService.counterApprovalRequest(
      approvalRequestId,
      text,
    );

    return { dealStatus: result.deal.status };
  }

  public get dealId(): string {
    if (this.currentDealId === undefined) {
      throw new Error("Test session not started");
    }
    return this.currentDealId;
  }
}
