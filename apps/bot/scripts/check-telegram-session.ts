import "dotenv/config";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH ?? "";
const session = process.env.TG_SESSION_STRING ?? "";

if (!Number.isInteger(apiId) || apiId <= 0) {
  throw new Error("TG_API_ID is required");
}

if (apiHash.trim().length === 0) {
  throw new Error("TG_API_HASH is required");
}

if (session.trim().length === 0) {
  throw new Error("TG_SESSION_STRING is required");
}

const client = new TelegramClient(new StringSession(session), apiId, apiHash, {
  connectionRetries: 1,
});

const main = async (): Promise<void> => {
  try {
    await client.connect();
    const me = await client.getMe();
    const username = me.username ?? "<no username>";
    const id = "id" in me ? String(me.id) : "<unknown id>";

    console.log("TG session check: ok");
    console.log(`Account id: ${id}`);
    console.log(`Username: ${username}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("AUTH_KEY_DUPLICATED")) {
      console.error("TG session check: auth_key_duplicated");
      console.error(
        "This session is already active somewhere else and cannot be reused concurrently.",
      );
      process.exit(2);
    }

    console.error("TG session check: failed");
    console.error(message);
    process.exit(1);
  } finally {
    await client.disconnect();
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
