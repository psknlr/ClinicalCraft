/**
 * Embodied-mode test fixtures (node): the built-in content (cases,
 * facilities, catalogs) loaded once, and sessions of a built-in case in its
 * own facility — embodied unless `clinical` — with deterministic ids/clock,
 * offline unless scripted. Used only by `*.test.ts` files.
 */
import type { ApprovalDecision } from "../protocol.js";
import { catalogsFor, chooseFacility } from "../node/bootstrap.js";
import { loadContent, type LoadedContent } from "../node/content.js";
import { makeSession, type TestSession, type TestSessionOptions } from "./harness.js";

let loaded: Promise<LoadedContent> | null = null;

/** The built-in content (loaded once per test file). */
export function builtinContent(): Promise<LoadedContent> {
  loaded ??= loadContent();
  return loaded;
}

export interface EmbodiedTestOptions extends TestSessionOptions {
  /** Built-in case id (default `stemi-inferior-rv`). */
  caseId?: string;
  /** A clinical-mode session of the same case (for comparisons). */
  clinical?: boolean;
}

/** A session of a built-in case in its own facility, embodied (unless `clinical`). */
export async function makeEmbodiedSession(opts: EmbodiedTestOptions = {}): Promise<TestSession> {
  const content = await builtinContent();
  const { caseId = "stemi-inferior-rv", clinical = false, settingsPatch, ...rest } = opts;
  const entry = content.cases.get(caseId);
  if (!entry) throw new Error(`no built-in case ${caseId}`);
  const facility = chooseFacility(content, entry.def, undefined, null);
  return makeSession({
    caseDef: entry.def,
    facility,
    catalogs: catalogsFor(content, facility),
    ...rest,
    settingsPatch: { embodiment: clinical ? "clinical" : "embodied", ...(settingsPatch ?? {}) },
  });
}

/** Answer every approval request of a session with `decision`. */
export function answerAll(t: TestSession, decision: ApprovalDecision = "approved"): void {
  t.session.subscribe((e) => {
    if (e.msg.type === "approval_request") t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision });
  });
}

/** Run a slash command; returns its `command_output` (text, data) and the run's events. */
export async function command(t: TestSession, name: string, args = ""): Promise<{ text: string; data: any; ok: boolean; events: Awaited<ReturnType<TestSession["session"]["run"]>> }> {
  const events = await t.session.run({ type: "slash_command", name, args });
  const out = events.flatMap((e) => (e.msg.type === "command_output" ? [e.msg] : []))[0];
  const data = (out?.data ?? null) as { ok?: boolean; data?: unknown } | null;
  return { text: out?.text ?? "", data: data?.data ?? data, ok: data?.ok !== false, events };
}
