import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH ?? "";

if (!Number.isInteger(apiId) || apiId <= 0) {
  throw new Error("TG_API_ID is required");
}

if (apiHash.trim().length === 0) {
  throw new Error("TG_API_HASH is required");
}

const rl = createInterface({ input, output });

const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
  connectionRetries: 1,
});

const getPhoneCodeHash = (result: Api.auth.TypeSentCode): string => {
  if ("phoneCodeHash" in result && typeof result.phoneCodeHash === "string") {
    return result.phoneCodeHash;
  }

  throw new Error(
    `Telegram returned unsupported sent-code response: ${result.className}`,
  );
};

const main = async (): Promise<void> => {
  try {
    const phoneNumber = await rl.question("Phone number (+...): ");

    console.log("Step 1/4: connecting to Telegram...");
    await client.connect();
    console.log("Connected.");

    console.log("Step 2/4: requesting login code...");
    const sendCodeResult = await client.invoke(
      new Api.auth.SendCode({
        phoneNumber,
        apiId,
        apiHash,
        settings: new Api.CodeSettings({}),
      }),
    );
    const phoneCodeHash = getPhoneCodeHash(sendCodeResult);
    console.log("Code request accepted by Telegram.");
    console.log(`Phone code hash: ${phoneCodeHash}`);
    console.log("Check Telegram app and SMS for the code.");

    const phoneCode = await rl.question("Code from Telegram: ");

    try {
      console.log("Step 3/4: signing in with code...");
      const signInResult = await client.invoke(
        new Api.auth.SignIn({
          phoneNumber,
          phoneCode,
          phoneCodeHash,
        }),
      );

      console.log("Sign-in response:");
      console.log(signInResult.className);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("SESSION_PASSWORD_NEEDED")) {
        console.log("Telegram requires 2FA password.");
        console.log(
          "This debug script stops here; use `pnpm tg:session` to complete the password-based login flow.",
        );
      } else {
        throw error;
      }
    }

    console.log("Step 4/4: session string generated.");
    console.log("SESSION STRING:");
    console.log(client.session.save());
  } finally {
    await client.disconnect();
    rl.close();
  }
};

main().catch((error: unknown) => {
  console.error("Telegram session debug failed:");
  console.error(error);
  process.exit(1);
});
