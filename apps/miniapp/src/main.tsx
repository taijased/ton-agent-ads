import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { App } from "./App";
import "./styles/index.css";

const tonConnectManifestUrl =
  "https://ton-agent-ads-miniapp.vercel.app/tonconnect-manifest.json";
const twaReturnUrl = "https://t.me/agentads_bot"
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TonConnectUIProvider
      analytics={{ mode: "off" }}
      manifestUrl={tonConnectManifestUrl}
      actionsConfiguration={{
        twaReturnUrl,
        returnStrategy: "back",
      }}
    >
      <App />
    </TonConnectUIProvider>
  </StrictMode>,
);
