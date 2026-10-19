/**
 * MCP resources (docs/PROTOCOL.md §11):
 *   clinicalcraft://cases                       library (JSON, spoiler-free)
 *   clinicalcraft://session/{id}/state          the learner's record, progress, vitals, workup plan (JSON)
 *   clinicalcraft://session/{id}/transcript     what was said and what happened (JSON)
 *
 * The MCP client is the learner (typically a model playing the doctor), so
 * resources carry only what the learner can see — the same grounding as the
 * tools: no diagnosis-bearing case id (the opaque handle instead), no engine
 * internals that name findings or show unmeasured values (see
 * `LEARNER_STATE_KEYS`; the transcript is redacted in `sessions.ts`).
 */
import { currentWaypoint, progress, vitalsAt, type SessionState } from "@clinicalcraft/core";
import type { CaseLibrary } from "@clinicalcraft/agent/node";
import { caseHandle, caseListing } from "./format.js";
import { RPC_ERRORS, RpcError } from "./jsonrpc.js";
import type { McpSession, SessionManager } from "./sessions.js";

export const CASES_URI = "clinicalcraft://cases";
const SESSION_URI = /^clinicalcraft:\/\/session\/([^/]+)\/(state|transcript)$/;

export interface ResourceHost {
  readonly sessions: SessionManager;
  readonly locale: string;
  /** The case library (index; a case is validated when it is started). */
  library(): Promise<CaseLibrary>;
}

const JSON_TYPE = "application/json";

/** `resources/list`: the library plus the state and transcript of every open session. */
export function listResources(host: ResourceHost) {
  const resources: Record<string, unknown>[] = [
    { uri: CASES_URI, name: "cases", title: "ClinicalCraft cases", description: "Available clinical cases (spoiler-free summaries).", mimeType: JSON_TYPE },
  ];
  for (const s of host.sessions.list()) {
    // The case id names the diagnosis: the opaque handle, as `list_cases`.
    const label = `${caseHandle(s.session.caseDef.id)} · ${s.id}`;
    resources.push(
      { uri: `clinicalcraft://session/${s.id}/state`, name: `session-${s.id}-state`, title: `State — ${label}`, description: "Your record of the encounter, objective progress, bedside vitals and workup plan.", mimeType: JSON_TYPE },
      { uri: `clinicalcraft://session/${s.id}/transcript`, name: `session-${s.id}-transcript`, title: `Transcript — ${label}`, description: "Conversation and clinical events of the encounter.", mimeType: JSON_TYPE },
    );
  }
  return { resources };
}

/** `resources/templates/list`. */
export function listResourceTemplates() {
  return {
    resourceTemplates: [
      { uriTemplate: "clinicalcraft://session/{session_id}/state", name: "session-state", title: "Session state", description: "The learner's record, progress, bedside vitals and workup plan of a session.", mimeType: JSON_TYPE },
      { uriTemplate: "clinicalcraft://session/{session_id}/transcript", name: "session-transcript", title: "Session transcript", description: "Conversation and clinical events of a session.", mimeType: JSON_TYPE },
    ],
  };
}

/**
 * The engine-state fields the learner can see: their own record (what was
 * asked, examined, ordered, read, decided and given, and when), the phase and
 * clock, completed objectives, hints, notes and when the monitor went on.
 * Left out: `baselineOverrides` (scenario vitals and rhythm — `vitals`, i.e.
 * `vitalsAt`, shows them once something measures them), `firedEvents` and
 * `trendStops` (authored ids that name findings, e.g. "ev-dopamine-af") and
 * `flags` (authored: findings such as "high-risk-pe", scoring markers). An
 * allow-list, so a new engine field stays private until it is added here.
 */
export const LEARNER_STATE_KEYS = [
  "schema",
  "caseVersion",
  "started",
  "finished",
  "clock",
  "phase",
  "asked",
  "examined",
  "orders",
  "seen",
  "decisions",
  "attempts",
  "interventions",
  "hints",
  "notes",
  "objectivesDone",
  "monitorAttachedAt",
  "seq",
] as const satisfies readonly (keyof SessionState)[];

/** `state` reduced to `LEARNER_STATE_KEYS`, with the case's opaque handle as `caseId`. */
export function learnerState(state: SessionState, caseId: string): Pick<SessionState, (typeof LEARNER_STATE_KEYS)[number]> & { caseId: string } {
  const visible: Record<string, unknown> = { caseId: caseHandle(caseId) };
  for (const key of LEARNER_STATE_KEYS) if (state[key] !== undefined) visible[key] = state[key];
  return visible as Pick<SessionState, (typeof LEARNER_STATE_KEYS)[number]> & { caseId: string };
}

function stateOf(entry: McpSession) {
  const s = entry.session;
  const c = s.caseDef;
  const state = s.state;
  return {
    sessionId: s.id,
    caseId: caseHandle(c.id),
    locale: s.locale,
    approvalMode: s.settings.approvalMode,
    practiceScope: s.settings.practiceScope,
    // Embodied sessions: where the learner's body is (observe_world shows the rest).
    embodiment: s.embodiment,
    place: s.placeLabel(),
    // The engine state's caseId names the diagnosis: the opaque handle instead (as list_cases).
    state: learnerState(state, c.id),
    progress: progress(c, state),
    vitals: vitalsAt(c, state),
    waypoint: currentWaypoint(c, state),
    plan: entry.runner.workupPlan(),
  };
}

/** `resources/read`. Throws `RpcError(-32002)` for unknown URIs. */
export async function readResource(host: ResourceHost, uri: string) {
  let value: unknown;
  if (uri === CASES_URI) {
    // The case index, in library order (as `list_cases` and the CLI); entries carry opaque handles only.
    value = { cases: (await (await host.library()).entries()).map((c) => caseListing(c, host.locale)) };
  } else {
    const m = SESSION_URI.exec(uri);
    const entry = m ? host.sessions.get(decodeURIComponent(m[1]!)) : undefined;
    if (!m || !entry) throw new RpcError(RPC_ERRORS.resourceNotFound, `Resource not found: ${uri}`, { uri });
    value = m[2] === "state" ? stateOf(entry) : { sessionId: entry.id, caseId: caseHandle(entry.session.caseDef.id), events: entry.log };
  }
  return { contents: [{ uri, mimeType: JSON_TYPE, text: JSON.stringify(value, null, 2) }] };
}
