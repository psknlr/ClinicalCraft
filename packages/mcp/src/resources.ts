/**
 * MCP resources (docs/PROTOCOL.md §11):
 *   clinicalcraft://cases                       library (JSON, spoiler-free)
 *   clinicalcraft://session/{id}/state          engine state, progress, vitals, workup plan (JSON)
 *   clinicalcraft://session/{id}/transcript     what was said and what happened (JSON)
 */
import { currentWaypoint, progress, vitalsAt } from "@clinicalcraft/core";
import type { LoadedContent } from "@clinicalcraft/agent/node";
import { caseHandle, caseListing } from "./format.js";
import { RPC_ERRORS, RpcError } from "./jsonrpc.js";
import type { McpSession, SessionManager } from "./sessions.js";

export const CASES_URI = "clinicalcraft://cases";
const SESSION_URI = /^clinicalcraft:\/\/session\/([^/]+)\/(state|transcript)$/;

export interface ResourceHost {
  readonly sessions: SessionManager;
  readonly locale: string;
  content(): Promise<LoadedContent>;
}

const JSON_TYPE = "application/json";

/** `resources/list`: the library plus the state and transcript of every open session. */
export function listResources(host: ResourceHost) {
  const resources: Record<string, unknown>[] = [
    { uri: CASES_URI, name: "cases", title: "ClinicalCraft cases", description: "Available clinical cases (spoiler-free summaries).", mimeType: JSON_TYPE },
  ];
  for (const s of host.sessions.list()) {
    const label = `${s.session.caseDef.id} · ${s.id}`;
    resources.push(
      { uri: `clinicalcraft://session/${s.id}/state`, name: `session-${s.id}-state`, title: `State — ${label}`, description: "Engine state, objective progress, vitals and workup plan.", mimeType: JSON_TYPE },
      { uri: `clinicalcraft://session/${s.id}/transcript`, name: `session-${s.id}-transcript`, title: `Transcript — ${label}`, description: "Conversation and clinical events of the encounter.", mimeType: JSON_TYPE },
    );
  }
  return { resources };
}

/** `resources/templates/list`. */
export function listResourceTemplates() {
  return {
    resourceTemplates: [
      { uriTemplate: "clinicalcraft://session/{session_id}/state", name: "session-state", title: "Session state", description: "Engine state, progress, vitals and workup plan of a session.", mimeType: JSON_TYPE },
      { uriTemplate: "clinicalcraft://session/{session_id}/transcript", name: "session-transcript", title: "Session transcript", description: "Conversation and clinical events of a session.", mimeType: JSON_TYPE },
    ],
  };
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
    // The engine state's caseId names the diagnosis: the opaque handle instead (as list_cases).
    state: { ...state, caseId: caseHandle(c.id) },
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
    const content = await host.content();
    value = { cases: [...content.cases.values()].map((e) => caseListing(e.def, host.locale)).sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id)) };
  } else {
    const m = SESSION_URI.exec(uri);
    const entry = m ? host.sessions.get(decodeURIComponent(m[1]!)) : undefined;
    if (!m || !entry) throw new RpcError(RPC_ERRORS.resourceNotFound, `Resource not found: ${uri}`, { uri });
    value = m[2] === "state" ? stateOf(entry) : { sessionId: entry.id, caseId: caseHandle(entry.session.caseDef.id), events: entry.log };
  }
  return { contents: [{ uri, mimeType: JSON_TYPE, text: JSON.stringify(value, null, 2) }] };
}
