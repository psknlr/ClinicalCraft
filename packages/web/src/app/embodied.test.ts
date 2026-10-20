/**
 * The browser `Mover` and `CameraSensor` over a fake renderer: the avatar
 * follows the world's route with the renderer's walk, staff rigs walk theirs,
 * a pushed cart travels with its walker, bodies the renderer does not draw
 * move instantly (as headless), and camera frames are the avatar's only,
 * capped and rate-limited.
 */
import { PRIMARY_ACTOR, type NavPlan } from "@clinicalcraft/world";
import { describe, expect, it, vi } from "vitest";
import type { BodyMove, BodyPose, RoutePoint, WorldApi } from "../contracts.js";
import { BrowserCamera, BrowserMover, placementIdOf, staffIdOf } from "./embodied.js";

type Plan = Extract<NavPlan, { ok: true }>;
const target = { x: 30.25, y: 0, z: -14.75, yaw: -0.28, pitch: 0, level: "L0" };
const plan: Plan = { ok: true, goal: { kind: "point", x: 30.25, z: -14.75 }, path: [{ x: 11.75, z: 8.75, level: "L0" }, { x: 30.25, z: -14.75, level: "L0" }], length: 40, travelSeconds: 30, target } as unknown as Plan;

function fakeRenderer(over: Partial<WorldApi> = {}) {
  const calls: string[] = [];
  const staff = new Map<string, BodyPose>([["ed-nurse", { x: 21, y: 0, z: -9.4, yaw: 0, pitch: 0, level: "L0" }]]);
  const api = {
    position: { x: 0, y: 0, z: 27, yaw: 0, pitch: 0, level: "L0" },
    followRoute: vi.fn(async (route: RoutePoint[], opts?: { yaw?: number }): Promise<BodyMove> => {
      calls.push(`follow:${route.length}:${opts?.yaw}`);
      return { arrived: true, pose: { ...target }, replans: 1 };
    }),
    walkStaff: vi.fn(async (id: string, route: RoutePoint[]): Promise<BodyMove> => {
      calls.push(`staff:${id}:${route.length}`);
      return { arrived: true, pose: { ...target }, replans: 0 };
    }),
    staffPose: (id: string) => staff.get(id) ?? null,
    pushEquipment: (id: string, by: string | null) => calls.push(`push:${id}:${by}`),
    pushPatient: (slot: string, by: string | null, posture?: string) => calls.push(`patient:${slot}:${by}${posture ? `:${posture}` : ""}`),
    placeEquipment: (id: string, at: unknown) => calls.push(`place:${id}:${at === null ? "hidden" : JSON.stringify(at)}`),
    setDoor: (id: string, open: boolean) => calls.push(`door:${id}:${open}`),
    captureFrame: vi.fn((opts: { maxWidth: number }) => ({ mimeType: "image/jpeg", data: "AAAA", width: Math.min(768, opts.maxWidth), height: 300, pose: { x: 1, y: 0, z: 2, yaw: 0, pitch: 0, level: "L0" } })),
    ...over,
  };
  return { api: api as unknown as WorldApi, calls };
}

describe("BrowserMover", () => {
  it("walks the avatar along the world's route and reports where it stopped", async () => {
    const { api, calls } = fakeRenderer();
    const started: string[] = [];
    const ended: boolean[] = [];
    const mover = new BrowserMover({ renderer: () => api, onStart: (a) => started.push(a), onEnd: (_a, m) => ended.push(m.arrived) });
    const move = mover.move(PRIMARY_ACTOR, plan);
    expect(mover.isMoving(PRIMARY_ACTOR)).toBe(true);
    expect(mover.moving().map((m) => m.actorId)).toEqual([PRIMARY_ACTOR]);
    const r = await move;
    expect(r).toEqual({ arrived: true, pose: target, replans: 1 });
    expect(calls).toEqual([`follow:2:${target.yaw}`]);
    expect(started).toEqual([PRIMARY_ACTOR]);
    expect(ended).toEqual([true]);
    expect(mover.isMoving()).toBe(false);
  });

  it("walks a drawn staff rig, pushing the cart of a move_to in front of her", async () => {
    const { api, calls } = fakeRenderer();
    const mover = new BrowserMover({ renderer: () => api, pushing: (a) => (a === "staff:ed-nurse" ? "ecg-cart" : null) });
    const r = await mover.move("staff:ed-nurse", plan);
    expect(r.arrived).toBe(true);
    expect(calls).toEqual(["push:ecg-cart:ed-nurse", "staff:ed-nurse:2", "push:ecg-cart:null"]);
  });

  it("a transport (EMBODIED §8): the porter pushes the bed, the patient lying on it, then the world places them", async () => {
    const { api, calls } = fakeRenderer();
    const mover = new BrowserMover({
      renderer: () => api,
      pushing: (a) => (a === "staff:ed-nurse" ? "ward-bed-1" : null),
      carrying: (a) => (a === "staff:ed-nurse" ? { slotId: "ward-1", posture: "lying" } : null),
    });
    const r = await mover.move("staff:ed-nurse", plan);
    expect(r.arrived).toBe(true);
    expect(calls).toEqual(["push:ward-bed-1:ed-nurse", "patient:ward-1:ed-nurse:lying", "staff:ed-nurse:2", "push:ward-bed-1:null", "patient:ward-1:null"]);
  });

  it("moves bodies the renderer does not draw instantly, like the headless mover", async () => {
    const { api, calls } = fakeRenderer();
    const mover = new BrowserMover({ renderer: () => api });
    expect(await mover.move("staff:nobody", plan)).toEqual({ arrived: true, pose: target, replans: 0 });
    expect(await new BrowserMover({ renderer: () => null }).move(PRIMARY_ACTOR, plan)).toEqual({ arrived: true, pose: target, replans: 0 });
    const aborted = new AbortController();
    aborted.abort();
    expect((await new BrowserMover({ renderer: () => null }).move(PRIMARY_ACTOR, plan, aborted.signal)).arrived).toBe(false);
    expect(calls).toEqual([]);
  });

  it("reports the drawn pose, not arrival, when the renderer's walk fails", async () => {
    const { api } = fakeRenderer({ followRoute: async () => Promise.reject(new Error("disposed")) } as Partial<WorldApi>);
    const r = await new BrowserMover({ renderer: () => api }).move(PRIMARY_ACTOR, plan);
    expect(r.arrived).toBe(false);
    expect(r.pose).toMatchObject({ x: 0, z: 27, level: "L0" });
  });

  it("in a hidden tab (no frames) a move completes at once: the avatar or staff rig is put at the target", async () => {
    const teleports: string[] = [];
    const { api, calls } = fakeRenderer({
      teleport: (x: number, z: number, yaw?: number, level?: string) => teleports.push(`avatar:${x},${z},${yaw},${level}`),
      placeStaff: (id: string, pose: { x: number; z: number; level: string } | null) => teleports.push(`staff:${id}:${pose ? `${pose.x},${pose.z},${pose.level}` : "post"}`),
    } as Partial<WorldApi>);
    const started: string[] = [];
    const ended: boolean[] = [];
    const mover = new BrowserMover({ renderer: () => api, hidden: () => true, onStart: (a) => started.push(a), onEnd: (_a, m) => ended.push(m.arrived), pushing: () => "ecg-cart" });
    expect(await mover.move(PRIMARY_ACTOR, plan)).toEqual({ arrived: true, pose: target, replans: 0 });
    expect(await mover.move("staff:ed-nurse", plan)).toEqual({ arrived: true, pose: target, replans: 0 });
    expect(teleports).toEqual([`avatar:${target.x},${target.z},${target.yaw},${target.level}`, `staff:ed-nurse:${target.x},${target.z},${target.level}`]);
    expect(calls).toEqual([]); // no walk animated, no cart pushed (the world parks it)
    expect(started).toEqual([PRIMARY_ACTOR, "staff:ed-nurse"]);
    expect(ended).toEqual([true, true]);
    expect(mover.isMoving()).toBe(false);
    // a cancelled move still does not arrive
    const aborted = new AbortController();
    aborted.abort();
    expect((await mover.move(PRIMARY_ACTOR, plan, aborted.signal)).arrived).toBe(false);
  });

  it("a walk under way when the tab is hidden finishes without frames; WASD (the learner) still interrupts a visible one", async () => {
    let hidden = false;
    const hideListeners = new Set<() => void>();
    const teleports: string[] = [];
    let walkSignal: AbortSignal | undefined;
    const { api } = fakeRenderer({
      // a renderer walk that only ends when stopped (no frames come in a hidden tab)
      followRoute: (_route: RoutePoint[], opts?: { signal?: AbortSignal }) =>
        new Promise<BodyMove>((resolve) => {
          walkSignal = opts?.signal;
          opts?.signal?.addEventListener("abort", () => resolve({ arrived: false, pose: { x: 5, y: 0, z: 5, yaw: 0, pitch: 0, level: "L0" }, replans: 0 }), { once: true });
        }),
      teleport: (x: number, z: number) => teleports.push(`${x},${z}`),
    } as Partial<WorldApi>);
    const mover = new BrowserMover({
      renderer: () => api,
      hidden: () => hidden,
      onHidden: (fn) => {
        hideListeners.add(fn);
        return () => hideListeners.delete(fn);
      },
    });
    const move = mover.move(PRIMARY_ACTOR, plan);
    await new Promise((r) => setTimeout(r, 5));
    expect(walkSignal).toBeDefined();
    hidden = true;
    for (const fn of hideListeners) fn();
    expect(await move).toEqual({ arrived: true, pose: target, replans: 0 });
    expect(teleports).toEqual([`${target.x},${target.z}`]);
    expect(hideListeners.size).toBe(0);

    // Visible: the learner's WASD stops the walk — reported as not arrived, where the avatar stood.
    hidden = false;
    const { api: wasd } = fakeRenderer({ followRoute: async () => ({ arrived: false, pose: { x: 12, y: 0, z: 3, yaw: 0, pitch: 0, level: "L0" }, replans: 0 }) } as Partial<WorldApi>);
    const r = await new BrowserMover({ renderer: () => wasd, hidden: () => false }).move(PRIMARY_ACTOR, plan);
    expect(r).toMatchObject({ arrived: false, pose: { x: 12, z: 3 } });
  });

  it("draws parked, carried and returned equipment, and doors", () => {
    const { api, calls } = fakeRenderer();
    const mover = new BrowserMover({ renderer: () => api });
    mover.placeEntity("eq:ecg-cart", { x: 29, y: 0, z: -16, level: "L0", rot: 90 });
    mover.placeEntity("eq:pulse-ox", null);
    mover.placeEntity("door:ed:n:0", { x: 0, y: 0, z: 0, level: "L0" });
    mover.setDoor("door:ed:n:0", true);
    expect(calls).toEqual([`place:ecg-cart:${JSON.stringify({ x: 29, y: 0, z: -16, level: "L0", rot: 90 })}`, "place:pulse-ox:hidden", "door:door:ed:n:0:true"]);
    expect(staffIdOf("staff:ed-nurse")).toBe("ed-nurse");
    expect(staffIdOf("actor:clinician")).toBeNull();
    expect(placementIdOf("eq:x")).toBe("x");
    expect(placementIdOf("door:x")).toBeNull();
  });
});

describe("BrowserCamera", () => {
  it("captures the avatar's viewport only, capped at 768 px, with the camera pose and clock", async () => {
    const { api } = fakeRenderer();
    let now = 10_000;
    const camera = new BrowserCamera({ renderer: () => api, clock: () => 12.5, now: () => now, minIntervalMs: 0 });
    const frame = await camera.frame(PRIMARY_ACTOR, { maxWidth: 4096, quality: 0.7 });
    expect(frame).toMatchObject({ mimeType: "image/jpeg", imageData: "AAAA", width: 768, clock: 12.5, timestamp: 10_000, cameraPose: { x: 1, z: 2 } });
    expect((api.captureFrame as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0]).toMatchObject({ maxWidth: 768 });
    expect(await camera.frame("staff:ed-nurse", { maxWidth: 768, quality: 0.7 })).toBeNull();
    expect(camera.captures).toBe(1);
    now += 5;
  });

  it("rate-limits captures and shares one in flight", async () => {
    vi.useFakeTimers();
    try {
      const { api } = fakeRenderer();
      let now = 0;
      const camera = new BrowserCamera({ renderer: () => api, clock: () => 0, now: () => now, minIntervalMs: 1000 });
      await camera.frame(PRIMARY_ACTOR, { maxWidth: 512, quality: 0.6 });
      now = 200;
      const a = camera.frame(PRIMARY_ACTOR, { maxWidth: 512, quality: 0.6 });
      const b = camera.frame(PRIMARY_ACTOR, { maxWidth: 512, quality: 0.6 });
      expect(b).toBe(a);
      let done = false;
      void a.then(() => (done = true));
      await vi.advanceTimersByTimeAsync(700);
      expect(done).toBe(false);
      now = 1000;
      await vi.advanceTimersByTimeAsync(150);
      expect(done).toBe(true);
      expect(camera.captures).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("gives no frame without a 3D world", async () => {
    const camera = new BrowserCamera({ renderer: () => null, clock: () => 0, minIntervalMs: 0 });
    expect(await camera.frame(PRIMARY_ACTOR, { maxWidth: 768, quality: 0.7 })).toBeNull();
  });
});
