/**
 * World bridge contract (`bridge/protocol.ts`): the bridge tools, opaque case
 * handles, id validators, result validation and bounding, command parsing —
 * and the isomorphism of `bridge/` (it runs in the browser: no `node:*`, no
 * `process`, no `Buffer`).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { clinicalTools } from "../tools/clinical.js";
import {
  ATTACH_KEY_HEADER,
  BRIDGE_LIMITS,
  BRIDGE_TOOLS,
  boundBridgeResult,
  bridgeArgsBytes,
  bridgeErrorOf,
  caseHandle,
  CHANNEL_SECRET_HEADER,
  cleanBridgeText,
  isAttachKey,
  isBridgeTool,
  isCorrelationId,
  isLiveSessionId,
  newAttachKey,
  parseBridgeCommand,
  parseBridgeHello,
  parseBridgeResult,
  parseLiveSessionInfo,
} from "./protocol.js";

describe("world bridge contract", () => {
  it("forwards the clinical and world tools — never walk_to, get_camera_frame or NPC tools", () => {
    for (const tool of clinicalTools()) expect(BRIDGE_TOOLS).toContain(tool.name);
    for (const name of ["observe_world", "navigate_to", "interact_object", "cancel_action", "delegate_task", "execute_skill"]) expect(isBridgeTool(name)).toBe(true);
    for (const name of ["walk_to", "get_camera_frame", "reveal_facts", "give_hint", "start_case", "", 42]) expect(isBridgeTool(name)).toBe(false);
  });

  it("case handles are opaque and stable (the same as MCP's)", () => {
    expect(caseHandle("stemi-inferior-rv")).toMatch(/^case-[0-9a-z]{7}$/);
    expect(caseHandle("stemi-inferior-rv")).toBe(caseHandle("stemi-inferior-rv"));
    expect(caseHandle("stemi-inferior-rv")).not.toContain("stemi");
    expect(caseHandle("pulmonary-embolism-postop")).not.toBe(caseHandle("stemi-inferior-rv"));
  });

  it("validates ids and cleans text shown to another party", () => {
    for (const ok of ["c1", "mcp-3f2a-12", "a.b:c_d-e"]) expect(isCorrelationId(ok)).toBe(true);
    for (const bad of ["", "-lead", "has space", "x".repeat(129), "../x", 5, null]) expect(isCorrelationId(bad)).toBe(false);
    expect(isLiveSessionId("ls_AbCdEf0123456789")).toBe(true);
    for (const bad of ["ls", "ls_/../x", "ls_" + "x".repeat(70)]) expect(isLiveSessionId(bad)).toBe(false);
    expect(cleanBridgeText("  Chest\u001b[2J pain\u0007 ‮ ", 200)).toBe("Chest pain");
    expect(cleanBridgeText("x".repeat(10), 5)).toBe("xxxx…");
  });

  it("parses results within the limits; bounds results before they are sent", () => {
    const ok = { ok: true, status: "ok", output: "Arrived.", data: { result: { status: "completed" } }, approvals: [{ tool: "intervene", risk: "moderate", summary: "Give ticagrelor?", decision: "approved" }] };
    expect(parseBridgeResult(ok)).toEqual(ok);
    for (const bad of [null, [], { ok: "yes", status: "ok", output: "" }, { ok: true, status: "maybe", output: "" }, { ok: true, status: "ok", output: 1 }, { ok: true, status: "ok", output: "x".repeat(BRIDGE_LIMITS.outputChars + 1) }, { ...ok, approvals: [{ tool: "intervene", risk: "extreme", summary: "", decision: "approved" }] }, { ...ok, notices: ["a", 2] }, { ...ok, data: { big: "x".repeat(BRIDGE_LIMITS.dataBytes) } }]) {
      expect(parseBridgeResult(bad), JSON.stringify(bad).slice(0, 80)).toBeNull();
    }
    const huge = boundBridgeResult({ ok: true, status: "ok", output: "y".repeat(BRIDGE_LIMITS.outputChars + 10), data: { big: "x".repeat(BRIDGE_LIMITS.dataBytes) }, notices: Array.from({ length: 40 }, (_, i) => `n${i}`) });
    expect(huge.truncated).toBe(true);
    expect(huge.output.length).toBe(BRIDGE_LIMITS.outputChars);
    expect(huge.data).toBeUndefined();
    expect(huge.notices).toHaveLength(BRIDGE_LIMITS.lines);
    expect(parseBridgeResult(huge)).not.toBeNull(); // what the browser sends always passes the server's check
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(boundBridgeResult({ ok: true, status: "ok", output: "", data: cyclic })).toEqual({ ok: true, status: "ok", output: "", truncated: true });
  });

  it("parses commands and live-session entries defensively", () => {
    expect(parseBridgeCommand({ type: "call", correlationId: "c1", tool: "navigate_to", args: { target: "patient" }, deadline: 5 })).toEqual({ type: "call", correlationId: "c1", tool: "navigate_to", args: { target: "patient" }, deadline: 5 });
    expect(parseBridgeCommand({ type: "call", correlationId: "c1", tool: "observe_world" })).toEqual({ type: "call", correlationId: "c1", tool: "observe_world", args: {}, deadline: 0 });
    expect(parseBridgeCommand({ type: "cancel", correlationId: "c1" })).toEqual({ type: "cancel", correlationId: "c1" });
    for (const bad of [null, { type: "call", correlationId: "c1", tool: "approve" }, { type: "call", correlationId: "c1", tool: "observe_world", args: [] }, { type: "approve", correlationId: "c1" }, { type: "cancel", correlationId: "bad id" }]) {
      expect(parseBridgeCommand(bad)).toBeNull();
    }
    const info = parseLiveSessionInfo({ id: "ls_AbCdEf0123456789", caseHandle: "case-0abc123", title: "Chest\u001b[0m pain", facilityId: "general-hospital", embodiment: "embodied", locale: "zh-CN", capabilities: ["observe_world", "rm_rf"], connected: true, pendingCalls: 2 });
    expect(info).toMatchObject({ title: "Chest pain", capabilities: ["observe_world"], locale: "zh-CN", connected: true, pendingCalls: 2 });
    expect(parseLiveSessionInfo({ id: "x", caseHandle: "case-1", embodiment: "embodied" })).toBeNull();
    expect(bridgeErrorOf({ error: { code: "call_timeout", message: "late", acknowledged: true } })).toEqual({ code: "call_timeout", message: "late", acknowledged: true });
    expect(bridgeErrorOf({ nope: 1 })).toBeNull();
    // `hello` carries the server's clock: the browser compares call deadlines (server time) with it (S11)
    expect(parseBridgeHello({ id: "ls_AbCdEf0123456789", heartbeatMs: 10_000, expireAfterMs: 45_000, pingMs: 10_000, now: 1_760_000_000_000 })).toEqual({ id: "ls_AbCdEf0123456789", heartbeatMs: 10_000, expireAfterMs: 45_000, pingMs: 10_000, now: 1_760_000_000_000 });
    expect(parseBridgeHello({ id: "ls_AbCdEf0123456789", heartbeatMs: 10_000, expireAfterMs: 45_000, pingMs: 10_000 })).toMatchObject({ now: null });
    expect(parseBridgeHello({ id: "nope" })).toBeNull();
  });

  it("attach keys: random, unguessable, a recognisable shape, sent in their own header (S5)", () => {
    const a = newAttachKey();
    const b = newAttachKey();
    expect(a).toMatch(/^ak_[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
    expect(isAttachKey(a)).toBe(true);
    for (const bad of ["", "ak_short", `ak_${"x".repeat(43)}!`, `xx_${"x".repeat(43)}`, "ls_AbCdEf0123456789", 5, null, `ak_${"x".repeat(200)}`]) expect(isAttachKey(bad), String(bad)).toBe(false);
    expect(ATTACH_KEY_HEADER).toBe("x-clinicalcraft-attach-key");
    expect(ATTACH_KEY_HEADER).not.toBe(CHANNEL_SECRET_HEADER);
  });

  it("measures a call's arguments as UTF-8 JSON; the limit is well below the 2 MB body limit (S9)", () => {
    expect(bridgeArgsBytes({ target: "patient" })).toBe(JSON.stringify({ target: "patient" }).length);
    expect(bridgeArgsBytes({ t: "心电" })).toBe(JSON.stringify({ t: "" }).length + 6);
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(bridgeArgsBytes(cyclic)).toBe(Infinity);
    expect(BRIDGE_LIMITS.argsBytes).toBeLessThanOrEqual(64 * 1024);
  });

  it("bridge/ is isomorphic: no node:*, process or Buffer (it runs in the browser)", () => {
    const dir = fileURLToPath(new URL(".", import.meta.url));
    const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    expect(files.sort()).toEqual(["attach-client.ts", "i18n.ts", "index.ts", "protocol.ts", "world-client.ts"]);
    for (const f of files) {
      const code = readFileSync(join(dir, f), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(code, f).not.toMatch(/from\s+["']node:|require\(|\bprocess\.|\bBuffer\b/);
    }
  });
});
