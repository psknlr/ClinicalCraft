/**
 * REPL input history persisted at `~/.clinicalcraft/history` (one entry per
 * line, mode 0600; `CLINICALCRAFT_HOME` relocates it).
 */
import { appendFileSync, chmodSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { clinicalcraftHome } from "@clinicalcraft/agent/node";
import type { Env } from "./ansi.js";

/** Maximum entries loaded into readline. */
export const HISTORY_LIMIT = 1000;

export class HistoryFile {
  readonly path: string;
  private created = false;

  constructor(env: Env) {
    this.path = join(clinicalcraftHome(env), "history");
  }

  /** Entries, newest first (the order readline expects). Missing file → []. */
  load(): string[] {
    let text: string;
    try {
      text = readFileSync(this.path, "utf8");
    } catch {
      return [];
    }
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    const out: string[] = [];
    for (let i = lines.length - 1; i >= 0 && out.length < HISTORY_LIMIT; i--) {
      if (out[out.length - 1] !== lines[i]) out.push(lines[i]!);
    }
    return out;
  }

  /** Append one entry (newlines collapsed). Never throws. */
  add(entry: string): void {
    const line = entry.replace(/[\r\n]+/g, " ").trim();
    if (!line) return;
    try {
      if (!this.created) {
        mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 });
        this.created = true;
      }
      appendFileSync(this.path, `${line}\n`, { encoding: "utf8", mode: 0o600 });
      chmodSync(this.path, 0o600);
    } catch {
      /* history is a convenience */
    }
  }
}
