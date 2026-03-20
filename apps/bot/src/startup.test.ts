import { EventEmitter } from "node:events";
import assert from "node:assert/strict";
import test from "node:test";
import {
  BotStartupConflictError,
  DUPLICATE_POLLER_MESSAGE,
  registerShutdownHandlers,
  startBotRuntime,
  startupCommands,
  type BotRuntime,
} from "./startup.js";

class MockProcess extends EventEmitter {
  override once(eventName: NodeJS.Signals, listener: () => void): this {
    return super.once(eventName, listener);
  }

  override removeListener(
    eventName: NodeJS.Signals,
    listener: () => void,
  ): this {
    return super.removeListener(eventName, listener);
  }
}

const createBot = (): {
  bot: BotRuntime;
  start: () => Promise<void>;
  stopCalls: number;
  commands: typeof startupCommands | undefined;
  setStartImplementation(implementation: () => Promise<void>): void;
} => {
  let commands: typeof startupCommands | undefined;
  let stopCalls = 0;
  let startImplementation = async (): Promise<void> => {};

  return {
    bot: {
      api: {
        async setMyCommands(nextCommands) {
          commands = nextCommands;
        },
      },
      async start() {
        await startImplementation();
      },
      stop() {
        stopCalls += 1;
      },
    },
    start: () => startImplementation(),
    get stopCalls() {
      return stopCalls;
    },
    get commands() {
      return commands;
    },
    setStartImplementation(implementation) {
      startImplementation = implementation;
    },
  };
};

test("startBotRuntime registers commands and starts polling", async () => {
  const botFixture = createBot();

  await startBotRuntime({
    bot: botFixture.bot,
    runtimeProcess: new MockProcess(),
  });

  assert.deepEqual(botFixture.commands, startupCommands);
});

test("startBotRuntime classifies Telegram polling conflicts", async () => {
  const botFixture = createBot();
  const logged: string[] = [];
  const conflictError = {
    error_code: 409,
    method: "getUpdates",
    description: "Conflict: terminated by other getUpdates request",
  };

  botFixture.setStartImplementation(async () => {
    throw conflictError;
  });

  await assert.rejects(
    startBotRuntime({
      bot: botFixture.bot,
      logger: { error: (message) => logged.push(message) },
      runtimeProcess: new MockProcess(),
    }),
    (error: unknown) => {
      assert.ok(error instanceof BotStartupConflictError);
      assert.equal(error.message, DUPLICATE_POLLER_MESSAGE);
      return true;
    },
  );

  assert.deepEqual(logged, [DUPLICATE_POLLER_MESSAGE]);
});

test("startBotRuntime preserves non-conflict startup failures", async () => {
  const botFixture = createBot();
  const startupError = new Error("startup failed");

  botFixture.setStartImplementation(async () => {
    throw startupError;
  });

  await assert.rejects(
    startBotRuntime({ bot: botFixture.bot, runtimeProcess: new MockProcess() }),
    startupError,
  );
});

test("registerShutdownHandlers stops polling once across repeated signals", () => {
  const runtimeProcess = new MockProcess();
  let stopCalls = 0;

  registerShutdownHandlers(
    {
      stop() {
        stopCalls += 1;
      },
    },
    runtimeProcess,
  );

  runtimeProcess.emit("SIGINT");
  runtimeProcess.emit("SIGTERM");

  assert.equal(stopCalls, 1);
});

test("startBotRuntime keeps shutdown hooks active after successful startup", async () => {
  const runtimeProcess = new MockProcess();
  const botFixture = createBot();

  await startBotRuntime({ bot: botFixture.bot, runtimeProcess });
  runtimeProcess.emit("SIGTERM");

  assert.equal(botFixture.stopCalls, 1);
});
