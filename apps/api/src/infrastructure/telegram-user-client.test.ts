import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { TelegramClient } from "telegram";
import { TelegramUserClient } from "./telegram-user-client.js";

class TestTelegramUserClient extends TelegramUserClient {
  public created = 0;

  public constructor(private readonly factory: () => TelegramClient) {
    super();
  }

  protected override createClient(): TelegramClient {
    this.created += 1;
    return this.factory();
  }
}

let originalApiId: string | undefined;
let originalApiHash: string | undefined;
let originalSessionString: string | undefined;

beforeEach(() => {
  originalApiId = process.env.TG_API_ID;
  originalApiHash = process.env.TG_API_HASH;
  originalSessionString = process.env.TG_SESSION_STRING;

  process.env.TG_API_ID = "34731712";
  process.env.TG_API_HASH = "test-api-hash";
  process.env.TG_SESSION_STRING = "test-session";
});

afterEach(() => {
  if (originalApiId === undefined) {
    delete process.env.TG_API_ID;
  } else {
    process.env.TG_API_ID = originalApiId;
  }

  if (originalApiHash === undefined) {
    delete process.env.TG_API_HASH;
  } else {
    process.env.TG_API_HASH = originalApiHash;
  }

  if (originalSessionString === undefined) {
    delete process.env.TG_SESSION_STRING;
  } else {
    process.env.TG_SESSION_STRING = originalSessionString;
  }
});

test("getClient shares one in-flight initialization across concurrent callers", async () => {
  let connectCalls = 0;
  let getMeCalls = 0;
  let disconnectCalls = 0;
  let releaseConnect: (() => void) | undefined;

  const connectBarrier = new Promise<void>((resolve) => {
    releaseConnect = resolve;
  });

  const fakeClient = {
    async connect() {
      connectCalls += 1;
      await connectBarrier;
    },
    async getMe() {
      getMeCalls += 1;
      return { id: "1" };
    },
    async disconnect() {
      disconnectCalls += 1;
    },
  } as unknown as TelegramClient;

  const client = new TestTelegramUserClient(() => fakeClient);

  const first = client.getClient();
  const second = client.getClient();

  assert.equal(client.created, 1);
  releaseConnect?.();

  const [resolvedFirst, resolvedSecond] = await Promise.all([first, second]);

  assert.equal(resolvedFirst, fakeClient);
  assert.equal(resolvedSecond, fakeClient);
  assert.equal(connectCalls, 1);
  assert.equal(getMeCalls, 1);
  assert.equal(disconnectCalls, 0);
});

test("getClient clears failed initialization state and allows retry", async () => {
  let attempt = 0;
  let disconnectCalls = 0;

  const client = new TestTelegramUserClient(() => {
    attempt += 1;

    if (attempt === 1) {
      return {
        async connect() {},
        async getMe() {
          throw new Error("init failed");
        },
        async disconnect() {
          disconnectCalls += 1;
        },
      } as unknown as TelegramClient;
    }

    return {
      async connect() {},
      async getMe() {
        return { id: "1" };
      },
      async disconnect() {
        disconnectCalls += 1;
      },
    } as unknown as TelegramClient;
  });

  await assert.rejects(() => client.getClient(), /init failed/);

  const resolved = await client.getClient();

  assert.ok(resolved);
  assert.equal(client.created, 2);
  assert.equal(disconnectCalls, 1);
});
