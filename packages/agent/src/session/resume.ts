/**
 * What a session saves and how a saved one comes back (docs/PROTOCOL.md §10): `sessionSnapshot` (save, export,
 * the web's resume), `restoreSession` — the accepted actions replayed through the pure engine, the
 * conversations restored, the examiner's dialogue kept only where the replay vouches for it (or rebuilt for a
 * transcript that predates `dialogue` items) — and `restoreRuntime` for the runtime state beyond them
 * (interlocutor, workup plan, patient/companion affect: `resumedRuntimeConfig`).
 */
import { replay } from "@clinicalcraft/core";
import { narrateAction } from "../agents/offline.js";
import type { ChatMessage, ChatPart } from "../providers/types.js";
import { normaliseContent } from "../transcript.js";
import { RESERVED_DIALOGUE_LABEL, type DialogueEntry } from "./examiner.js";
import type { SessionKernel } from "./kernel.js";
import type { PatientMemory } from "./patient-pipeline.js";
import type { CreateSessionOptions } from "./session.js";
import type { SessionOptions, SessionSnapshot } from "./types.js";

/** A valid patient affect intensity (0 calm … 3 most intense). */
function isAffectIntensity(value: unknown): value is PatientMemory["affectIntensity"] {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

/** The session as a serializable snapshot (save, export, resume). */
export function sessionSnapshot(k: SessionKernel): SessionSnapshot {
  return {
    format: "clinicalcraft-session@1",
    sessionId: k.id,
    caseId: k.caseDef.id,
    caseVersion: k.caseDef.version,
    facilityId: k.facility?.id ?? null,
    locale: k.locale,
    actions: structuredClone(k.acceptedActions),
    messages: Object.fromEntries([...k.conversations.byAgent].map(([agent, msgs]) => [agent, structuredClone(msgs)])),
    plan: k.plan.map((p) => ({ ...p })),
    createdAt: new Date(k.createdAt).toISOString(),
    ...(k.recorder ? { nextOrdinal: k.recorder.nextOrdinal } : {}),
    dialogue: k.conversations.dialogue.map((d) => ({ ...d })),
    ...(k.embodied ? { embodiment: "embodied" as const, world: k.embodied.persistentSnapshot() } : {}),
  };
}

/**
 * Recorded dialogue entries a resume may keep (a transcript file or a web
 * snapshot is not trusted to say what the engine did): `who` must be the
 * learner, an engine actor or one of this session's agents; an `ACTION`
 * line must be the narration (in either locale) of the next accepted
 * replayed action — anything else, such as an "ACTION: Explained the
 * diagnosis…" line no action produced, is dropped.
 */
function trustedDialogue(k: SessionKernel, entries: readonly unknown[]): DialogueEntry[] {
  // Engine actors are recorded with speaker === who; agents with their display name.
  const actors = new Set<string>(["learner", "agent", "system", "replay"]);
  const people = new Set<string>([...actors, ...k.profiles.keys()]);
  const narrations = k.acceptedActions
    .filter((a) => a.type !== "ask" && a.type !== "start" && a.type !== "note")
    .map((a) => new Set((["en", "zh-CN"] as const).map((l) => narrateAction(k.caseDef, a, l)).filter((x): x is string => !!x)));
  let next = 0;
  const kept: DialogueEntry[] = [];
  for (const raw of entries) {
    const d = raw as Partial<DialogueEntry> | null;
    if (!d || typeof d.who !== "string" || typeof d.speaker !== "string" || typeof d.text !== "string") continue;
    if (d.who === "action") {
      const at = narrations.findIndex((set, i) => i >= next && set.has(d.text!));
      if (at < 0) continue;
      next = at + 1;
    } else if (!people.has(d.who)) continue;
    // A speaker label the examiner reads as another role ("ACTION (system): …") is not kept.
    else if (actors.has(d.who) ? d.speaker !== d.who : RESERVED_DIALOGUE_LABEL.test(d.speaker)) continue;
    kept.push({ who: d.who, speaker: d.speaker, text: d.text });
  }
  return kept;
}

/**
 * Restore a resumed session. Returns dialogue lines rebuilt for a transcript
 * that predates `dialogue` items (recorded by `start` after `session_meta`).
 */
export function restoreSession(k: SessionKernel, resume: NonNullable<SessionOptions["resume"]>): DialogueEntry[] {
  const replayed = replay(k.caseDef, resume.actions);
  const rejected = new Set(replayed.rejections.map((r) => r.index));
  k.state = replayed.state;
  k.acceptedActions = resume.actions.filter((_, i) => !rejected.has(i));
  const recorded = trustedDialogue(k, resume.dialogue ?? []);
  const dialogue = k.conversations.dialogue;
  // Already in the transcript (or the snapshot): restored, not re-recorded.
  dialogue.push(...recorded);
  const derived: DialogueEntry[] = [];
  for (const [agent, raw] of Object.entries(resume.messages ?? {})) {
    const list: ChatMessage[] = [];
    for (const m of raw ?? []) {
      const msg = m as { role?: unknown; content?: unknown };
      const content = normaliseContent(msg?.content);
      if ((msg?.role === "user" || msg?.role === "assistant") && content) list.push({ role: msg.role, content });
    }
    k.conversations.byAgent.set(agent, list);
    if (recorded.length > 0) continue;
    for (const m of list) {
      const text = m.content.filter((p): p is Extract<ChatPart, { type: "text" }> => p.type === "text").map((p) => p.text).join(" ");
      if (text.trim()) derived.push(m.role === "user" ? { who: "learner", speaker: "learner", text } : { who: agent, speaker: agent, text });
    }
  }
  if (recorded.length === 0) {
    // A transcript from before dialogue items: the accepted actions' ACTION lines and notes (order within them kept).
    for (const action of k.acceptedActions) {
      if (action.type === "note") {
        const who = !action.by || action.by === "learner" ? "learner" : String(action.by);
        if (action.text.trim()) derived.push({ who, speaker: who, text: `[note] ${action.text}` });
      } else if (action.type !== "ask" && action.type !== "start") {
        const narration = narrateAction(k.caseDef, action, k.locale);
        if (narration) derived.push({ who: "action", speaker: String(action.by ?? "learner"), text: narration });
      }
    }
  }
  dialogue.push(...derived);
  for (const speaker of ["patient", "companion"] as const) {
    if ((k.conversations.byAgent.get(speaker)?.length ?? 0) > 0) k.patientMemory[speaker].approached = true;
  }
  return derived;
}

/** Resume: runtime state beyond actions and messages — workup plan, interlocutor, patient/companion affect. */
export function restoreRuntime(k: SessionKernel, extra: CreateSessionOptions["restore"]): void {
  if (extra?.plan) {
    k.plan = extra.plan.items.map((p) => ({ text: p.text, status: p.status }));
    k.planExplanation = extra.plan.explanation;
  }
  if (extra?.interlocutor) {
    const target = extra.interlocutor.replace(/^@/, "").toLowerCase();
    if (k.availableAgents().includes(target)) k.interlocutor = target;
  }
  for (const speaker of ["patient", "companion"] as const) {
    const intensity = extra?.affect?.[speaker];
    if (isAffectIntensity(intensity)) k.patientMemory[speaker].affectIntensity = intensity;
  }
}
