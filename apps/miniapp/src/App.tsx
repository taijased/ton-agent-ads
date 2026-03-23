import { useEffect, useState } from "react";
import logoUrl from "./assets/logo.svg";
import { BottomTabBar } from "./components/ui/BottomTabBar";
import { CampaignDetailsScreen } from "./features/campaigns/screens/CampaignDetailsScreen";
import { CampaignsScreen } from "./features/campaigns/screens/CampaignsScreen";
import { apiCampaignsService } from "./features/campaigns/services/api-campaigns-service";
import type { CampaignsService } from "./features/campaigns/services/campaigns-service";
import { mockCampaignsService } from "./features/campaigns/services/mock-campaigns-service";
import {
  createRecommendedChannelLookup,
  sortCampaignRecords,
  toCampaignDetailsView,
  toCampaignSummary,
  type CampaignRecord,
} from "./features/campaigns/types";
import { NewCampaignScreen } from "./features/create-campaign/screens/NewCampaignScreen";
import { recommendedChannels as baseRecommendedChannels } from "./features/create-campaign/mocks/recommended-channels";
import {
  createEmptyCampaignDraftState,
  type CampaignDraft,
  type CampaignDraftState,
  type RecommendedChannel,
  type WizardStepId,
} from "./features/create-campaign/types";
import { mockProfile } from "./features/profile/mocks/profile";
import { ProfileScreen } from "./features/profile/screens/ProfileScreen";
import {
  type BottomTabId,
  parseRoute,
  toHash,
  type MiniAppRoute,
} from "./lib/route";

type CampaignsLoadState = "loading" | "ready" | "empty" | "error";

const selectCampaignsService = (): CampaignsService => {
  const params = new URLSearchParams(window.location.search);
  return params.get("source") === "api"
    ? apiCampaignsService
    : mockCampaignsService;
};

const getScreenTitle = (route: MiniAppRoute): string => {
  switch (route.name) {
    case "campaigns":
      return "Campaigns";
    case "new-campaign":
      return "New Campaign";
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

export const App = () => {
  const [campaignsService] = useState<CampaignsService>(() =>
    selectCampaignsService(),
  );
  const profile = mockProfile;
  const [route, setRoute] = useState<MiniAppRoute>(() =>
    parseRoute(window.location.hash),
  );
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [campaignsLoadState, setCampaignsLoadState] =
    useState<CampaignsLoadState>("loading");
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [campaignDraftState, setCampaignDraftState] =
    useState<CampaignDraftState>(() => createEmptyCampaignDraftState());
  const [recommendedChannels, setRecommendedChannels] = useState<
    RecommendedChannel[]
  >(() => baseRecommendedChannels);

  useEffect(() => {
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
    void loadCampaigns();
  }, []);

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
    setCampaignDraftState((currentDraftState) => ({
      ...currentDraftState,
      submitError: null,
      submitStatus: "submitting",
    }));

    try {
      const createdCampaign = await campaignsService.create(
        campaignDraftState.draft,
        profile,
      );

      setCampaigns((currentCampaigns) =>
        sortCampaignRecords([createdCampaign, ...currentCampaigns]),
      );
      setCampaignsError(null);
      setCampaignsLoadState("ready");
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
  const recommendedChannelLookup =
    createRecommendedChannelLookup(recommendedChannels);
  const campaignSummaries = campaigns.map((campaign) =>
    toCampaignSummary(campaign, recommendedChannelLookup),
  );
  const selectedCampaignView =
    selectedCampaign === null
      ? null
      : toCampaignDetailsView(selectedCampaign, recommendedChannelLookup);

  const runtimeLabel =
    campaignsService === mockCampaignsService ? "Mock mode" : "API mode";

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
              <div className="app-topbar__eyebrow">TON AdAgent</div>
              <div className="app-topbar__title">{getScreenTitle(route)}</div>
            </div>
          </div>

          <div className="app-topbar__meta">
            <span className="runtime-pill">{runtimeLabel}</span>
            <span className="app-topbar__hint">Telegram-ready</span>
          </div>
        </header>

        <main className="screen-viewport">
          {route.name === "campaigns" ? (
            <CampaignsScreen
              campaigns={campaignSummaries}
              errorMessage={campaignsError}
              loadState={campaignsLoadState}
              onCreateCampaign={() => navigate({ name: "new-campaign" })}
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
              onAppendChannel={handleAppendChannel}
              onDraftPatch={handleDraftPatch}
              onStepChange={handleStepChange}
              onSubmit={handleCreateCampaign}
              recommendedChannels={recommendedChannels}
            />
          ) : null}

          {route.name === "profile" ? (
            <ProfileScreen profile={profile} />
          ) : null}

          {route.name === "campaign-details" ? (
            <CampaignDetailsScreen
              campaign={selectedCampaignView}
              errorMessage={
                campaignsLoadState === "error" ? campaignsError : null
              }
              isLoading={campaignsLoadState === "loading"}
              onBack={() => navigate({ name: "campaigns" })}
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
              navigate({ name: "new-campaign" });
              return;
            }

            navigate({ name: "profile" });
          }}
        />
      </div>
    </div>
  );
};
