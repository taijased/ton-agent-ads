import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { App } from "./App";
import "./styles/index.css";

const tonConnectManifestUrl = new URL(
  "/tonconnect-manifest.json",
  window.location.origin,
).toString();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TonConnectUIProvider
      analytics={{ mode: "off" }}
      manifestUrl={tonConnectManifestUrl}
    >
      <App />
    </TonConnectUIProvider>
  </StrictMode>,
);
