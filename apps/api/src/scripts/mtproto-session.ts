import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;

if (!Number.isInteger(apiId) || apiId <= 0) {
  throw new Error("TG_API_ID is required");
}

if (apiHash === undefined || apiHash.trim().length === 0) {
  throw new Error("TG_API_HASH is required");
}

const readline = createInterface({ input, output });
const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
  connectionRetries: 3
});

const main = async (): Promise<void> => {
  await client.start({
    phoneNumber: async () => readline.question("Phone number: "),
    password: async () => readline.question("2FA password (if any): "),
    phoneCode: async () => readline.question("Telegram code: "),
    onError: (error) => {
      console.error(error);
    }
  });

  output.write("\nTG_SESSION_STRING=\n");
  output.write(`${client.session.save()}\n`);
};

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    readline.close();
    await client.disconnect();
  });
