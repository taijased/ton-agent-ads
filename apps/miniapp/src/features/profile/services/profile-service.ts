import type { ProfileSummary } from "@repo/types";
import { apiRequest } from "../../../lib/api";

export const loadProfile = async (): Promise<ProfileSummary> =>
  apiRequest<ProfileSummary>("/api/profile");
