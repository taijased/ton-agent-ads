import "dotenv/config";
import { pathToFileURL } from "node:url";
import { createApp } from "./app.js";

const start = async (): Promise<void> => {
  const app = createApp();
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? "0.0.0.0";

  await app.listen({ port, host });
};

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  start().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
