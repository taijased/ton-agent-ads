import type { Channel, SaveParsedChannelInput } from "@repo/types";

export interface ChannelRepository {
  getChannels(): Promise<Channel[]>;
  getChannelById(id: string): Promise<Channel | undefined>;
  saveParsedChannel(input: SaveParsedChannelInput): Promise<Channel>;
}
