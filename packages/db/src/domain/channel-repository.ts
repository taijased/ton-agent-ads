import type {
  Channel,
  SaveChannelAdminParsingResultInput,
  SaveParsedChannelInput,
  SetChannelAdminParsingStateInput,
} from "@repo/types";

export interface ChannelRepository {
  getChannels(): Promise<Channel[]>;
  getChannelById(id: string): Promise<Channel | undefined>;
  saveParsedChannel(input: SaveParsedChannelInput): Promise<Channel>;
  setAdminParsingState(
    input: SetChannelAdminParsingStateInput,
  ): Promise<Channel | undefined>;
  saveAdminParsingResult(
    input: SaveChannelAdminParsingResultInput,
  ): Promise<Channel | undefined>;
}
