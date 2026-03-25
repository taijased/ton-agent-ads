import { useEffect, useState } from "react";
import type {
  CampaignNegotiationStartResult,
  CampaignWorkspaceBootstrapResult,
} from "@repo/types";
import { TonConnectButton } from "@tonconnect/ui-react";
import logoUrl from "./assets/logo.svg";
import { Button } from "./components/ui/Button";
import { BottomTabBar } from "./components/ui/BottomTabBar";
import { Card } from "./components/ui/Card";
import { LoadingCard } from "./components/ui/LoadingCard";
import { ScreenHeader } from "./components/ui/ScreenHeader";
import { CampaignDetailsScreen } from "./features/campaigns/screens/CampaignDetailsScreen";
import { CampaignsScreen } from "./features/campaigns/screens/CampaignsScreen";
import { apiCampaignsService } from "./features/campaigns/services/api-campaigns-service";
import { apiCampaignWorkspaceService } from "./features/campaigns/services/api-campaign-workspace-service";
import type { CampaignsService } from "./features/campaigns/services/campaigns-service";
import {
  createRecommendedChannelLookup,
  sortCampaignRecords,
  toCampaignDetailsView,
  toCampaignSummary,
  type CampaignWorkspace,
  type CampaignRecord,
} from "./features/campaigns/types";
import { listRecommendedChannels } from "./features/create-campaign/services/channel-lookup-service";
import { NewCampaignScreen } from "./features/create-campaign/screens/NewCampaignScreen";
import {
  cloneCampaignDraft,
  createCampaignDraftState,
  createEmptyCampaignDraftState,
  type CampaignDraft,
  type CampaignDraftState,
  type RecommendedChannel,
  type WizardStepId,
} from "./features/create-campaign/types";
import { loadProfile } from "./features/profile/services/profile-service";
import { LoginScreen } from "./features/profile/screens/LoginScreen";
import { ProfileScreen } from "./features/profile/screens/ProfileScreen";
import type { ProfileSummary } from "./features/profile/types";
import {
  authenticateWithTelegram,
  hasTelegramInitData,
} from "./lib/auth-service";
import {
  clearAuthToken,
  consumePostLoginHash,
  getAuthToken,
  rememberPostLoginHash,
} from "./lib/auth-storage";
import { AUTH_EXPIRED_EVENT } from "./lib/api";
import {
  type BottomTabId,
  parseRoute,
  toHash,
  type MiniAppRoute,
} from "./lib/route";
import { initializeTelegramWebApp } from "./lib/telegram-user";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";
type CampaignsLoadState = "loading" | "ready" | "empty" | "error";
type CampaignWorkspaceLoadState = "idle" | "loading" | "ready" | "error";
type CampaignEditStep = Exclude<WizardStepId, "finish">;
type CampaignDraftContext =
  | { mode: "create" }
  | { mode: "edit"; campaignId: string; step: CampaignEditStep };

const editableCampaignStepIds = new Set<CampaignEditStep>([
  "basic",
  "targeting",
  "creative",
  "budget",
  "channels",
]);

const getEditStep = (value?: string): CampaignEditStep => {
  if (value && editableCampaignStepIds.has(value as CampaignEditStep)) {
    return value as CampaignEditStep;
  }

  return "basic";
};

const getScreenTitle = (route: MiniAppRoute): string => {
  switch (route.name) {
    case "login":
      return "Login";
    case "campaigns":
      return "Campaigns";
    case "new-campaign":
      return "New Campaign";
    case "edit-campaign":
      return "Edit Campaign";
    case "profile":
      return "Profile";
    case "campaign-details":
      return "Campaign Details";
  }
};

const getActiveTab = (route: MiniAppRoute): BottomTabId => {
  switch (route.name) {
    case "new-campaign":
      return "new-campaign";
    case "profile":
      return "profile";
    default:
      return "campaigns";
  }
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Something went wrong while loading campaigns.";
};

const getCreateErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Campaign could not be created. Please try again.";
};

const getUpdateErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Campaign could not be updated. Please try again.";
};

const getWorkspaceErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Campaign workspace could not be loaded.";
};

const getBootstrapNoticeMessage = (
  result: CampaignWorkspaceBootstrapResult,
): string | null => {
  const problematicItems = result.items.filter(
    (item) => item.outcome === "unresolved" || item.outcome === "failed",
  );

  if (problematicItems.length === 0) {
    return null;
  }

  if (problematicItems.length === 1) {
    const [item] = problematicItems;

    return item?.message?.trim().length
      ? item.message
      : `One selected channel could not be started: ${item?.username}.`;
  }

  return `${problematicItems.length} selected channels could not be started automatically.`;
};

const getNegotiationStartNoticeMessage = (
  result: CampaignNegotiationStartResult,
): string | null => {
  if (result.readyChannelCount === 0) {
    return "No admin conversations were created because no channels were ready.";
  }

  if (
    result.createdThreadCount === 0 &&
    result.existingThreadCount > 0 &&
    result.failedThreadCount === 0
  ) {
    return "Negotiation is already active for the ready admin conversations.";
  }

  const fragments: string[] = [];

  if (result.createdThreadCount > 0) {
    fragments.push(
      `${result.createdThreadCount} conversation${
        result.createdThreadCount === 1 ? "" : "s"
      } started`,
    );
  }

  if (result.existingThreadCount > 0) {
    fragments.push(`${result.existingThreadCount} already existed`);
  }

  if (result.failedThreadCount > 0) {
    fragments.push(`${result.failedThreadCount} failed`);
  }

  if (fragments.length === 0) {
    return "Negotiation is active for this campaign.";
  }

  return `Negotiation is active. ${fragments.join(", ")}.`;
};

const getStartedCampaignStatus = (
  campaign: CampaignRecord,
): CampaignRecord["status"] => {
  switch (campaign.status) {
    case "Awaiting payment":
    case "Paid":
    case "Published":
    case "Failed":
    case "In negotiation":
      return campaign.status;
    case "Draft":
    case "Recommended":
    default:
      return "In negotiation";
  }
};

const createDraftStateFromCampaign = (
  campaign: CampaignRecord,
  step: WizardStepId = "basic",
): CampaignDraftState =>
  createCampaignDraftState(cloneCampaignDraft(campaign), step);

const CampaignEditorStateScreen = ({
  isLoading,
  onBack,
}: {
  isLoading: boolean;
  onBack: () => void;
}) => {
  return (
    <div className="screen-stack">
      <button className="details-back" onClick={onBack} type="button">
        Back to campaign
      </button>
      <ScreenHeader
        eyebrow="Campaign editor"
        subtitle={
          isLoading
            ? "Loading the selected campaign draft"
            : "This campaign is not available in the current list."
        }
        title={isLoading ? "Edit campaign" : "Campaign unavailable"}
      />
      {isLoading ? (
        <LoadingCard />
      ) : (
        <Card>
          <div className="form-section">
            <div>
              <h2 className="placeholder-card__title">Campaign not found</h2>
              <p className="placeholder-card__copy">
                Go back to the workspace or campaign list and choose another
                record to edit.
              </p>
            </div>
            <Button fullWidth onClick={onBack}>
              Back to campaign
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export const App = () => {
  const campaignsService: CampaignsService = apiCampaignsService;
  const [route, setRoute] = useState<MiniAppRoute>(() =>
    parseRoute(window.location.hash),
  );
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoginPending, setIsLoginPending] = useState(false);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [campaignsLoadState, setCampaignsLoadState] =
    useState<CampaignsLoadState>("loading");
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [campaignDraftState, setCampaignDraftState] =
    useState<CampaignDraftState>(() => createEmptyCampaignDraftState());
  const [campaignDraftContext, setCampaignDraftContext] =
    useState<CampaignDraftContext>({ mode: "create" });
  const [recommendedChannels, setRecommendedChannels] = useState<
    RecommendedChannel[]
  >([]);
  const [campaignWorkspaces, setCampaignWorkspaces] = useState<
    Record<string, CampaignWorkspace>
  >({});
  const [campaignWorkspaceLoadStates, setCampaignWorkspaceLoadStates] =
    useState<Record<string, CampaignWorkspaceLoadState>>({});
  const [campaignWorkspaceErrors, setCampaignWorkspaceErrors] = useState<
    Record<string, string | null>
  >({});
  const [campaignWorkspaceNotices, setCampaignWorkspaceNotices] = useState<
    Record<string, string | null>
  >({});
  const [channelAdminRetryStates, setChannelAdminRetryStates] = useState<
    Record<string, boolean>
  >({});
  const [campaignNegotiationStartStates, setCampaignNegotiationStartStates] =
    useState<Record<string, boolean>>({});

  const completeAuthentication = (nextProfile: ProfileSummary) => {
    setProfile(nextProfile);
    setAuthStatus("authenticated");
    setAuthError(null);
    setIsLoginPending(false);
  };

  const beginUnauthenticatedState = (message: string | null) => {
    clearAuthToken();
    setProfile(null);
    setAuthStatus("unauthenticated");
    setAuthError(message);
    setIsLoginPending(false);
  };

  useEffect(() => {
    initializeTelegramWebApp();

    const syncRoute = () => {
      const nextRoute = parseRoute(window.location.hash);
      const canonicalHash = toHash(nextRoute);

      setRoute(nextRoute);

      if (window.location.hash !== canonicalHash) {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}${canonicalHash}`,
        );
      }
    };

    syncRoute();
    window.addEventListener("hashchange", syncRoute);

    return () => {
      window.removeEventListener("hashchange", syncRoute);
    };
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      rememberPostLoginHash(window.location.hash || toHash(route));
      beginUnauthenticatedState("Your session expired. Please sign in again.");
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);

    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, [route]);

  useEffect(() => {
    let isCancelled = false;

    const bootstrapAuth = async () => {
      setAuthStatus("checking");
      setAuthError(null);

      try {
        if (getAuthToken() !== null) {
          const nextProfile = await loadProfile();

          if (!isCancelled) {
            completeAuthentication(nextProfile);
          }

          return;
        }

        if (!isCancelled) {
          beginUnauthenticatedState(null);
        }
      } catch (error: unknown) {
        if (!isCancelled) {
          beginUnauthenticatedState(
            error instanceof Error ? error.message : "Authentication failed.",
          );
        }
      }
    };

    void bootstrapAuth();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      setRecommendedChannels([]);
      return;
    }

    void listRecommendedChannels()
      .then((channels) => {
        setRecommendedChannels(channels);
      })
      .catch(() => {
        setRecommendedChannels([]);
      });
  }, [authStatus]);

  const navigate = (nextRoute: MiniAppRoute) => {
    const nextHash = toHash(nextRoute);

    if (window.location.hash === nextHash) {
      setRoute(nextRoute);
      return;
    }

    window.location.hash = nextHash;
  };

  const loadCampaigns = async () => {
    setCampaignsLoadState("loading");
    setCampaignsError(null);

    try {
      const nextCampaigns = await campaignsService.list();

      setCampaigns(sortCampaignRecords(nextCampaigns));
      setCampaignsLoadState(nextCampaigns.length === 0 ? "empty" : "ready");
    } catch (error: unknown) {
      setCampaigns([]);
      setCampaignsLoadState("error");
      setCampaignsError(getErrorMessage(error));
    }
  };

  useEffect(() => {
    if (authStatus !== "authenticated") {
      setCampaigns([]);
      setCampaignsLoadState("loading");
      setCampaignsError(null);
      return;
    }

    void loadCampaigns();
  }, [authStatus]);

  useEffect(() => {
    if (authStatus === "checking") {
      return;
    }

    if (authStatus === "unauthenticated") {
      rememberPostLoginHash(window.location.hash || "#/campaigns");

      if (route.name !== "login") {
        navigate({ name: "login" });
      }

      return;
    }

    if (route.name === "login") {
      const nextHash = consumePostLoginHash();

      if (nextHash !== null) {
        window.location.hash = nextHash;
        return;
      }

      navigate({ name: "campaigns" });
    }
  }, [authStatus, route]);

  const handleLogin = async () => {
    setIsLoginPending(true);
    setAuthError(null);

    try {
      await authenticateWithTelegram();
      const nextProfile = await loadProfile();
      completeAuthentication(nextProfile);
    } catch (error: unknown) {
      beginUnauthenticatedState(
        error instanceof Error ? error.message : "Authentication failed.",
      );
    }
  };

  const handleLogout = () => {
    beginUnauthenticatedState(null);
  };

  const openCreateCampaign = () => {
    setCampaignDraftContext({ mode: "create" });
    setCampaignDraftState(createEmptyCampaignDraftState());
    navigate({ name: "new-campaign" });
  };

  const openEditCampaign = (
    campaign: CampaignRecord,
    step: CampaignEditStep = "basic",
  ) => {
    setCampaignDraftContext({
      mode: "edit",
      campaignId: campaign.id,
      step,
    });
    setCampaignDraftState(createDraftStateFromCampaign(campaign, step));
    navigate({ name: "edit-campaign", campaignId: campaign.id, step });
  };

  const handleDraftPatch = (patch: Partial<CampaignDraft>) => {
    setCampaignDraftState((currentDraftState) => ({
      ...currentDraftState,
      draft: {
        ...currentDraftState.draft,
        ...patch,
      },
      submitError: null,
    }));
  };

  const handleStepChange = (step: WizardStepId) => {
    setCampaignDraftState((currentDraftState) => ({
      ...currentDraftState,
      step,
    }));
  };

  const handleAppendChannel = (channel: RecommendedChannel) => {
    setRecommendedChannels((currentChannels) => {
      const existingChannel = currentChannels.find(
        (item) =>
          item.id === channel.id ||
          item.username.toLowerCase() === channel.username.toLowerCase(),
      );

      if (existingChannel) {
        return currentChannels;
      }

      return [channel, ...currentChannels];
    });
  };

  const handleCreateCampaign = async () => {
    if (profile === null) {
      setCampaignDraftState((currentDraftState) => ({
        ...currentDraftState,
        submitError: "Profile is not loaded yet.",
        submitStatus: "idle",
      }));
      return;
    }

    setCampaignDraftState((currentDraftState) => ({
      ...currentDraftState,
      submitError: null,
      submitStatus: "submitting",
    }));

    try {
      let createdCampaign = await campaignsService.create(
        campaignDraftState.draft,
        profile,
      );
      const shortlistedChannels = createdCampaign.shortlistedChannelIds
        .map((channelId) => recommendedChannelLookup.get(channelId) ?? null)
        .filter((channel): channel is RecommendedChannel => channel !== null);

      let workspaceNoticeMessage: string | null = null;

      if (shortlistedChannels.length > 0) {
        try {
          const bootstrapResult =
            await apiCampaignWorkspaceService.bootstrapShortlist(
              createdCampaign.id,
              shortlistedChannels,
            );

          workspaceNoticeMessage = getBootstrapNoticeMessage(bootstrapResult);

          const refreshedCampaign = await campaignsService.getById(
            createdCampaign.id,
          );

          if (refreshedCampaign !== null) {
            createdCampaign = {
              ...createdCampaign,
              status: refreshedCampaign.status,
              createdAt: refreshedCampaign.createdAt,
              updatedAt: refreshedCampaign.updatedAt,
            };
          }
        } catch (error: unknown) {
          workspaceNoticeMessage = getWorkspaceErrorMessage(error);
        }
      }

      setCampaigns((currentCampaigns) =>
        sortCampaignRecords([createdCampaign, ...currentCampaigns]),
      );
      setCampaignWorkspaceNotices((currentNotices) => ({
        ...currentNotices,
        [createdCampaign.id]: workspaceNoticeMessage,
      }));
      setCampaignsError(null);
      setCampaignsLoadState("ready");
      setCampaignDraftContext({ mode: "create" });
      setCampaignDraftState(createEmptyCampaignDraftState());
      navigate({ name: "campaign-details", campaignId: createdCampaign.id });
    } catch (error: unknown) {
      setCampaignDraftState((currentDraftState) => ({
        ...currentDraftState,
        submitError: getCreateErrorMessage(error),
        submitStatus: "idle",
      }));
    }
  };

  const selectedCampaign =
    route.name === "campaign-details"
      ? (campaigns.find((campaign) => campaign.id === route.campaignId) ?? null)
      : null;
  const selectedEditCampaign =
    route.name === "edit-campaign"
      ? (campaigns.find((campaign) => campaign.id === route.campaignId) ?? null)
      : null;
  const selectedEditStep =
    route.name === "edit-campaign" ? getEditStep(route.step) : null;
  const recommendedChannelLookup =
    createRecommendedChannelLookup(recommendedChannels);

  useEffect(() => {
    if (
      route.name === "new-campaign" &&
      campaignDraftContext.mode !== "create"
    ) {
      setCampaignDraftContext({ mode: "create" });
      setCampaignDraftState(createEmptyCampaignDraftState());
      return;
    }

    if (route.name !== "edit-campaign" || selectedEditCampaign === null) {
      return;
    }

    const resolvedEditStep = selectedEditStep ?? "basic";

    if (
      campaignDraftContext.mode === "edit" &&
      campaignDraftContext.campaignId === selectedEditCampaign.id &&
      campaignDraftContext.step === resolvedEditStep
    ) {
      return;
    }

    setCampaignDraftContext({
      mode: "edit",
      campaignId: selectedEditCampaign.id,
      step: resolvedEditStep,
    });
    setCampaignDraftState(
      createDraftStateFromCampaign(selectedEditCampaign, resolvedEditStep),
    );
  }, [
    campaignDraftContext.mode,
    campaignDraftContext.mode === "edit"
      ? campaignDraftContext.campaignId
      : null,
    campaignDraftContext.mode === "edit" ? campaignDraftContext.step : null,
    route,
    selectedEditCampaign,
    selectedEditStep,
  ]);

  const handleUpdateCampaign = async () => {
    if (campaignDraftContext.mode !== "edit") {
      return;
    }

    const campaignId = campaignDraftContext.campaignId;
    const previousCampaign = campaigns.find(
      (campaign) => campaign.id === campaignId,
    );

    if (!previousCampaign) {
      setCampaignDraftState((currentDraftState) => ({
        ...currentDraftState,
        submitError: "Campaign not found",
        submitStatus: "idle",
      }));
      return;
    }

    setCampaignDraftState((currentDraftState) => ({
      ...currentDraftState,
      submitError: null,
      submitStatus: "submitting",
    }));

    try {
      let updatedCampaign = await campaignsService.update(
        campaignId,
        campaignDraftState.draft,
      );
      let workspaceNoticeMessage: string | null = null;
      const addedShortlistedChannels = updatedCampaign.shortlistedChannelIds
        .filter(
          (channelId) =>
            !previousCampaign.shortlistedChannelIds.includes(channelId),
        )
        .map((channelId) => recommendedChannelLookup.get(channelId) ?? null)
        .filter((channel): channel is RecommendedChannel => channel !== null);

      if (addedShortlistedChannels.length > 0) {
        try {
          const bootstrapResult =
            await apiCampaignWorkspaceService.bootstrapShortlist(
              campaignId,
              addedShortlistedChannels,
            );

          workspaceNoticeMessage = getBootstrapNoticeMessage(bootstrapResult);
        } catch (error: unknown) {
          workspaceNoticeMessage = getWorkspaceErrorMessage(error);
        }
      }

      const refreshedCampaign = await campaignsService.getById(campaignId);

      if (refreshedCampaign !== null) {
        updatedCampaign = {
          ...updatedCampaign,
          status: refreshedCampaign.status,
          createdAt: refreshedCampaign.createdAt,
          updatedAt: refreshedCampaign.updatedAt,
        };
      }

      setCampaigns((currentCampaigns) =>
        sortCampaignRecords(
          currentCampaigns.map((campaign) =>
            campaign.id === campaignId ? updatedCampaign : campaign,
          ),
        ),
      );
      setCampaignWorkspaceNotices((currentNotices) => ({
        ...currentNotices,
        [campaignId]: workspaceNoticeMessage,
      }));
      setCampaignsError(null);
      setCampaignsLoadState("ready");
      setCampaignDraftState(
        createDraftStateFromCampaign(
          updatedCampaign,
          selectedEditStep ?? "basic",
        ),
      );
      navigate({ name: "campaign-details", campaignId });
    } catch (error: unknown) {
      setCampaignDraftState((currentDraftState) => ({
        ...currentDraftState,
        submitError: getUpdateErrorMessage(error),
        submitStatus: "idle",
      }));
    }
  };

  const getCampaignWorkspaceService = () => apiCampaignWorkspaceService;

  const loadCampaignWorkspace = async (campaignId: string) => {
    setCampaignWorkspaceLoadStates((currentLoadStates) => ({
      ...currentLoadStates,
      [campaignId]: "loading",
    }));
    setCampaignWorkspaceErrors((currentErrors) => ({
      ...currentErrors,
      [campaignId]: null,
    }));

    try {
      const workspaceService = getCampaignWorkspaceService();
      const workspace = await workspaceService.getByCampaignId(campaignId);

      setCampaignWorkspaces((currentWorkspaces) => ({
        ...currentWorkspaces,
        [campaignId]: workspace,
      }));
      setCampaignWorkspaceLoadStates((currentLoadStates) => ({
        ...currentLoadStates,
        [campaignId]: "ready",
      }));
    } catch (error: unknown) {
      setCampaignWorkspaceLoadStates((currentLoadStates) => ({
        ...currentLoadStates,
        [campaignId]: "error",
      }));
      setCampaignWorkspaceErrors((currentErrors) => ({
        ...currentErrors,
        [campaignId]: getWorkspaceErrorMessage(error),
      }));
    }
  };

  const handleRetryChannelAdminParse = async (
    campaignId: string,
    channelId: string,
  ) => {
    const retryKey = `${campaignId}:${channelId}`;
    const previousWorkspace = campaignWorkspaces[campaignId] ?? null;
    const workspaceService = getCampaignWorkspaceService();

    setCampaignWorkspaceErrors((currentErrors) => ({
      ...currentErrors,
      [campaignId]: null,
    }));
    setChannelAdminRetryStates((currentStates) => ({
      ...currentStates,
      [retryKey]: true,
    }));
    setCampaignWorkspaces((currentWorkspaces) => {
      const workspace = currentWorkspaces[campaignId];

      if (workspace === undefined) {
        return currentWorkspaces;
      }

      return {
        ...currentWorkspaces,
        [campaignId]: {
          ...workspace,
          wishlistCards: workspace.wishlistCards.map((card) =>
            card.channelId === channelId
              ? {
                  ...card,
                  adminParseStatus: "parsing",
                  readinessStatus: "unknown",
                }
              : card,
          ),
        },
      };
    });

    try {
      const updatedCard = await workspaceService.retryAdminParse(
        campaignId,
        channelId,
      );

      setCampaignWorkspaces((currentWorkspaces) => {
        const workspace = currentWorkspaces[campaignId];

        if (workspace === undefined) {
          return currentWorkspaces;
        }

        return {
          ...currentWorkspaces,
          [campaignId]: {
            ...workspace,
            wishlistCards: workspace.wishlistCards.map((card) =>
              card.channelId === channelId ? updatedCard : card,
            ),
          },
        };
      });
      void loadCampaignWorkspace(campaignId);
    } catch (error: unknown) {
      if (previousWorkspace !== null) {
        setCampaignWorkspaces((currentWorkspaces) => ({
          ...currentWorkspaces,
          [campaignId]: previousWorkspace,
        }));
      }

      setCampaignWorkspaceErrors((currentErrors) => ({
        ...currentErrors,
        [campaignId]: getWorkspaceErrorMessage(error),
      }));
    } finally {
      setChannelAdminRetryStates((currentStates) => ({
        ...currentStates,
        [retryKey]: false,
      }));
    }
  };

  const handleStartNegotiation = async (campaignId: string) => {
    const workspaceService = getCampaignWorkspaceService();

    setCampaignWorkspaceErrors((currentErrors) => ({
      ...currentErrors,
      [campaignId]: null,
    }));
    setCampaignWorkspaceNotices((currentNotices) => ({
      ...currentNotices,
      [campaignId]: null,
    }));
    setCampaignNegotiationStartStates((currentStates) => ({
      ...currentStates,
      [campaignId]: true,
    }));

    try {
      const result = await workspaceService.startNegotiation(campaignId);

      setCampaigns((currentCampaigns) =>
        sortCampaignRecords(
          currentCampaigns.map((campaign) =>
            campaign.id === campaignId
              ? {
                  ...campaign,
                  status: getStartedCampaignStatus(campaign),
                  negotiationStartedAt:
                    result.negotiationStartedAt ??
                    campaign.negotiationStartedAt,
                  negotiationStatus: result.negotiationStatus,
                  updatedAt: result.negotiationStartedAt ?? campaign.updatedAt,
                }
              : campaign,
          ),
        ),
      );
      setCampaignWorkspaceNotices((currentNotices) => ({
        ...currentNotices,
        [campaignId]: getNegotiationStartNoticeMessage(result),
      }));

      await loadCampaignWorkspace(campaignId);
    } catch (error: unknown) {
      setCampaignWorkspaceErrors((currentErrors) => ({
        ...currentErrors,
        [campaignId]: getWorkspaceErrorMessage(error),
      }));
    } finally {
      setCampaignNegotiationStartStates((currentStates) => ({
        ...currentStates,
        [campaignId]: false,
      }));
    }
  };

  useEffect(() => {
    if (route.name !== "campaign-details" || selectedCampaign === null) {
      return;
    }

    void loadCampaignWorkspace(selectedCampaign.id);
  }, [
    campaigns,
    campaignsService,
    recommendedChannels,
    route,
    selectedCampaign?.id,
    selectedCampaign?.updatedAt,
  ]);

  const campaignSummaries = campaigns.map((campaign) =>
    toCampaignSummary(campaign, recommendedChannelLookup),
  );
  const selectedCampaignView =
    selectedCampaign === null
      ? null
      : toCampaignDetailsView(selectedCampaign, recommendedChannelLookup);
  const selectedCampaignWorkspace =
    route.name === "campaign-details"
      ? (campaignWorkspaces[route.campaignId] ?? null)
      : null;
  const selectedCampaignWorkspaceLoadState =
    route.name === "campaign-details"
      ? (campaignWorkspaceLoadStates[route.campaignId] ?? "idle")
      : "idle";
  const selectedCampaignWorkspaceError =
    route.name === "campaign-details"
      ? (campaignWorkspaceErrors[route.campaignId] ?? null)
      : null;
  const selectedCampaignWorkspaceNotice =
    route.name === "campaign-details"
      ? (campaignWorkspaceNotices[route.campaignId] ?? null)
      : null;
  const selectedCampaignIsStartingNegotiation =
    route.name === "campaign-details"
      ? (campaignNegotiationStartStates[route.campaignId] ?? false)
      : false;

  if (authStatus === "checking") {
    return (
      <div className="app-shell">
        <div className="app-frame">
          <header className="app-topbar">
            <div className="app-topbar__brand">
              <div className="app-topbar__brand-mark">
                <img
                  alt="AdAgent logo"
                  className="app-topbar__brand-logo"
                  src={logoUrl}
                />
              </div>
              <div>
                <div className="app-topbar__eyebrow">Campaign AI Manager</div>
                <div className="app-topbar__title">Checking session</div>
              </div>
            </div>
          </header>

          <main className="screen-viewport">
            <div className="screen-stack">
              <ScreenHeader
                eyebrow="Authentication"
                subtitle="Verifying your Telegram mini app session before loading campaigns and profile data."
                title="Checking session"
              />
              <LoadingCard />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    return (
      <div className="app-shell">
        <div className="app-frame">
          <header className="app-topbar">
            <div className="app-topbar__brand">
              <div className="app-topbar__brand-mark">
                <img
                  alt="AdAgent logo"
                  className="app-topbar__brand-logo"
                  src={logoUrl}
                />
              </div>
              <div>
                <div className="app-topbar__eyebrow">Campaign AI Manager</div>
                <div className="app-topbar__title">Login</div>
              </div>
            </div>
          </header>

          <main className="screen-viewport">
            <LoginScreen
              canUseTelegramInitData={hasTelegramInitData()}
              errorMessage={authError}
              isSubmitting={isLoginPending}
              onContinue={() => {
                void handleLogin();
              }}
            />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-frame">
        <header className="app-topbar">
          <div className="app-topbar__brand">
            <div className="app-topbar__brand-mark">
              <img
                alt="AdAgent logo"
                className="app-topbar__brand-logo"
                src={logoUrl}
              />
            </div>
            <div>
              <div className="app-topbar__eyebrow">Campaign AI Manager</div>
              <div className="app-topbar__title">{getScreenTitle(route)}</div>
            </div>
          </div>

          <div className="app-topbar__wallet">
            <TonConnectButton className="ton-connect-button--header" />
          </div>
        </header>

        <main className="screen-viewport">
          {route.name === "campaigns" ? (
            <CampaignsScreen
              campaigns={campaignSummaries}
              errorMessage={campaignsError}
              loadState={campaignsLoadState}
              onCreateCampaign={openCreateCampaign}
              onOpenCampaign={(campaignId) =>
                navigate({ name: "campaign-details", campaignId })
              }
              onRetry={() => {
                void loadCampaigns();
              }}
            />
          ) : null}

          {route.name === "new-campaign" ? (
            <NewCampaignScreen
              draftState={campaignDraftState}
              onBack={() => navigate({ name: "campaigns" })}
              mode="create"
              onAppendChannel={handleAppendChannel}
              onDraftPatch={handleDraftPatch}
              onStepChange={handleStepChange}
              onSubmit={handleCreateCampaign}
              recommendedChannels={recommendedChannels}
            />
          ) : null}

          {route.name === "profile" ? (
            profile !== null ? (
              <ProfileScreen onLogout={handleLogout} profile={profile} />
            ) : (
              <LoadingCard />
            )
          ) : null}

          {route.name === "edit-campaign" ? (
            campaignsLoadState === "loading" ||
            (campaignDraftContext.mode !== "edit" &&
              selectedEditCampaign !== null) ? (
              <CampaignEditorStateScreen
                isLoading
                onBack={() =>
                  navigate({
                    name: "campaign-details",
                    campaignId: route.campaignId,
                  })
                }
              />
            ) : selectedEditCampaign === null ? (
              <CampaignEditorStateScreen
                isLoading={false}
                onBack={() =>
                  navigate({
                    name: "campaign-details",
                    campaignId: route.campaignId,
                  })
                }
              />
            ) : (
              <NewCampaignScreen
                backLabel="Back to campaign"
                draftState={campaignDraftState}
                focusedStep={selectedEditStep}
                mode="edit"
                onBack={() =>
                  navigate({
                    name: "campaign-details",
                    campaignId: route.campaignId,
                  })
                }
                onAppendChannel={handleAppendChannel}
                onDraftPatch={handleDraftPatch}
                onStepChange={handleStepChange}
                onSubmit={handleUpdateCampaign}
                recommendedChannels={recommendedChannels}
              />
            )
          ) : null}

          {route.name === "campaign-details" ? (
            <CampaignDetailsScreen
              campaign={selectedCampaignView}
              errorMessage={
                campaignsLoadState === "error" ? campaignsError : null
              }
              isLoading={campaignsLoadState === "loading"}
              isWorkspaceLoading={
                selectedCampaign !== null &&
                (selectedCampaignWorkspaceLoadState === "idle" ||
                  selectedCampaignWorkspaceLoadState === "loading")
              }
              isStartingNegotiation={selectedCampaignIsStartingNegotiation}
              isRetryingChannelAdminParse={(channelId) => {
                if (selectedCampaign === null) {
                  return false;
                }

                return (
                  channelAdminRetryStates[
                    `${selectedCampaign.id}:${channelId}`
                  ] === true
                );
              }}
              onBack={() => navigate({ name: "campaigns" })}
              onEdit={(step) => {
                if (selectedCampaign !== null) {
                  openEditCampaign(selectedCampaign, step);
                }
              }}
              onRetryWorkspace={() => {
                if (route.name === "campaign-details") {
                  void loadCampaignWorkspace(route.campaignId);
                }
              }}
              onStartNegotiation={() => {
                if (selectedCampaign !== null) {
                  void handleStartNegotiation(selectedCampaign.id);
                }
              }}
              onRetryChannelAdminParse={(channelId) => {
                if (selectedCampaign !== null) {
                  void handleRetryChannelAdminParse(
                    selectedCampaign.id,
                    channelId,
                  );
                }
              }}
              workspace={selectedCampaignWorkspace}
              workspaceErrorMessage={selectedCampaignWorkspaceError}
              workspaceNoticeMessage={selectedCampaignWorkspaceNotice}
            />
          ) : null}
        </main>

        <BottomTabBar
          activeTab={getActiveTab(route)}
          onSelect={(tabId) => {
            if (tabId === "campaigns") {
              navigate({ name: "campaigns" });
              return;
            }

            if (tabId === "new-campaign") {
              openCreateCampaign();
              return;
            }

            navigate({ name: "profile" });
          }}
        />
      </div>
    </div>
  );
};
