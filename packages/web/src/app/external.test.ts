/**
 * External control of the running encounter (docs/PROTOCOL.md §13.6): offered
 * only when served by `clinicalcraft serve` with the world bridge (never on
 * the Vite dev server or in the standalone build), off until the learner
 * turns it on, connected with exactly `{ serverUrl: "", session, onStatus,
 * onActivity }` (the page's cookie authenticates; never `allowBypass`),
 * disposed when turned off, and gone by itself when the bridge closes (a
 * session shutdown). It keeps nothing anywhere (no storage).
 */
import type { WorldBridge, WorldBridgeActivity, WorldBridgeOptions, WorldBridgeStatus } from "@clinicalcraft/agent";
import { describe, expect, it } from "vitest";
import { ExternalControl, externalOffered } from "./external.js";

const KEY = "ak_" + "k".repeat(43);

/** A fake `connectWorldBridge`: records its options; the test drives status and activity. */
function fakeConnect() {
  const made: { options: WorldBridgeOptions; bridge: WorldBridge & { disposed: number; push(st: Partial<WorldBridgeStatus>): void; act(a: WorldBridgeActivity): void } }[] = [];
  const connect = (options: WorldBridgeOptions) => {
    let status: WorldBridgeStatus = { state: "connecting", liveSessionId: null, attachKey: KEY, activeCalls: 0, error: null };
    const owned = new Set<string>();
    const bridge = {
      disposed: 0,
      get status() {
        return status;
      },
      ready: Promise.resolve(status),
      owns: (id: string) => owned.has(id),
      async dispose() {
        bridge.disposed++;
        status = { ...status, state: "closed", liveSessionId: null, activeCalls: 0, error: { code: "disconnected", message: "The learner disconnected the external agent." } };
        options.onStatus?.(status);
      },
      push(st: Partial<WorldBridgeStatus>) {
        status = { ...status, ...st };
        options.onStatus?.(status);
      },
      act(a: WorldBridgeActivity) {
        if (a.phase === "running") owned.add(a.submissionId);
        options.onActivity?.(a);
      },
    };
    made.push({ options, bridge });
    options.onStatus?.(status); // the real client reports its first status synchronously
    return bridge;
  };
  return { connect, made };
}

const session = { id: "s" } as never;

describe("ExternalControl", () => {
  it("is offered only by clinicalcraft serve with the world bridge — not the Vite dev server, not standalone", () => {
    expect(externalOffered({ served: true, health: { worldBridge: true }, providers: [] }, false)).toBe(true);
    expect(externalOffered({ served: true, health: { status: "ok" }, providers: [] }, false)).toBe(false); // an older server
    expect(externalOffered({ served: false, health: null, providers: [] }, false)).toBe(false); // the Vite dev server (GET /api/health → 204)
    expect(externalOffered(null, false)).toBe(false);
    expect(externalOffered({ served: true, health: { worldBridge: true }, providers: [] }, true)).toBe(false); // the standalone build
  });

  it("connects with exactly serverUrl \"\", the session and the callbacks (no auth, never allowBypass); reflects status; disconnects", async () => {
    const { connect, made } = fakeConnect();
    let changes = 0;
    const activity: string[] = [];
    const ext = new ExternalControl({ connect, onChange: () => changes++, onActivity: (a) => activity.push(`${a.phase}:${a.tool}`) });
    expect(ext.on).toBe(false);
    expect(ext.status).toBeNull();
    ext.enable(session);
    ext.enable(session); // once
    expect(made).toHaveLength(1);
    const { options, bridge } = made[0]!;
    expect(Object.keys(options).sort()).toEqual(["onActivity", "onStatus", "serverUrl", "session"]);
    expect(options).toMatchObject({ serverUrl: "", session });
    expect(ext.on).toBe(true);
    expect(ext.status).toMatchObject({ state: "connecting", attachKey: KEY });
    bridge.push({ state: "connected", liveSessionId: "ls_AbCdEf0123456789" });
    expect(ext.status).toMatchObject({ state: "connected", liveSessionId: "ls_AbCdEf0123456789", attachKey: KEY });
    bridge.act({ phase: "started", correlationId: "c1", tool: "navigate_to", args: {} });
    bridge.act({ phase: "running", correlationId: "c1", tool: "navigate_to", submissionId: "sub-7" });
    expect(ext.owns("sub-7")).toBe(true);
    expect(ext.owns("sub-8")).toBe(false);
    expect(ext.lastCall).toMatchObject({ tool: "navigate_to", phase: "running" });
    bridge.act({ phase: "finished", correlationId: "c1", tool: "navigate_to", result: { ok: true, status: "ok", output: "Arrived." } });
    expect(ext.lastCall).toMatchObject({ tool: "navigate_to", phase: "finished", ok: true });
    expect(activity).toEqual(["started:navigate_to", "running:navigate_to", "finished:navigate_to"]);
    expect(changes).toBeGreaterThan(3);
    await ext.disable();
    expect(bridge.disposed).toBe(1);
    expect(ext.on).toBe(false);
    expect(ext.status).toBeNull();
    expect(ext.owns("sub-7")).toBe(false);
    await ext.disable(); // idempotent
    expect(bridge.disposed).toBe(1);
  });

  it("a failed bridge stays on (with its error) until the learner turns it off; a closed one (session shutdown) is off by itself", async () => {
    const { connect, made } = fakeConnect();
    const ext = new ExternalControl({ connect });
    ext.enable(session);
    made[0]!.bridge.push({ state: "failed", error: { code: "unauthorized", message: "The ClinicalCraft server needs its access token." } });
    expect(ext.on).toBe(true);
    expect(ext.status).toMatchObject({ state: "failed", error: { code: "unauthorized" } });
    await ext.disable();
    expect(made[0]!.bridge.disposed).toBe(1);

    ext.enable(session); // a new opt-in: a new bridge
    expect(made).toHaveLength(2);
    made[1]!.bridge.push({ state: "closed", error: { code: "session_closed", message: "The learner's session has ended." } });
    expect(ext.on).toBe(false);
    expect(ext.status).toBeNull();
  });
});
