import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export interface ConversationLogEntry {
  timestamp: string;
  dealId: string;
  direction: "inbound" | "outbound" | "internal";
  senderType: string;
  text: string;
  action?: string;
  language?: string;
}

export class ConversationLogger {
  private readonly logDir: string;

  constructor(logDir?: string) {
    this.logDir = logDir ?? join(process.cwd(), "logs");
    mkdirSync(this.logDir, { recursive: true });
  }

  log(entry: ConversationLogEntry): void {
    const line = JSON.stringify({
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    });
    const filePath = join(this.logDir, `negotiation-${entry.dealId}.jsonl`);
    try {
      appendFileSync(filePath, line + "\n");
    } catch {
      // Best effort — don't crash on log failure
    }
  }
}
