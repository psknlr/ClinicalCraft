/**
 * End to end, the world bridge (docs/EMBODIED.md §12, PROTOCOL §13) with real
 * processes: `clinicalcraft serve` (token from a file), a real headless
 * embodied session (the STEMI case in its own hospital) connected through the
 * browser's client library (`connectWorldBridge`, standing in for the web
 * page), and `clinicalcraft mcp --attach` driven over stdio JSON-RPC like
 * Claude Code / Codex / Grok CLI would: list_live_sessions → navigate_to →
 * interact_object (ECG cart: prepare, connect, record) → an approval-gated
 * intervention the learner approves, one the learner denies, one cancelled by
 * the client while the learner's approval is pending — each verified from
 * the authoritative engine state and world state of the live session.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { connectWorldBridge, type ClinicalSession } from "@clinicalcraft/agent";
import { createNodeSession, loadContent } from "@clinicalcraft/agent/node";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";

const REPO = fileURLToPath(new URL("../../../", import.meta.url));
const BIN = join(REPO, "packages/cli/src/bin.ts");
const TSX = join(REPO, "node_modules/.bin/tsx");
const TOKEN = "e2e-attach-token-0123456789abcdef";
const T = 120_000;

const root = mkdtempSync(join(tmpdir(), "cc-world-attach-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

function cliEnv(home: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v === undefined || /_API_KEY$/.test(k) || k.startsWith("CLINICALCRAFT_") || k === "FORCE_COLOR") continue;
    env[k] = v;
  }
  return { ...env, CLINICALCRAFT_HOME: home, HOME: home, NO_COLOR: "1" };
}

/** Run the CLI from source (every workspace package through its `source` export). */
function spawnCli(args: string[], cwd: string, home: string): ChildProcess {
  const [cmd, argv] = existsSync(TSX) ? [TSX, ["--conditions=source", BIN, ...args]] : ["npx", ["tsx", "--conditions=source", BIN, ...args]];
  return spawn(cmd, argv, { cwd, env: cliEnv(home), stdio: ["pipe", "pipe", "pipe"] });
}

/** `clinicalcraft serve` until SIGINT; resolves its URL once it listens. */
async function startServe(cwd: string, home: string, tokenFile: string): Promise<{ url: string; child: ChildProcess; stderr: () => string }> {
  const child = spawnCli(["serve", "--port", "0", "--lang", "en", "--token-file", tokenFile], cwd, home);
  let stderr = "";
  child.stderr!.setEncoding("utf8").on("data", (d: string) => (stderr += d));
  const url = await new Promise<string>((resolve, reject) => {
    let out = "";
    const timer = setTimeout(() => reject(new Error(`serve did not start: ${stderr}`)), 60_000);
    child.stdout!.setEncoding("utf8").on("data", (d: string) => {
      out += d;
      const m = /listening on (http:\/\/127\.0\.0\.1:\d+)\//.exec(out);
      if (m) {
        clearTimeout(timer);
        resolve(m[1]!);
      }
    });
    child.on("exit", (code) => reject(new Error(`serve exited ${code}: ${stderr}`)));
  });
  return { url, child, stderr: () => stderr };
}

type Reply = { jsonrpc: "2.0"; id: number | null; result?: any; error?: { code: number; message: string } };

/** An MCP client on a `clinicalcraft mcp --attach` process's stdio. */
class McpProcess {
  readonly child: ChildProcess;
  readonly replies: Reply[] = [];
  stderr = "";
  private readonly waiting = new Map<number, (r: Reply) => void>();
  private buffer = "";
  readonly exited: Promise<number | null>;

  constructor(args: string[], cwd: string, home: string) {
    this.child = spawnCli(["mcp", ...args], cwd, home);
    this.child.stderr!.setEncoding("utf8").on("data", (d: string) => (this.stderr += d));
    this.child.stdout!.setEncoding("utf8").on("data", (d: string) => {
      this.buffer += d;
      let nl = this.buffer.indexOf("\n");
      while (nl >= 0) {
        const line = this.buffer.slice(0, nl).trim();
        this.buffer = this.buffer.slice(nl + 1);
        if (line) {
          const reply = JSON.parse(line) as Reply; // stdout carries JSON-RPC only
          this.replies.push(reply);
          if (typeof reply.id === "number") this.waiting.get(reply.id)?.(reply);
        }
        nl = this.buffer.indexOf("\n");
      }
    });
    this.exited = new Promise((resolve) => this.child.on("exit", (code) => resolve(code)));
  }

  send(message: Record<string, unknown>): void {
    this.child.stdin!.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
  }

  request(id: number, method: string, params?: unknown): Promise<Reply> {
    const reply = new Promise<Reply>((resolve) => this.waiting.set(id, resolve));
    this.send({ id, method, ...(params !== undefined ? { params } : {}) });
    return reply;
  }

  async end(): Promise<number | null> {
    this.child.stdin!.end();
    return this.exited;
  }
}

async function until(predicate: () => boolean, ms = 15_000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > ms) throw new Error("timed out waiting");
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe("world bridge end to end: serve + live session (client library) + mcp --attach over stdio", () => {
  it("navigate_to, interact_object and approval-gated clinical actions act in the live session, verified from its authoritative state", { timeout: T }, async () => {
    const dir = mkdtempSync(join(root, "run-"));
    const home = join(dir, "home");
    const cwd = join(dir, "work");
    mkdirSync(home, { recursive: true });
    mkdirSync(cwd, { recursive: true });
    const tokenFile = join(dir, "server-token");
    writeFileSync(tokenFile, `${TOKEN}\n`, { mode: 0o600 });

    const serve = await startServe(cwd, home, tokenFile);
    let session: ClinicalSession | null = null;
    let mcp: McpProcess | null = null;
    let bridge: ReturnType<typeof connectWorldBridge> | null = null;
    try {
      // The learner's live session — what the web page runs — and the learner at the approval dialog.
      const content = await loadContent();
      const live = await createNodeSession({
        caseId: "stemi-inferior-rv",
        cwd,
        env: { CLINICALCRAFT_HOME: home, HOME: home },
        flags: { embodiment: "embodied", approvalMode: "default", locale: "en", transcripts: { enabled: false } },
        transcript: false,
        content,
      });
      session = live;
      const asked: { agent: string; tool: string; requestId: string; drug: string }[] = [];
      const resolved: { requestId: string; decision: string }[] = [];
      live.subscribe((e) => {
        if (e.msg.type === "approval_resolved") resolved.push({ requestId: e.msg.requestId, decision: e.msg.decision });
        if (e.msg.type !== "approval_request") return;
        const drug = String((e.msg.args as { intervention_id?: string }).intervention_id ?? "");
        asked.push({ agent: String(e.msg.agent), tool: e.msg.tool, requestId: e.msg.requestId, drug });
        // The learner approves ticagrelor, denies clopidogrel, and is still reading the nitroglycerin request.
        if (drug === "ticagrelor") live.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "approved" });
        if (drug === "clopidogrel") live.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "denied", reason: "not this one" });
      });
      const states: string[] = [];
      bridge = connectWorldBridge({ serverUrl: serve.url, session: live, auth: { token: TOKEN }, onStatus: (st) => states.push(st.state) });
      expect((await bridge.ready).state).toBe("connected");
      const liveId = bridge.status.liveSessionId!;

      mcp = new McpProcess(["--attach", serve.url, "--token-file", tokenFile, "--lang", "en"], cwd, home);
      const m = mcp;
      let id = 0;
      const call = async (name: string, args: Record<string, unknown> = {}) => {
        const reply = await m.request(++id, "tools/call", { name, arguments: args });
        if (reply.error) throw new Error(`${name}: ${reply.error.message}`);
        return reply.result as { content: { text: string }[]; structuredContent: Record<string, any>; isError?: boolean };
      };
      /** Operate a device; when the world says where to stand first (hint), walk there and retry once. */
      const operate = async (target: string, operation: string, parameters?: Record<string, unknown>) => {
        const args = { target, operation, ...(parameters ? { parameters } : {}) };
        const first = await call("interact_object", args);
        const goal = first.structuredContent?.data?.result?.hint?.goal;
        if (!first.isError || !goal) return first;
        expect((await call("navigate_to", { goal })).isError).toBeUndefined();
        return call("interact_object", args);
      };

      const init = await m.request(++id, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "e2e", version: "0" } });
      expect(init.result).toMatchObject({ protocolVersion: "2025-06-18", serverInfo: { name: "clinicalcraft" } });
      const listed = (await m.request(++id, "tools/list")).result.tools as { name: string; inputSchema: { properties: Record<string, unknown> } }[];
      const names = listed.map((t) => t.name);
      expect(names).toEqual(expect.arrayContaining(["list_live_sessions", "navigate_to", "interact_object", "intervene", "observe_world"]));
      expect(listed.every((t) => t.inputSchema.properties.confirm === undefined)).toBe(true);

      // The live session, spoiler-free; auto-selected below (the only one open).
      const sessions = await call("list_live_sessions");
      expect(sessions.structuredContent.sessions).toEqual([expect.objectContaining({ id: liveId, embodiment: "embodied", connected: true, facilityId: "general-hospital" })]);
      expect(JSON.stringify(sessions)).not.toContain("stemi-inferior-rv");

      // navigate_to: the learner's body walks to the patient (authoritative world state).
      const world = live.world()!;
      const distance = () => world.find(PRIMARY_ACTOR, { kind: "patient" }).find((e) => e.id === "patient:resus-1")!.distance;
      expect(distance()).toBeGreaterThan(5);
      const walk = await call("navigate_to", { target: "patient" });
      expect(walk.isError).toBeUndefined();
      expect(walk.structuredContent).toMatchObject({ session_id: liveId, status: "ok", data: { result: { status: "completed" } } });
      expect(distance()).toBeLessThanOrEqual(1.5);

      // interact_object: the ECG cart — prepare, connect, record (its clinical effect: the 12-lead ECG ordered).
      for (const op of ["prepare", "connect"]) expect((await operate("eq:resus1-ecg", op)).isError, op).toBeUndefined();
      const record = await operate("eq:resus1-ecg", "record", { investigation: "ecg-12lead" });
      expect(record.isError).toBeUndefined();
      expect(record.structuredContent.data.result.clinical).toMatchObject({ tool: "order_test", ok: true });
      expect(live.state.orders.map((o) => o.investigationId)).toContain("ecg-12lead");
      expect(world.snapshot().entities["eq:resus1-ecg"]?.state).toBe("completed");

      // An approval-gated clinical action: the LEARNER approves it in the session; the MCP client only sees the outcome.
      const tica = await call("intervene", { intervention_id: "ticagrelor" });
      expect(tica.isError).toBeUndefined();
      expect(tica.structuredContent).toMatchObject({ ok: true, status: "ok", approvals: [{ tool: "intervene", risk: "moderate", decision: "approved" }] });
      expect(live.state.interventions.map((i) => i.interventionId)).toContain("ticagrelor");

      // … and one the learner denies: refused, nothing given.
      const clop = await call("intervene", { intervention_id: "clopidogrel" });
      expect(clop.isError).toBe(true);
      expect(clop.structuredContent).toMatchObject({ ok: false, status: "denied", approvals: [{ decision: "denied" }] });
      expect(live.state.interventions.map((i) => i.interventionId)).not.toContain("clopidogrel");

      // The external agent cannot approve its own request: `confirm` is not even an argument.
      const sneaky = await m.request(++id, "tools/call", { name: "intervene", arguments: { intervention_id: "clopidogrel", confirm: true } });
      expect(sneaky.error).toMatchObject({ code: -32602 });

      // Cancellation: the client gives up while the learner's approval is pending → the request is withdrawn in the session.
      const pendingId = ++id;
      m.send({ id: pendingId, method: "tools/call", params: { name: "intervene", arguments: { intervention_id: "nitroglycerin" } } });
      await until(() => asked.some((a) => a.drug === "nitroglycerin"));
      const nitro = asked.find((a) => a.drug === "nitroglycerin")!;
      m.send({ method: "notifications/cancelled", params: { requestId: pendingId, reason: "the user stopped it" } });
      await until(() => resolved.some((r) => r.requestId === nitro.requestId));
      expect(resolved.find((r) => r.requestId === nitro.requestId)!.decision).toBe("abort");
      await until(() => bridge!.status.activeCalls === 0);
      expect(live.state.interventions.map((i) => i.interventionId)).not.toContain("nitroglycerin");
      expect((await m.request(++id, "ping")).result).toEqual({});
      expect(m.replies.some((r) => r.id === pendingId)).toBe(false); // a cancelled request gets no response

      // Every approval request was the clinician's (the external agent's tool path) and went to the learner.
      expect(asked.map((a) => [a.agent, a.tool, a.drug])).toEqual([
        ["clinician", "intervene", "ticagrelor"],
        ["clinician", "intervene", "clopidogrel"],
        ["clinician", "intervene", "nitroglycerin"],
      ]);
      expect(states).toContain("connected");

      expect(await m.end()).toBe(0);
      expect(m.stderr).not.toContain(TOKEN);
      mcp = null;
    } finally {
      if (mcp) mcp.child.kill("SIGKILL");
      await bridge?.dispose();
      await session?.close();
      serve.child.kill("SIGINT");
      await new Promise((r) => serve.child.once("exit", r));
    }
    expect(serve.stderr()).not.toContain(TOKEN);
  });

  it("mcp --attach validates its flags (usage errors, exit 2) and reports an unreachable server as a tool error", { timeout: T }, async () => {
    const dir = mkdtempSync(join(root, "flags-"));
    const home = join(dir, "home");
    mkdirSync(home, { recursive: true });
    const run = (args: string[], input = "") =>
      new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
        const child = spawnCli(["mcp", "--lang", "en", ...args], dir, home);
        let stdout = "";
        let stderr = "";
        child.stdout!.setEncoding("utf8").on("data", (d: string) => (stdout += d));
        child.stderr!.setEncoding("utf8").on("data", (d: string) => (stderr += d));
        child.on("close", (code) => resolve({ code, stdout, stderr }));
        child.stdin!.end(input);
      });
    const results = await Promise.all([
      run(["--world-session", "ls_aaaaaaaaaaaa"]),
      run(["--attach", `http://user:${TOKEN}@127.0.0.1:5178`]),
      run(["--attach", `http://127.0.0.1:5178/?token=${TOKEN}`]),
      run(["--attach", "ftp://127.0.0.1"]),
      run(["--attach", "http://127.0.0.1:5178", "--approval", "bypass"]),
      run(["--attach", "http://127.0.0.1:5178", "--world-session", "../../etc"]),
    ]);
    for (const r of results) {
      expect(r.code, r.stderr).toBe(2);
      expect(r.stdout).toBe("");
      expect(r.stderr).not.toContain(TOKEN);
    }
    expect(results[0]!.stderr).toMatch(/--world-session only applies with --attach/);
    expect(results[1]!.stderr).toMatch(/without credentials, query or fragment/);
    expect(results[4]!.stderr).toMatch(/--approval does not apply with --attach/);

    // Nothing listens on port 9: the tool call says the server is unreachable (the MCP session itself keeps working).
    const init = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "e2e", version: "0" } } });
    const look = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "observe_world", arguments: {} } });
    const down = await run(["--attach", "http://127.0.0.1:9", "--timeout", "5"], `${init}\n${look}\n`);
    expect(down.code, down.stderr).toBe(0);
    const replies = down.stdout.trim().split("\n").map((l) => JSON.parse(l) as Reply);
    expect(replies.find((r) => r.id === 2)!.result).toMatchObject({ isError: true, structuredContent: { error: "network" } });
  });
});
