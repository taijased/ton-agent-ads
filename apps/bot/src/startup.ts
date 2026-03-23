type BotCommand = {
  command: string;
  description: string;
};

type BotApi = {
  setMyCommands(commands: BotCommand[]): Promise<unknown>;
};

export type BotRuntime = {
  api: BotApi;
  start(): Promise<void>;
  stop(): void;
};

type RuntimeProcess = {
  once(signal: NodeJS.Signals, listener: () => void): unknown;
  removeListener(signal: NodeJS.Signals, listener: () => void): unknown;
};

type StartupLogger = {
  error(message: string): void;
};

export class BotStartupConflictError extends Error {
  constructor(cause: unknown) {
    super(DUPLICATE_POLLER_MESSAGE, { cause });
    this.name = "BotStartupConflictError";
  }
}

export const startupCommands: BotCommand[] = [
  { command: "start", description: "Reset bot and show welcome message" },
  { command: "new", description: "Create a new ad campaign" },
  { command: "create_post", description: "Generate an ad post with AI" },
  { command: "test", description: "Start test mode (simulate negotiation)" },
  {
    command: "test_new",
    description: "Real negotiation test with channel selection",
  },
  {
    command: "test_search",
    description: "Search Telegram channels by keywords",
  },
  {
    command: "test_negotiation",
    description: "Test negotiation only (1-5)",
  },
  { command: "stop", description: "Exit test mode" },
];

export const DUPLICATE_POLLER_MESSAGE =
  "Another bot process is already polling this BOT_TOKEN. Stop the other instance before starting a new one.";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isPollingConflictError = (error: unknown): boolean => {
  if (!isRecord(error)) {
    return false;
  }

  return (
    error.error_code === 409 &&
    error.method === "getUpdates" &&
    typeof error.description === "string" &&
    error.description.includes("terminated by other getUpdates request")
  );
};

export const registerShutdownHandlers = (
  bot: Pick<BotRuntime, "stop">,
  runtimeProcess: RuntimeProcess = process,
): (() => void) => {
  let stopped = false;

  const cleanup = (): void => {
    runtimeProcess.removeListener("SIGINT", stopPolling);
    runtimeProcess.removeListener("SIGTERM", stopPolling);
  };

  const stopPolling = (): void => {
    if (stopped) {
      return;
    }

    stopped = true;
    cleanup();
    bot.stop();
  };

  runtimeProcess.once("SIGINT", stopPolling);
  runtimeProcess.once("SIGTERM", stopPolling);

  return cleanup;
};

type StartBotRuntimeOptions = {
  bot: BotRuntime;
  logger?: StartupLogger;
  runtimeProcess?: RuntimeProcess;
};

export const startBotRuntime = async ({
  bot,
  logger = console,
  runtimeProcess = process,
}: StartBotRuntimeOptions): Promise<void> => {
  await bot.api.setMyCommands(startupCommands);
  const cleanup = registerShutdownHandlers(bot, runtimeProcess);

  try {
    await bot.start();
  } catch (error) {
    cleanup();

    if (isPollingConflictError(error)) {
      logger.error(DUPLICATE_POLLER_MESSAGE);
      throw new BotStartupConflictError(error);
    }

    throw error;
  }
};
