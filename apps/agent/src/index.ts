import { createEnv } from "@ton-adagent/config";

const env = createEnv(process.env);

export const bootstrapAgent = async (): Promise<void> => {
  console.log("agent scaffold ready", { tonRpc: env.TON_RPC });
};

void bootstrapAgent();
