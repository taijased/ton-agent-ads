import type { Channel } from "@repo/types";

export interface ChannelRepository {
  getChannels(): Channel[];
  getChannelById(id: string): Channel | undefined;
}
