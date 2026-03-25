import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, "../.."), "");

  return {
    define: {
      __API_BASE_URL__: JSON.stringify(env.API_BASE_URL ?? ""),
      __DEV_AUTH_BYPASS_ENABLED__: JSON.stringify(
        env.DEV_AUTH_BYPASS_ENABLED ?? "false",
      ),
    },
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: env.API_BASE_URL ?? "http://localhost:3000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
