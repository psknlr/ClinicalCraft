/**
 * The care team over MCP (docs/PROTOCOL.md §11; docs/TEAM.md §5): `start_case {seat, embodied}` takes a place in the team
 * (`SessionState.seat`; the team then paced by the `team` tool) and a place without in-world mode is refused
 * `not_embodied` as the session words it; the `team` tool — annotated, listed — answers the learner's own lines (a reply
 * to another member's refused `permission_denied`), runs the team until the stand-in waits on the learner, and answers
 * the stand-in's call-out in the default approval mode: approved, the critical step is done; denied ("Stop"), the
 * stand-in stops, looks and asks what the learner sees, and does nothing until the learner says go on. Operating in the
 * place, a step the place's controls do not cover (dissection) is refused. Attach mode lists the `team` tool and
 * forwards it to the live session. On the agent's theatre fixture: core's lap-chole team in general-hospital's theatre.
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import { ATTACH_KEY_HEADER, mergeSettings, newAttachKey, type ResolvedSettings, type TeamMessage } from "@clinicalcraft/agent";
import { loadContent } from "@clinicalcraft/agent/node";
import { parseCase } from "@clinicalcraft/core";
import { LAP_CHOLE_SIT } from "../../core/src/engine/procedure/__fixtures__/lap-chole-sit.js";
import { LAP_CHOLE_SOLUTION, LAP_CHOLE_TEAM } from "../../core/src/engine/procedure/__fixtures__/lap-chole-team.js";
import { THEATRE, theatreFacility } from "../../world/src/__fixtures__/theatre.js";
import { runAttachedMcpServer } from "./attach.js";
import { caseHandle } from "./format.js";
import { LineSplitter, type JsonRpcResponse } from "./jsonrpc.js";
import { McpServer } from "./server.js";
import { TOOL_ANNOTATIONS } from "./tools.js";

const root = mkdtempSync(join(tmpdir(), "cc-mcp-team-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

/** core's lap-chole fixture with its team in general-hospital's theatre (the agent's theatre fixture's case). */
function theatreTeamCase() {
  const parsed = parseCase({ ...structuredClone(LAP_CHOLE_SIT), id: "mcp-lap-chole-team", team: { ...structuredClone(LAP_CHOLE_TEAM), room: THEATRE }, solution: structuredClone(LAP_CHOLE_SOLUTION) });
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3)));
  return parsed.value;
}

/** general-hospital with the theatre team's staff (the world fixture's test devices left out). */
function theatreHospital() {
  const f = theatreFacility();
  f.id = "mcp-theatre-hospital";
  f.placements = f.placements.filter((p) => !p.type.startsWith("test-"));
  return f;
}

const builtin = await loadContent();
const theatre = theatreTeamCase();
const facility = theatreHospital();
const content = {
  ...builtin,
  cases: new Map([...builtin.cases, [theatre.id, { def: theatre, dir: root, file: join(root, "case.json") }]]),
  facilities: new Map([...builtin.facilities, [facility.id, { def: facility, file: join(root, "facility.json") }]]),
};
const CASE = caseHandle(theatre.id);
const T = 240_000;

type ToolResult = { content: { type: string; text: string }[]; structuredContent?: Record<string, any>; isError?: boolean };

/** An in-process MCP server (its sessions in reach: the test reads the encounter's state and the team's record). */
function server(patch: Record<string, unknown> = {}): McpServer {
  const dir = mkdtempSync(join(root, "p-"));
  const home = join(dir, "home");
  const cwd = join(dir, "project");
  mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
  mkdirSync(home, { recursive: true });
  const settings: ResolvedSettings = mergeSettings([{ source: "flag", settings: { locale: "en", transcripts: { enabled: false }, ...patch } }]);
  return new McpServer({ settings, env: { CLINICALCRAFT_HOME: home, HOME: home }, cwd, content, log: () => undefined });
}

let rpc = 0;
async function call(s: McpServer, name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
  const r = (await s.handle({ jsonrpc: "2.0", id: ++rpc, method: "tools/call", params: { name, arguments: args } })) as JsonRpcResponse;
  if ("error" in r) throw new Error(`${name}: ${r.error.message}`);
  return r.result as ToolResult;
}
const text = (r: ToolResult) => r.content.map((c) => c.text).join("\n");

async function started(s: McpServer, extra: Record<string, unknown> = {}): Promise<string> {
  await s.handle({ jsonrpc: "2.0", id: ++rpc, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } } });
  const r = await call(s, "start_case", { case_id: CASE, facility_id: facility.id, seat: "first-assistant", embodied: true, ...extra });
  expect(r.isError, text(r)).not.toBe(true);
  return r.structuredContent!.session_id as string;
}

describe("start_case in a place in the care team", () => {
  it("sets the place (SessionState.seat); the team is paced by the team tool; a place without in-world mode is refused not_embodied, in the session's words", { timeout: T }, async () => {
    const s = server({ approvalMode: "default" });
    await s.handle({ jsonrpc: "2.0", id: ++rpc, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } } });
    const clinical = await call(s, "start_case", { case_id: CASE, facility_id: facility.id, seat: "first-assistant" });
    expect(clinical.isError).toBe(true);
    expect(clinical.structuredContent).toMatchObject({ error: "not_embodied" });
    expect(text(clinical)).toBe("Could not start the case: Action not permitted: the first assistant's place in the team needs in-world mode: the team works at the table with their own hands.");
    expect(s.sessions.list()).toHaveLength(0);
    // an absent member: the engine's own refusal, with its reason
    const away = await call(s, "start_case", { case_id: CASE, facility_id: facility.id, seat: "scrub-nurse", team: "scrub-break", embodied: true });
    expect(away.structuredContent).toMatchObject({ error: "start_refused" });
    expect(text(away)).toMatch(/Chen Yu is not here in this encounter/u);
    const r = await call(s, "start_case", { case_id: CASE, facility_id: facility.id, seat: "first-assistant", lineup: "three-surgeons", embodied: true });
    expect(r.isError, text(r)).not.toBe(true);
    expect(r.structuredContent).toMatchObject({ seat: "first-assistant", lineup: "three-surgeons", embodiment: "embodied", opening: "" });
    const entry = s.sessions.get(r.structuredContent!.session_id as string)!;
    expect(entry.session.state).toMatchObject({ seat: "first-assistant", lineup: "three-surgeons", started: true });
    expect(text(r)).toMatch(/Your place in the team: first assistant \(id doc-1\) — fixed for this encounter\./u);
    expect(text(r)).toMatch(/You hold the first assistant's place in the care team, fixed for this encounter: Dr Ito, the stand-in surgeon, operates/u);
    // the patient's opening is not said: the learner joined the team at the operating table
    expect(text(r)).not.toMatch(/Test patient: “Hello\.”/u);
    // paced by the team tool: nothing acts between its calls — the start itself took no team round (the stand-in has
    // taken no step yet: its first is the team tool's)
    expect(entry.session.team()).toMatchObject({ autonomy: "step", surgeon: "learner" });
    expect(entry.session.team()!.state.round).toBe(0);
    expect((entry.session.state.procedure?.refs ?? []).filter((r) => r.startsWith("standin:"))).toEqual([]);
    const tools = (await s.handle({ jsonrpc: "2.0", id: ++rpc, method: "tools/list" })) as JsonRpcResponse & { result: { tools: { name: string; annotations: Record<string, unknown> }[] } };
    expect(tools.result.tools.find((t) => t.name === "team")?.annotations).toEqual(TOOL_ANNOTATIONS.team);
    await s.close();
  });

  it("a line-up or a team scenario the case does not have: refused naming it, with what the case offers (its team scenarios are the facilitator's)", { timeout: T }, async () => {
    const s = server({ approvalMode: "default" });
    await s.handle({ jsonrpc: "2.0", id: ++rpc, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } } });
    const lineup = await call(s, "start_case", { case_id: CASE, facility_id: facility.id, seat: "first-assistant", lineup: "bogus", embodied: true });
    expect(lineup.structuredContent).toMatchObject({ error: "start_refused" });
    expect(text(lineup).split("\n")).toEqual([
      expect.stringMatching(/^Could not start the case: .*this case's team has no line-up "bogus"$/u),
      "Places in the team this case offers: first-assistant, scrub-nurse; first-assistant, second-assistant, scrub-nurse (line-up three-surgeons).",
      "Line-ups: three-surgeons (Three surgeons).",
      "Team scenarios are the facilitator's choice: they are not listed here.",
    ]);
    const team = await call(s, "start_case", { case_id: CASE, facility_id: facility.id, team: "bogus", embodied: true });
    expect(text(team)).toMatch(/this case has no team scenario "bogus"\nPlaces in the team this case offers: /u);
    // a place the case does not offer without the line-up that brings it
    expect(text(await call(s, "start_case", { case_id: CASE, facility_id: facility.id, seat: "second-assistant", embodied: true }))).toMatch(/has no second-assistant: there is no such place\nPlaces in the team this case offers: /u);
    expect(s.sessions.list()).toHaveLength(0);
    await s.close();
  });

  it("a refused start never closes another session: it is opened, refused and dropped before it is listed", { timeout: T }, async () => {
    const dir = mkdtempSync(join(root, "p-"));
    const home = join(dir, "home");
    mkdirSync(home, { recursive: true });
    const settings: ResolvedSettings = mergeSettings([{ source: "flag", settings: { locale: "en", transcripts: { enabled: false } } }]);
    const s = new McpServer({ settings, env: { CLINICALCRAFT_HOME: home, HOME: home }, cwd: dir, content, log: () => undefined, maxSessions: 1 });
    await s.handle({ jsonrpc: "2.0", id: ++rpc, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } } });
    const first = await call(s, "start_case", { case_id: CASE, facility_id: facility.id, embodied: true });
    const id = first.structuredContent!.session_id as string;
    const refused = await call(s, "start_case", { case_id: CASE, facility_id: facility.id, seat: "first-assistant" });
    expect(refused.structuredContent).toMatchObject({ error: "not_embodied" });
    expect(s.sessions.list().map((e) => e.id)).toEqual([id]);
    expect((await call(s, "case_status", { session_id: id })).isError).not.toBe(true);
    await s.close();
  });

  it("a session without a care team that works on its own: every team action says so (no_team) — a case without a team, a clinical session", { timeout: T }, async () => {
    const s = server({ approvalMode: "default" });
    await s.handle({ jsonrpc: "2.0", id: ++rpc, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } } });
    const noTeam = (await call(s, "start_case", { case_id: caseHandle("stemi-inferior-rv"), embodied: true })).structuredContent!.session_id as string;
    const clinical = (await call(s, "start_case", { case_id: CASE, facility_id: facility.id, embodied: false })).structuredContent!.session_id as string;
    for (const session_id of [noTeam, clinical]) {
      for (const action of ["status", "run"]) {
        const r = await call(s, "team", { session_id, action });
        expect(r.isError, `${session_id} ${action}`).toBe(true);
        expect(r.structuredContent).toMatchObject({ ok: false, error: "no_team" });
        expect(text(r)).toBe("This case has no care team that works on its own (it needs a case team and in-world mode).");
      }
    }
    await s.close();
  });
});

describe("the team tool in the first assistant's place (default approval mode)", () => {
  it("replies to the learner's own line, refuses one said to another member, refuses dissection as the place, and answers the stand-in's call-out — Stop, then go on, then no objection", { timeout: T }, async () => {
    const s = server({ approvalMode: "default" });
    const session_id = await started(s);
    const entry = s.sessions.get(session_id)!;
    const session = entry.session;
    const team = () => session.team()!;
    const me = "doc-1";

    // a run: the stand-in operates until it waits on the learner — the camera
    const run = await call(s, "team", { session_id, action: "run" });
    expect(run.isError, text(run)).not.toBe(true);
    expect(text(run)).toMatch(/Dr Ito → you: The first assistant \(you\), take the camera, please\. \[msg-\d+\]/u);
    expect(text(run)).toMatch(/The surgeon waits for you — Dr Ito: “The first assistant \(you\), take the camera, please\.” \[msg-\d+\]\n {2}answer: team \{action: "reply", message: "msg-\d+", kind: "readback"\}/u);
    const asked = run.structuredContent!.team.awaited.line as { id: string; replies: string[] };
    expect(asked.replies).toEqual(["readback", "decline"]);
    // a run while the learner's answer is owed does not start
    const round = team().state.round;
    const idle = await call(s, "team", { session_id, action: "run" });
    expect(idle.isError).not.toBe(true);
    expect(team().state.round).toBe(round);

    // the learner's reply (no message: the line the surgeon waits for)
    const readback = await call(s, "team", { session_id, action: "reply", kind: "readback" });
    expect(readback.isError, text(readback)).not.toBe(true);
    const mine = team().state.messages.findLast((m) => m.from === "actor:clinician")!;
    expect(mine).toMatchObject({ kind: "readback", replyTo: asked.id, to: "staff:doc-0" });
    // a reply to a line said to someone else (the learner's own read-back, said to Dr Ito): permission_denied
    const notMine = await call(s, "team", { session_id, action: "reply", message: mine.id, kind: "confirm" });
    expect(notMine.isError).toBe(true);
    expect(notMine.structuredContent).toMatchObject({ ok: false, error: "permission_denied" });
    expect(text(notMine)).toMatch(/✗ That message was said to Dr Ito, not to you: only they can read it back or answer it\./u);

    // operating in the place: dissection is the operating surgeon's (refused before any approval)
    const dissect = await call(s, "operate", { session_id, op: "dissect", port: "C", region: "hepatocystic-triangle" });
    expect(dissect.isError).toBe(true);
    expect(text(dissect)).toMatch(/You are the first assistant: dissection is the operating surgeon's\./u);

    // play the place to the stand-in's first call-out: read back, do the camera's steps, report
    const seen = new Set<string>(team().state.messages.map((m) => m.id));
    const threads = new Map<string, TeamMessage>([[team().state.messages.find((m) => m.id === asked.id)!.thread, team().state.messages.find((m) => m.id === asked.id)!]]);
    const operate = async (op: Record<string, unknown>) => {
      const r = await call(s, "operate", { session_id, ...op });
      expect(r.isError, `${JSON.stringify(op)}: ${text(r)}`).not.toBe(true);
    };
    /** Answer what is said to the learner; true when something was answered. */
    const answer = async (): Promise<boolean> => {
      let acted = false;
      for (const m of team().state.messages.filter((x) => x.to === "actor:clinician" && !seen.has(x.id))) {
        seen.add(m.id);
        if (m.kind === "request" && m.about.field) {
          threads.set(m.thread, m);
          expect((await call(s, "team", { session_id, action: "reply", message: m.id, kind: "readback" })).isError).not.toBe(true);
          acted = true;
        } else if (m.kind === "confirm" && threads.has(m.thread)) {
          const f = threads.get(m.thread)!.about.field!;
          const ports = session.state.procedure!.ports;
          const camera = ports.find((p) => p.role === "camera")!.site;
          if (f.op === "camera") await operate(ports.find((p) => p.site === (f.port ?? camera))?.instrument ? { op: "hand-over", port: f.port ?? camera, to: me } : { op: "insert", port: f.port ?? camera, instrument: "laparoscope" });
          if (f.op === "aim") await operate({ op: "aim", port: camera, at: f.region });
          if (f.op === "aim" && f.zoom) await operate({ op: "zoom", port: camera, level: f.zoom });
          if (f.op === "zoom") await operate({ op: "zoom", port: camera, level: f.zoom });
          expect((await call(s, "team", { session_id, action: "reply", message: m.id, kind: "report", text: "Done." })).isError).not.toBe(true);
          acted = true;
        }
      }
      return acted;
    };
    let pending: ToolResult | null = null;
    for (let i = 0; i < 200 && !pending; i++) {
      if (await answer()) continue;
      const r = await call(s, "team", { session_id, action: "step" });
      if (r.structuredContent?.callout) pending = r;
    }
    expect(pending, "a call-out").not.toBeNull();
    expect(pending!.structuredContent!.callout).toMatchObject({ actorId: "staff:doc-0", who: "Dr Ito", line: "Clipping the cystic duct." });
    expect(text(pending!)).toMatch(/Call-out — Dr Ito: “Clipping the cystic duct\.” Answer it: team \{action: "callout", decision: "approve"\} \(no objection\) or team \{action: "callout", decision: "deny"\} \(stop\)\./u);
    // the status lists it; a call that would change the encounter waits for its answer — looking does not
    expect((await call(s, "team", { session_id, action: "status" })).structuredContent!.callout).toMatchObject({ line: "Clipping the cystic duct." });
    const blocked = await call(s, "operate", { session_id, op: "zoom", port: "A", level: "wide" });
    expect(blocked.structuredContent).toMatchObject({ error: "callout_pending" });
    expect((await call(s, "team", { session_id, action: "step" })).structuredContent).toMatchObject({ error: "callout_pending" });
    expect((await call(s, "get_debrief", { session_id })).structuredContent).toMatchObject({ error: "callout_pending" });
    expect((await call(s, "observe_field", { session_id })).isError).not.toBe(true);

    // Stop: the stand-in stops, looks and asks what the learner sees — and clips nothing until they say go on
    const denied = await call(s, "team", { session_id, action: "callout", decision: "deny" });
    expect(denied.isError, text(denied)).not.toBe(true);
    expect(denied.structuredContent!.callout).toBeNull();
    let stopped: ToolResult | null = null;
    for (let i = 0; i < 6 && !stopped; i++) {
      const r = await call(s, "team", { session_id, action: "step" });
      if (r.structuredContent?.team?.awaited?.line?.text === "Stopped — tell me what you see.") stopped = r;
    }
    expect(stopped, "the stand-in's stop").not.toBeNull();
    expect(text(stopped!)).toMatch(/The surgeon waits for you — Dr Ito: “Stopped — tell me what you see\.” \[msg-\d+\]\n {2}answer: team \{action: "reply", message: "msg-\d+", kind: "confirm"\}/u);
    // it looked at the field with its own body first
    expect(team().state.receipts.filter((r) => r.operation === "observe_field").map((r) => r.actor)).toEqual(["staff:doc-0"]);
    // a run does not start while the stop waits for the learner's word; rounds go by, and nothing is clipped
    const before = team().state.round;
    await call(s, "team", { session_id, action: "run" });
    expect(team().state.round).toBe(before);
    for (let i = 0; i < 4; i++) await call(s, "team", { session_id, action: "step" });
    expect(session.state.procedure!.clips["cystic-duct"] ?? 0).toBe(0);
    expect((await call(s, "team", { session_id, action: "callout", decision: "approve" })).structuredContent).toMatchObject({ error: "no_callout" });
    // go on: a confirmation without words
    const goOn = await call(s, "team", { session_id, action: "reply", kind: "confirm" });
    expect(goOn.isError, text(goOn)).not.toBe(true);
    // the call-out again, and no objection: the clip is done
    let again: ToolResult | null = null;
    for (let i = 0; i < 20 && !again; i++) {
      const r = await call(s, "team", { session_id, action: "step" });
      if (r.structuredContent?.callout) again = r;
    }
    expect(again?.structuredContent!.callout).toMatchObject({ line: "Clipping the cystic duct." });
    const approved = await call(s, "team", { session_id, action: "callout", decision: "approve" });
    expect(approved.isError, text(approved)).not.toBe(true);
    expect(session.state.procedure!.clips["cystic-duct"]).toBe(3);

    // the rest of the operation: each call-out answered no objection, the learner's camera requests answered — with an
    // acting call sent alongside each run: queued behind it, it is refused when the run stopped at a call-out (never left
    // waiting behind the round the call-out holds, the answer queued behind it)
    let refusedAlongside = 0;
    for (let i = 0; i < 300 && !session.state.procedure!.closed; i++) {
      if (await answer()) continue;
      const [r, alongside] = await Promise.all([call(s, "team", { session_id, action: "run" }), call(s, "look_at", { session_id, target: "patient" })]);
      if (!r.structuredContent?.callout) continue;
      expect(alongside.structuredContent).toMatchObject({ error: "callout_pending" });
      refusedAlongside++;
      expect((await call(s, "team", { session_id, action: "callout", decision: "approve" })).isError).not.toBe(true);
    }
    expect(refusedAlongside).toBeGreaterThan(0);
    expect(session.state.procedure).toMatchObject({ closed: true, specimen: "extracted", unsafe: [], injuries: [] });
    expect(session.state.procedure!.clips).toEqual({ "cystic-duct": 3, "cystic-artery": 2 });
    // observing, the team's words name this tool's own control
    expect((await call(s, "team", { session_id, action: "observe" })).isError).not.toBe(true);
    const observing = await call(s, "team", { session_id, action: "reply", message: asked.id, kind: "report" });
    expect(observing.structuredContent).toMatchObject({ ok: false, error: "permission_denied" });
    expect(text(observing)).toMatch(/✗ You are observing: the team plays your place\. Call the team tool with action "play" to answer, ask or count yourself\./u);
    await s.close();
  });
});

describe("attach mode: the team tool of a live session", () => {
  it("is listed and forwarded to the live session the learner paired it with", { timeout: T }, async () => {
    const KEY = newAttachKey();
    const PAIRED = "ls_aaaaaaaaaaaaaaaa";
    const calls: { body: Record<string, any> }[] = [];
    const info = { id: PAIRED, caseHandle: CASE, title: "Theatre", facilityId: facility.id, embodiment: "embodied", locale: "en", capabilities: ["observe_field", "operate", "team"], createdAt: "2026-11-15T00:00:00.000Z", lastSeenAt: "2026-11-15T00:00:00.000Z", connected: true, pendingCalls: 0 };
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    const fetch: typeof globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      const key = ((init?.headers ?? {}) as Record<string, string>)[ATTACH_KEY_HEADER];
      if (key !== KEY) return json(403, { error: { code: "forbidden_attach_key", message: "wrong key" } });
      const parts = url.pathname.replace(/^\/api\/world\/sessions\/?/, "").split("/").filter(Boolean);
      if (parts.length === 0) return json(200, { sessions: [info] });
      if (parts.length === 1) return json(200, info);
      const body = JSON.parse(String(init?.body)) as Record<string, any>;
      calls.push({ body });
      return json(200, { correlationId: body.correlationId, result: { ok: true, status: "ok", output: "Team: round 3 · pace auto · you play your place (first assistant)" }, deduplicated: false });
    };
    const input = new PassThrough();
    const output = new PassThrough();
    const replies = new Map<number, JsonRpcResponse>();
    const splitter = new LineSplitter();
    output.on("data", (chunk: Buffer) => {
      for (const line of splitter.push(chunk)) {
        const msg = JSON.parse(line) as JsonRpcResponse;
        if (typeof msg.id === "number") replies.set(msg.id, msg);
      }
    });
    const done = runAttachedMcpServer({ input, output, serverUrl: "http://127.0.0.1:5178", fetch, idPrefix: "mcp-test", log: () => undefined, worldSession: PAIRED, attachKey: KEY });
    const request = async (id: number, method: string, params?: unknown) => {
      input.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, ...(params !== undefined ? { params } : {}) })}\n`);
      for (let i = 0; i < 400 && !replies.has(id); i++) await new Promise((r) => setTimeout(r, 5));
      return replies.get(id) as JsonRpcResponse & { result: any };
    };
    const listed = await request(1, "tools/list");
    const spec = listed.result.tools.find((t: { name: string }) => t.name === "team");
    expect(spec).toBeDefined();
    expect(spec.inputSchema.properties.action.enum).toEqual(["status", "step", "run", "reply", "ask", "need", "count", "play", "observe", "callout"]);
    expect(spec.inputSchema.properties).toHaveProperty("session_id");
    const forwarded = await request(2, "tools/call", { name: "team", arguments: { action: "reply", kind: "readback" } });
    expect(forwarded.result.isError).not.toBe(true);
    expect(calls).toEqual([{ body: expect.objectContaining({ tool: "team", args: { action: "reply", kind: "readback" } }) }]);
    expect(forwarded.result.content[0].text).toMatch(/Team: round 3/u);
    input.end();
    await done;
  });
});
