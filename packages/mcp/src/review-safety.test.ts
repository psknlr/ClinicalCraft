/**
 * Review round (R1 S1 = R2 C1, R3 G3/G11, R2 C15) over the MCP stdio server — the reviewers' reproductions as
 * regression tests:
 * - S1  `confirm: true` approves exactly the approvals a refusal named (the call's own gate rule and the inner
 *       asks it recorded, accumulated across repeats, each used once) — never every approval asked inside the
 *       repeated call; a skill's steps done by an earlier attempt are not done again;
 * - G3  no ECG morphology (an interpretation) in tool results or resources before the 12-lead is read;
 * - G11 the state resource shows vitals only where the learner's body can see them;
 * - C15 an embodied encounter in a facility with no place for the case is refused before it starts.
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import { ECG_MORPHOLOGIES } from "@clinicalcraft/core";
import { mergeSettings, type ResolvedSettings } from "@clinicalcraft/agent";
import { loadContent } from "@clinicalcraft/agent/node";
import { caseHandle } from "./format.js";
import { LineSplitter, type JsonRpcResponse } from "./jsonrpc.js";
import { runMcpServer } from "./server.js";

const root = mkdtempSync(join(tmpdir(), "cc-mcp-review-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const content = await loadContent();
const STEMI = caseHandle("stemi-inferior-rv");

type ToolResult = { content: { type: string; text: string }[]; structuredContent?: Record<string, any>; isError?: boolean };

/** A client on the server's stdio (in-memory streams). */
class Client {
  readonly input = new PassThrough();
  readonly output = new PassThrough();
  readonly done: Promise<{ sessions: number }>;
  private id = 1;
  private readonly waiting = new Map<number, (r: JsonRpcResponse) => void>();

  constructor(settings: ResolvedSettings) {
    const dir = mkdtempSync(join(root, "p-"));
    const home = join(dir, "home");
    const cwd = join(dir, "project");
    mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
    mkdirSync(home, { recursive: true });
    const splitter = new LineSplitter();
    this.output.on("data", (chunk: Buffer) => {
      for (const line of splitter.push(chunk)) {
        const msg = JSON.parse(line) as JsonRpcResponse;
        if (typeof msg.id === "number") this.waiting.get(msg.id)?.(msg);
      }
    });
    this.done = runMcpServer({ input: this.input, output: this.output, settings, env: { CLINICALCRAFT_HOME: home, HOME: home }, cwd, content, log: () => undefined });
  }

  static async start(settings: ResolvedSettings): Promise<Client> {
    const c = new Client(settings);
    await c.request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } });
    return c;
  }

  async request<T = any>(method: string, params?: unknown): Promise<T> {
    const id = this.id++;
    const reply = new Promise<JsonRpcResponse>((resolve) => this.waiting.set(id, resolve));
    this.input.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, ...(params !== undefined ? { params } : {}) })}\n`);
    const r = await reply;
    if ("error" in r) throw new Error(`${method}: ${r.error.message}`);
    return r.result as T;
  }

  call(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    return this.request<ToolResult>("tools/call", { name, arguments: args });
  }

  async state(session: string): Promise<any> {
    const r = await this.request<{ contents: { text: string }[] }>("resources/read", { uri: `clinicalcraft://session/${session}/state` });
    return JSON.parse(r.contents[0]!.text);
  }

  async end(): Promise<void> {
    this.input.end();
    await this.done;
  }
}

const settings = (patch: Record<string, unknown> = {}) => mergeSettings([{ source: "flag", settings: { locale: "en", transcripts: { enabled: false }, ...patch } }]);
const given = async (c: Client, session: string): Promise<string[]> => (await c.state(session)).state.interventions.map((i: { interventionId: string }) => i.interventionId);

describe("S1: confirm binds to the approvals a refusal named", () => {
  const skill = {
    schema: "clinicalcraft/skill@1",
    id: "antiplatelet",
    name: { "zh-CN": "抗血小板", en: "Antiplatelet" },
    description: { "zh-CN": "抗血小板", en: "Give the antiplatelet" },
    safety: "clinical",
    steps: [
      // low risk (no ask): done by the first attempt that runs, never again
      { id: "iv", tool: "intervene", args: { intervention_id: "iv-access" } },
      { id: "s1", tool: "intervene", args: { intervention_id: "ticagrelor" } },
      { id: "s2", tool: "intervene", args: { intervention_id: "tenecteplase" } },
    ],
  };

  it("the reviewer's repro: confirming ticagrelor never gives tenecteplase; each inner act is confirmed on its own and done once", async () => {
    const c = await Client.start(settings({ approvalMode: "default" }));
    const session = (await c.call("start_case", { case_id: STEMI, embodied: true })).structuredContent!.session_id as string;
    expect((await c.call("navigate_to", { session_id: session, target: "patient" })).isError).toBeUndefined();
    const run = (confirm: boolean) => c.call("execute_skill", { session_id: session, skill, params: {}, ...(confirm ? { confirm: true } : {}) });

    // 1. The call itself asks (its most dangerous step always asks): refused, listing the skill's steps.
    const first = await run(false);
    expect(first.structuredContent!.refused).toMatchObject({ reason: "ask", ruleId: "tool.always-ask", confirm: "required" });
    expect(first.structuredContent!.refused.tool).toBeUndefined();
    expect(first.content[0]!.text).toMatch(/Ticagrelor/i);
    expect(first.content[0]!.text).toMatch(/Tenecteplase/i);
    expect(await given(c, session)).toEqual([]);

    // 2. Confirmed: the call runs (the cannula needs no approval), but its first inner ask (ticagrelor) was never
    //    named — refused, naming that step.
    const second = await run(true);
    expect(second.structuredContent!.refused).toMatchObject({ reason: "ask", confirm: "required", tool: "intervene" });
    expect(second.structuredContent!.refused.summary).toMatch(/Ticagrelor/);
    expect(second.content[0]!.text).toMatch(/intervene\(ticagrelor\)/);
    expect(await given(c, session)).toEqual(["iv-access"]);

    // 3. Confirmed again: ticagrelor (named) runs; tenecteplase (not named) is refused — NOT given.
    const third = await run(true);
    expect(third.structuredContent!.refused).toMatchObject({ reason: "ask", confirm: "required", tool: "intervene" });
    expect(third.content[0]!.text).toMatch(/intervene\(tenecteplase\)/);
    expect(await given(c, session)).toEqual(["iv-access", "ticagrelor"]);

    // 4. Confirmed again: tenecteplase runs; what earlier attempts did is not done twice.
    const fourth = await run(true);
    expect(fourth.isError, fourth.content[0]!.text).toBeUndefined();
    expect(fourth.structuredContent!.data.skill.steps.slice(0, 2)).toMatchObject([
      { id: "iv", resumed: true },
      { id: "s1", resumed: true },
    ]);
    expect(await given(c, session)).toEqual(["iv-access", "ticagrelor", "tenecteplase"]);

    // 5. The confirmation was used: the same call again is a new call (refused, nothing given).
    expect((await run(true)).structuredContent!.refused).toMatchObject({ reason: "ask", confirm: "required" });
    expect(await given(c, session)).toEqual(["iv-access", "ticagrelor", "tenecteplase"]);
    await c.end();
  });

  it("a confirmed outer ask (strict mode) never approves the clinical act asked inside the call", async () => {
    const c = await Client.start(settings({ approvalMode: "strict" }));
    const session = (await c.call("start_case", { case_id: STEMI, embodied: true })).structuredContent!.session_id as string;
    for (let i = 0; i < 3; i++) {
      const walk = await c.call("navigate_to", { session_id: session, target: "patient", ...(i > 0 ? { confirm: true } : {}) });
      if (!walk.isError) break;
    }
    const attach = (confirm: boolean) => c.call("interact_object", { session_id: session, target: "patient-monitor", operation: "attach", ...(confirm ? { confirm: true } : {}) });
    const first = await attach(false);
    expect(first.structuredContent!.refused).toMatchObject({ reason: "ask", ruleId: "mode.strict" });
    // The outer confirmation: the operation runs, its clinical effect asks on its own — refused, naming it.
    const second = await attach(true);
    expect(second.structuredContent!.refused).toMatchObject({ reason: "ask", tool: "intervene" });
    expect(second.content[0]!.text).toMatch(/intervene\(cardiac-monitoring\)/);
    expect(await given(c, session)).toEqual([]);
    // Both confirmations now (the call's own carries over): the monitor is attached, once.
    const third = await attach(true);
    expect(third.isError, third.content[0]!.text).toBeUndefined();
    expect(await given(c, session)).toEqual(["cardiac-monitoring"]);
    await c.end();
  });
});

describe("G3/G11: the state resource shows only the vitals the learner may see", () => {
  const INTERPRETATIONS = ECG_MORPHOLOGIES.filter((m) => m !== "normal");

  it("no ECG morphology in check_vitals results or the state resource (clinical and embodied)", async () => {
    for (const embodied of [false, true]) {
      const c = await Client.start(settings({ approvalMode: "default" }));
      const session = (await c.call("start_case", { case_id: STEMI, embodied })).structuredContent!.session_id as string;
      if (embodied) {
        await c.call("navigate_to", { session_id: session, target: "patient" });
        await c.call("interact_object", { session_id: session, target: "patient-monitor", operation: "attach" });
      }
      const vitals = await c.call("check_vitals", { session_id: session });
      expect(vitals.isError, vitals.content[0]!.text).toBeUndefined();
      const resource = await c.state(session);
      const json = JSON.stringify(vitals) + JSON.stringify(resource);
      expect(json).not.toContain('"ecg"');
      for (const m of INTERPRETATIONS) expect(json, `${m} (embodied: ${embodied})`).not.toContain(m);
      expect(resource.vitals).not.toBeNull();
      await c.end();
    }
  });

  it("embodied, away from any monitor: vitals null with the reason", async () => {
    const c = await Client.start(settings({ approvalMode: "default" }));
    const session = (await c.call("start_case", { case_id: STEMI, embodied: true })).structuredContent!.session_id as string;
    const resource = await c.state(session);
    expect(resource.vitals).toBeNull();
    expect(resource.vitalsNotInView).toEqual(expect.any(String));
    await c.call("navigate_to", { session_id: session, target: "patient" });
    expect((await c.state(session)).vitals).not.toBeNull();
    await c.end();
  });
});

describe("C15: an embodied encounter with no place for the case is refused before it starts", () => {
  it("start_case reports the stable code (localised), and no session is opened", async () => {
    for (const [locale, pattern] of [
      ["en", /no place|setting/i],
      ["zh-CN", /位置|场景/],
    ] as const) {
      const c = await Client.start(settings({ approvalMode: "default" }));
      const r = await c.call("start_case", { case_id: caseHandle("anaphylaxis-garden"), embodied: true, facility_id: "teaching-hospital", locale });
      expect(r.isError).toBe(true);
      expect(r.structuredContent).toMatchObject({ error: "embodiment_no_slot" });
      expect(r.content[0]!.text).toMatch(pattern);
      const listed = await c.request<{ resources: { uri: string }[] }>("resources/list");
      expect(listed.resources.filter((x) => x.uri.startsWith("clinicalcraft://session/"))).toEqual([]);
      await c.end();
    }
  });
});
