import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

const apiId = Number(process.env.TG_API_ID_R);
const apiHash = process.env.TG_API_HASH_R ?? "";

if (!apiId || !apiHash) {
  throw new Error("TG_API_ID and TG_API_HASH are required");
}

async function main() {
  const rl = createInterface({ input, output });

  const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
    connectionRetries: 5
  });

  await client.start({
    phoneNumber: async () => await rl.question("Phone number: "),
    password: async () => await rl.question("2FA password (if any): "),
    phoneCode: async () => await rl.question("Code from Telegram: "),
    onError: (err) => console.error(err)
  });

  console.log("SESSION STRING:");
  console.log(client.session.save());

  await client.disconnect();
  await rl.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});