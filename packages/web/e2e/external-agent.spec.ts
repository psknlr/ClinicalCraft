/**
 * An external agent in the learner's live encounter (docs/PROTOCOL.md §13,
 * §13.6; docs/EMBODIED.md §12) — end to end with real processes: the web
 * build served by `clinicalcraft serve` (an access token: the page uses its
 * cookie), the STEMI case in embodied mode, the learner's switch “Allow an
 * external agent to control this session” in the pause menu, and
 * `clinicalcraft mcp --attach` driven over stdio JSON-RPC as Claude Code /
 * Codex / Grok CLI would — paired with the encounter by the live-session id
 * and attach key the HUD badge shows.
 *
 * Checked from the authoritative state (`window.__QA__`: world snapshot and
 * engine state), not pixels; spatial rules may change, so refusals are
 * followed by their hints instead of hard-coded positions. Screenshots of the
 * switch, the badge and a labelled approval in English and Chinese.
 */
import { expect, test, type Page } from "@playwright/test";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { embodiedSetup, enterCase, freshStart, shot } from "./helpers.js";

const WEB = fileURLToPath(new URL("..", import.meta.url));
const REPO = fileURLToPath(new URL("../../..", import.meta.url));
const TSX = join(REPO, "node_modules/.bin/tsx");
const BIN = join(REPO, "packages/cli/src/bin.ts");
const TOKEN = "e2e-external-agent-token-0123456789";
const CASE = "stemi-inferior-rv";

let root = "";
let base = "";
let tokenFile = "";
let home = "";
let serve: ChildProcess | null = null;
let serveLog = "";

/** The CLI from source (every workspace package through its `source` export), with an isolated home and no keys. */
function cli(args: string[], cwd: string): ChildProcess {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v === undefined || /_API_KEY$/.test(k) || k.startsWith("CLINICALCRAFT_") || k === "FORCE_COLOR") continue;
    env[k] = v;
  }
  return spawn(TSX, ["--conditions=source", BIN, ...args], { cwd, env: { ...env, CLINICALCRAFT_HOME: home, HOME: home, NO_COLOR: "1" }, stdio: ["pipe", "pipe", "pipe"] });
}

test.beforeAll(async () => {
  test.setTimeout(240_000);
  root = mkdtempSync(join(tmpdir(), "cc-e2e-external-"));
  home = join(root, "home");
  mkdirSync(home, { recursive: true });
  tokenFile = join(root, "server-token");
  writeFileSync(tokenFile, `${TOKEN}\n`, { mode: 0o600 });
  // The web build of this checkout, served by `clinicalcraft serve`.
  const dist = join(root, "dist");
  const build = spawnSync("npx", ["vite", "build", "--outDir", dist, "--emptyOutDir", "--logLevel", "warn"], { cwd: WEB, encoding: "utf8", timeout: 180_000 });
  expect(build.status, `${build.stdout}\n${build.stderr}`).toBe(0);
  serve = cli(["serve", "--port", "0", "--static", dist, "--token-file", tokenFile, "--lang", "en"], root);
  serve.stderr!.setEncoding("utf8").on("data", (d: string) => (serveLog += d));
  base = await new Promise<string>((resolve, reject) => {
    let out = "";
    const timer = setTimeout(() => reject(new Error(`serve did not start: ${serveLog}`)), 90_000);
    serve!.stdout!.setEncoding("utf8").on("data", (d: string) => {
      out += d;
      const m = /listening on (http:\/\/127\.0\.0\.1:\d+)\//.exec(out);
      if (m) {
        clearTimeout(timer);
        resolve(m[1]!);
      }
    });
    serve!.on("exit", (code) => reject(new Error(`serve exited ${code}: ${serveLog}`)));
  });
});

test.afterAll(async () => {
  if (serve && serve.exitCode === null) {
    serve.kill("SIGINT");
    await new Promise((r) => serve!.once("exit", r));
  }
  expect(serveLog).not.toContain(TOKEN);
  if (root) rmSync(root, { recursive: true, force: true });
});

type ToolResult = { content: { type: string; text: string }[]; structuredContent: Record<string, any>; isError?: boolean };
type Reply = { jsonrpc: "2.0"; id: number | null; result?: any; error?: { code: number; message: string } };

/** `clinicalcraft mcp --attach` on stdio, as an MCP client drives it. */
class McpAttach {
  readonly child: ChildProcess;
  stderr = "";
  readonly replies: Reply[] = [];
  private readonly waiting = new Map<number, (r: Reply) => void>();
  private buffer = "";
  private seq = 0;

  constructor(sessionId: string, attachKey: string) {
    const keyFile = join(root, `attach-key-${sessionId}`);
    writeFileSync(keyFile, `${attachKey}\n`, { mode: 0o600 });
    this.child = cli(["mcp", "--attach", base, "--token-file", tokenFile, "--world-session", sessionId, "--attach-key-file", keyFile, "--timeout", "300", "--lang", "en"], root);
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
  }

  request(method: string, params?: unknown): Promise<Reply> {
    const id = ++this.seq;
    const reply = new Promise<Reply>((resolve) => this.waiting.set(id, resolve));
    this.child.stdin!.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, ...(params !== undefined ? { params } : {}) })}\n`);
    return reply;
  }

  async call(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
    const reply = await this.request("tools/call", { name, arguments: args });
    if (reply.error) throw new Error(`${name}: ${reply.error.message}`);
    return reply.result as ToolResult;
  }

  async end(): Promise<number | null> {
    this.child.stdin!.end();
    return new Promise((resolve) => (this.child.exitCode !== null ? resolve(this.child.exitCode) : this.child.once("exit", (code) => resolve(code))));
  }
}

/** A refusal's hint (where to go first): a world operation's (`data.result.hint`) or a clinical tool's (`data.hint`). */
function hintGoal(r: ToolResult): unknown {
  const data = r.structuredContent?.data;
  return data?.result?.hint?.goal ?? data?.hint?.goal ?? null;
}

/** A tool call that follows the world's hints when it is refused for where the body stands. */
async function callFollowingHints(mcp: McpAttach, name: string, args: Record<string, unknown>): Promise<ToolResult> {
  let r = await mcp.call(name, args);
  for (let attempt = 0; attempt < 3 && r.isError; attempt++) {
    const goal = hintGoal(r);
    if (!goal) break;
    const walk = await mcp.call("navigate_to", { goal });
    expect(walk.isError, walk.content[0]?.text).toBeUndefined();
    r = await mcp.call(name, args);
  }
  return r;
}

/** The page served by `clinicalcraft serve`: the `?token=` visit sets the cookie; fresh storage. */
async function openServed(page: Page): Promise<void> {
  await page.goto(`${base}/?qa&token=${TOKEN}`);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  expect(new URL(page.url()).searchParams.has("token")).toBe(false); // the token left the address bar
  await expect(page.locator("#intro")).toBeVisible();
  await expect(page.locator("#enter")).toBeEnabled({ timeout: 180_000 });
  await expect.poll(() => page.evaluate(() => (window as any).__QA__.app.server?.health?.worldBridge ?? null), { timeout: 30_000 }).toBe(true);
}

/** Open the pause menu and set the switch; returns the badge's live-session id and attach key when on. */
async function setExternal(page: Page, on: boolean, shotName?: string): Promise<{ id: string; key: string } | null> {
  await page.locator("#pause-btn").click();
  const toggle = page.locator("#external-toggle");
  await expect(toggle).toBeVisible();
  if (shotName) {
    await toggle.scrollIntoViewIfNeeded();
    await shot(page, shotName);
  }
  if (on) await toggle.check();
  else await toggle.uncheck();
  await page.keyboard.press("Escape");
  await expect(page.locator('#panel .window[data-panel="pause"]')).toBeHidden();
  if (!on) {
    await expect(page.locator("#external-badge")).toBeHidden();
    return null;
  }
  const badge = page.locator("#external-badge");
  await expect(badge).toHaveAttribute("data-state", "connected", { timeout: 30_000 });
  const id = (await page.locator("#external-session").textContent())!.trim();
  const key = (await page.locator("#external-key").textContent())!.trim();
  expect(id).toMatch(/^ls_[A-Za-z0-9_-]{16}$/);
  expect(key).toMatch(/^ak_[A-Za-z0-9_-]{43}$/);
  return { id, key };
}

const engine = (page: Page) => page.evaluate(() => (window as any).__QA__.session.state);
const avatar = (page: Page) => page.evaluate(() => (window as any).__QA__.worldSnapshot().actors.find((a: any) => a.id === "actor:clinician").pose as { x: number; z: number; level: string });
/** Distance from the avatar to the case's patient as the world model measures it. */
const toPatient = (page: Page) =>
  page.evaluate(() => {
    const qa = (window as any).__QA__;
    const id = `patient:${qa.game.slotId}`;
    return qa.worldModel.find("actor:clinician", { kind: "patient" }).find((e: any) => e.id === id)?.distance ?? null;
  });

test.describe("an external agent in the live encounter (en)", () => {
  test.use({ locale: "en-US" });

  test("toggle → badge → mcp --attach walks to the patient, records the ECG, an approved drug (labelled); disconnect ends it", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await openServed(page);
    await enterCase(page, CASE);
    await embodiedSetup(page);
    // Off by default; the autopilot is available.
    expect(await page.evaluate(() => (window as any).__QA__.external)).toBeNull();
    await expect(page.locator("#external-badge")).toBeHidden();
    await expect(page.locator("#autopilot-btn")).toBeEnabled();

    const paired = (await setExternal(page, true, "external-toggle-en"))!;
    await expect(page.locator("#external-state")).toHaveText("External agent connected");
    await expect(page.locator("#external-calls")).toHaveText("idle");
    // both would drive the clinician: no autopilot while external control is on
    await expect(page.locator("#autopilot-btn")).toBeDisabled();
    await shot(page, "external-badge-en");
    // the menu, while on: the command to run, with this session's id
    await page.locator("#pause-btn").click();
    await expect(page.locator("#external-toggle")).toBeChecked();
    await expect(page.locator("#external-howto code")).toContainText(`--world-session ${paired.id} --attach-key-file`);
    await page.locator("#section-external").scrollIntoViewIfNeeded();
    await shot(page, "external-menu-on-en");
    await page.keyboard.press("Escape");
    // never stored: not in preferences or saves
    await page.evaluate(() => (window as any).__QA__.save());
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    expect(stored).not.toContain(paired.key);
    expect(stored).not.toContain(paired.id);

    const mcp = new McpAttach(paired.id, paired.key);
    try {
      const init = await mcp.request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "e2e", version: "0" } });
      expect(init.result).toMatchObject({ serverInfo: { name: "clinicalcraft" } });
      const listed = await mcp.call("list_live_sessions");
      expect(listed.structuredContent.sessions).toEqual([expect.objectContaining({ id: paired.id, embodiment: "embodied", connected: true })]);

      // navigate_to: the learner's avatar walks to the patient (the world model's pose and the 3D avatar agree).
      const spawn = await avatar(page);
      const before = await toPatient(page);
      const walk = await mcp.call("navigate_to", { target: "patient" });
      expect(walk.isError, walk.content[0]?.text).toBeUndefined();
      expect(walk.structuredContent).toMatchObject({ session_id: paired.id, status: "ok", untrusted: true, data: { result: { status: "completed" } } });
      const after = await avatar(page);
      expect(Math.hypot(after.x - spawn.x, after.z - spawn.z)).toBeGreaterThan(3);
      expect((await toPatient(page))!).toBeLessThan(before!);
      const drawn = await page.evaluate(() => (window as any).__QA__.world.position);
      expect(Math.hypot(drawn.x - after.x, drawn.z - after.z)).toBeLessThan(1);
      // the last call in words (the tool's id stays in the tooltip)
      await expect(page.locator("#external-last")).toContainText("Walk to");
      await expect(page.locator("#external-last")).toHaveAttribute("title", "navigate_to");

      // interact_object on the ECG cart: prepare, connect, record → the 12-lead ECG is ordered.
      const cart = await page.evaluate(() => {
        const qa = (window as any).__QA__;
        const w = qa.worldModel;
        const patient = w.entities().find((e: any) => e.id === `patient:${qa.game.slotId}`);
        const carts = w.entities().filter((e: any) => e.capabilities.includes("ecg-12lead") && e.portable === "cart" && e.level === patient.level);
        const d = (e: any) => Math.hypot(e.position.x - patient.position.x, e.position.z - patient.position.z);
        return carts.sort((a: any, b: any) => d(a) - d(b))[0]?.id ?? null;
      });
      expect(cart).toBeTruthy();
      for (const operation of ["prepare", "connect"]) {
        const r = await callFollowingHints(mcp, "interact_object", { target: cart, operation });
        expect(r.isError, `${operation}: ${r.content[0]?.text}`).toBeUndefined();
      }
      const record = await callFollowingHints(mcp, "interact_object", { target: cart, operation: "record", parameters: { investigation: "ecg-12lead" } });
      expect(record.isError, record.content[0]?.text).toBeUndefined();
      expect(record.structuredContent.data.result.clinical).toMatchObject({ tool: "order_test", ok: true });
      expect((await engine(page)).orders.map((o: { investigationId: string }) => o.investigationId)).toContain("ecg-12lead");

      // An approval-gated intervention: the LEARNER approves it in the dialog, labelled as the external agent's.
      let pending: Promise<ToolResult> | null = null;
      for (let attempt = 0; attempt < 3 && !pending; attempt++) {
        const reply = mcp.call("intervene", { intervention_id: "ticagrelor" });
        const dialog = page.locator('#approval .approval-window[data-source="external"]');
        const early = await Promise.race([reply.then((r) => r), dialog.waitFor({ state: "visible", timeout: 120_000 }).then(() => null, () => null)]);
        if (!early) {
          pending = reply;
          break;
        }
        // refused before asking (where the body stands): follow the hint and try again
        const goal = hintGoal(early);
        expect(goal, early.content[0]?.text).toBeTruthy();
        await mcp.call("navigate_to", { goal });
      }
      expect(pending).not.toBeNull();
      await expect(page.locator("#external-calls")).toHaveText("1 call(s) running"); // (behind the dialog)
      await expect(page.locator("#approval-source")).toHaveText("External agent");
      await expect(page.locator("#approval .approval-from")).toContainText("external agent");
      await expect(page.locator("#approval .approval-summary")).toContainText(/ticagrelor/i);
      await shot(page, "external-approval-en");
      await page.locator("#approval-approve").click();
      const tica = await pending!;
      expect(tica.isError, tica.content[0]?.text).toBeUndefined();
      expect(tica.structuredContent).toMatchObject({ ok: true, status: "ok", approvals: [{ tool: "intervene", decision: "approved" }] });
      expect((await engine(page)).interventions.map((i: { interventionId: string }) => i.interventionId)).toContain("ticagrelor");

      // Disconnect from the badge: the session is unregistered; the external agent's next call is refused.
      await page.locator("#external-disconnect").click();
      await expect(page.locator("#external-badge")).toBeHidden();
      expect(await page.evaluate(() => (window as any).__QA__.external)).toBeNull();
      await expect(page.locator("#autopilot-btn")).toBeEnabled();
      const refused = await mcp.call("observe_world");
      expect(refused.isError).toBe(true);
      expect(refused.structuredContent).toMatchObject({ error: "session_closed", session_id: paired.id });
      const http = await fetch(`${base}/api/world/sessions/${paired.id}/call`, { method: "POST", headers: { authorization: `Bearer ${TOKEN}`, "x-clinicalcraft-attach-key": paired.key, "content-type": "application/json" }, body: JSON.stringify({ correlationId: "after-1", tool: "observe_world" }) });
      expect([http.status, ((await http.json()) as { error: { code: string } }).error.code]).toEqual([410, "session_closed"]);
      expect((await mcp.call("list_live_sessions")).structuredContent.sessions).toEqual([]);
      expect(await mcp.end()).toBe(0);
      expect(mcp.stderr).not.toContain(TOKEN);
      expect(mcp.stderr).not.toContain(paired.key);
    } finally {
      if (mcp.child.exitCode === null) mcp.child.kill("SIGKILL");
    }
    expect(errors).toEqual([]);
  });
});

test.describe("an external agent in the live encounter (zh-CN)", () => {
  test.use({ locale: "zh-CN" });

  test("开关与徽标；隐藏标签页中的行走不卡住；外部智能体的审批被拒绝；离开接诊即断开，恢复的接诊默认关闭；接诊结束即断开", async ({ page }) => {
    await openServed(page);
    await enterCase(page, CASE);
    await embodiedSetup(page);
    const paired = (await setExternal(page, true, "external-toggle-zh"))!;
    await expect(page.locator("#external-state")).toHaveText("外部智能体已连接");
    await shot(page, "external-badge-zh");
    const mcp = new McpAttach(paired.id, paired.key);
    try {
      await mcp.request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "e2e", version: "0" } });

      // A hidden tab draws no frames: the walk completes without them (faster than any animated walk could).
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      const started = Date.now();
      const walk = await mcp.call("navigate_to", { target: "patient" });
      const elapsed = Date.now() - started;
      expect(walk.isError, walk.content[0]?.text).toBeUndefined();
      const length = walk.structuredContent.data.result.navigation.length as number;
      if (length > 15) expect(elapsed).toBeLessThan((length / 6.2) * 1000); // 6.2 m/s: the avatar's sprint
      const pose = await avatar(page);
      const drawn = await page.evaluate(() => (window as any).__QA__.world.position);
      expect(Math.hypot(drawn.x - pose.x, drawn.z - pose.z)).toBeLessThan(0.5); // the 3D avatar was put there
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      // (hiding the page opened the pause menu, as for any hidden page)
      if (await page.locator('#panel .window[data-panel="pause"]').isVisible()) await page.keyboard.press("Escape");

      // The learner denies an external agent's request: nothing is given, the agent hears "denied".
      let pending: Promise<ToolResult> | null = null;
      for (let attempt = 0; attempt < 3 && !pending; attempt++) {
        const reply = mcp.call("intervene", { intervention_id: "clopidogrel" });
        const early = await Promise.race([reply.then((r) => r), page.locator('#approval .approval-window[data-source="external"]').waitFor({ state: "visible", timeout: 120_000 }).then(() => null, () => null)]);
        if (!early) {
          pending = reply;
          break;
        }
        const goal = hintGoal(early);
        expect(goal, early.content[0]?.text).toBeTruthy();
        await mcp.call("navigate_to", { goal });
      }
      await expect(page.locator("#approval-source")).toHaveText("外部智能体");
      await expect(page.locator("#approval .approval-from")).toContainText("外部智能体");
      await shot(page, "external-approval-zh");
      await page.locator("#approval-deny").click();
      const clop = await pending!;
      expect(clop.isError).toBe(true);
      expect(clop.structuredContent).toMatchObject({ status: "denied", approvals: [{ decision: "denied" }] });
      expect((await engine(page)).interventions.map((i: { interventionId: string }) => i.interventionId)).not.toContain("clopidogrel");

      // Leaving the encounter ends external control.
      await page.locator("#pause-btn").click();
      await page.locator("#back-library").click();
      await expect(page.locator("#intro")).toBeVisible();
      const closed = await mcp.call("observe_world");
      expect(closed.structuredContent).toMatchObject({ error: "session_closed" });
      expect(await mcp.end()).toBe(0);

      // A resumed encounter starts with external control off.
      await page.locator(`.case-card[data-case="${CASE}"]`).click();
      await page.locator("#enter").click();
      await page.waitForFunction(() => (window as any).__QA__?.game?.entered === true, null, { timeout: 180_000 });
      expect(await page.evaluate(() => (window as any).__QA__.external)).toBeNull();
      await expect(page.locator("#external-badge")).toBeHidden();
      await page.locator("#pause-btn").click();
      await expect(page.locator("#external-toggle")).not.toBeChecked();
      await page.keyboard.press("Escape");

      // The encounter ending ends external control too — here its clock runs out while the agent waits: the call
      // that ended it still gets its own result, then the session is gone.
      const again = (await setExternal(page, true))!;
      expect(again.key).not.toBe(paired.key); // a new opt-in: a new key
      const mcp2 = new McpAttach(again.id, again.key);
      try {
        await mcp2.request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "e2e", version: "0" } });
        const waited = await mcp2.call("wait", { minutes: 240 });
        expect(waited.structuredContent.error, waited.content[0]?.text).toBeUndefined(); // the session's own result
        expect((await engine(page)).finished).toBe(true);
        await expect(page.locator("#external-badge")).toBeHidden({ timeout: 15_000 });
        expect(await page.evaluate(() => (window as any).__QA__.external)).toBeNull();
        expect((await mcp2.call("observe_world")).structuredContent).toMatchObject({ error: "session_closed" });
        expect(await mcp2.end()).toBe(0);
      } finally {
        if (mcp2.child.exitCode === null) mcp2.child.kill("SIGKILL");
      }
    } finally {
      if (mcp.child.exitCode === null) mcp.child.kill("SIGKILL");
    }
  });
});

test.describe("not offered without clinicalcraft serve", () => {
  test.use({ locale: "en-US" });

  test("the Vite dev server (no world bridge): no switch, no badge", async ({ page }) => {
    await freshStart(page); // the Vite dev server of this suite (its /api/health answers 204)
    await enterCase(page, CASE);
    expect(await page.evaluate(() => (window as any).__QA__.app.server?.served ?? null)).toBe(false);
    await page.locator("#pause-btn").click();
    await expect(page.locator("#section-agents")).toBeVisible();
    await expect(page.locator("#external-toggle")).toHaveCount(0);
    await expect(page.locator("#section-external")).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(page.locator("#external-badge")).toBeHidden();
    expect(await page.evaluate(() => (window as any).__QA__.external)).toBeNull();
  });
});
