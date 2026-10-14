/**
 * Test harness for session-level tests: deterministic ids/clock, offline or
 * scripted providers, and event helpers. Used only by `*.test.ts` files
 * (isomorphic — no `node:*` imports; tests load content files themselves).
 */
import type { AgentEvent, EventMsg } from "../protocol.js";
import { ScriptedProvider, type Script } from "../providers/scripted.js";
import type { ProviderConfig } from "../providers/types.js";
import { mergeSettings } from "../settings/merge.js";
import type { ResolvedSettings } from "../settings/schema.js";
import { createSession, type ClinicalSession, type CreateSessionOptions } from "../session/session.js";
import { loadMiniCase } from "./mini-case.js";

/** Resolved settings: defaults (offline) + a patch. */
export function testSettings(patch: Record<string, unknown> = {}): ResolvedSettings {
  return mergeSettings([{ source: "flag", settings: patch }]);
}

/** Deterministic id generator ("id-1", "id-2", …). */
export function counterIds(prefix = "id"): () => string {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

/** Deterministic clock advancing 1 s per call. */
export function steppingClock(start = Date.UTC(2026, 0, 1)): () => number {
  let t = start;
  return () => (t += 1000);
}

export interface TestSessionOptions extends Partial<CreateSessionOptions> {
  /** Scripted model responses; every agent shares one provider (null = offline). */
  scripts?: Script[] | null;
  settingsPatch?: Record<string, unknown>;
  delayMs?: number;
}

export interface TestSession {
  session: ClinicalSession;
  provider: ScriptedProvider | null;
  events: AgentEvent[];
  msgs<T extends EventMsg["type"]>(type: T): Extract<EventMsg, { type: T }>[];
}

/** Create a session over the mini case (or `caseDef`) with collected events. */
export async function makeSession(opts: TestSessionOptions = {}): Promise<TestSession> {
  const scripted = opts.scripts ? new ScriptedProvider(opts.scripts, { delayMs: opts.delayMs ?? 0 }) : null;
  const settings = testSettings({ locale: "en", ...(scripted ? { provider: "openai" } : {}), ...(opts.settingsPatch ?? {}) });
  const events: AgentEvent[] = [];
  const { scripts: _s, settingsPatch: _p, delayMs: _d, ...rest } = opts;
  const session = await createSession({
    caseDef: opts.caseDef ?? loadMiniCase(),
    settings,
    newId: counterIds(),
    now: steppingClock(),
    retry: false,
    ...(scripted
      ? {
          resolveProvider: (id: string, model: string | null): ProviderConfig => ({ id, wire: "openai-chat-completions", model: model ?? "scripted", apiKey: "test-key" }),
          providerFactory: () => scripted,
        }
      : {}),
    ...rest,
  });
  // Events emitted during createSession are replayed through events(); subscribe for the rest.
  session.subscribe((e) => events.push(e));
  return {
    session,
    provider: scripted,
    events,
    msgs: <T extends EventMsg["type"]>(type: T) => events.map((e) => e.msg).filter((m): m is Extract<EventMsg, { type: T }> => m.type === type),
  };
}

/** Messages of one type from a list of events. */
export function msgsOf<T extends EventMsg["type"]>(events: readonly AgentEvent[], type: T): Extract<EventMsg, { type: T }>[] {
  return events.map((e) => e.msg).filter((m): m is Extract<EventMsg, { type: T }> => m.type === type);
}

/** Wait until `predicate` holds (polling microtasks/timers), or fail after `timeoutMs`. */
export async function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor: timed out");
    await new Promise((r) => setTimeout(r, 2));
  }
}

export { loadMiniCase };
