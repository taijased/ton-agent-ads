#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const EXPECTED = "1.2.27";

try {
  const version = execFileSync("opencode", ["-v"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

  if (version !== EXPECTED) {
    console.error(
      `OpenCode version mismatch: expected ${EXPECTED}, got ${version}`,
    );
    console.error(
      "Update OpenCode or adjust the repository expectation before relying on shared agents and commands.",
    );
    process.exit(1);
  }

  console.log(`OpenCode version OK: ${version}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Failed to run `opencode -v`.");
  console.error(message);
  process.exit(1);
}
