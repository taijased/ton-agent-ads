import type { Channel } from "@repo/types";

export interface ChannelRepository {
  getChannels(): Promise<Channel[]>;
  getChannelById(id: string): Promise<Channel | undefined>;
}
