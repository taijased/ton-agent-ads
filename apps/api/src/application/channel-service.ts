import type { ChannelRepository } from "@repo/db";
import type { Channel } from "@repo/types";

export class ChannelService {
  public constructor(private readonly channelRepository: ChannelRepository) {}

  public getChannels(): Promise<Channel[]> {
    return this.channelRepository.getChannels();
  }
}
