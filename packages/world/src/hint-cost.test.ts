/**
 * Extra review item 4: a FAILING `checkSpatial` used to rank its hints with a reachability flood on every
 * call (43–72 ms in the browser), so a UI could not ask at 10 Hz. The failure's `reason`, `message`, `hint`
 * and `details` are now resolved lazily — the first time one is read, for the pose the actor had when
 * checked — with the same results as before. Micro-benchmark with a budget: asking only whether an act can
 * be done here floods nothing.
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR, type ClinicalIntent, type Pose, type SpatialCheck } from "./contracts.js";
import { makeWorld } from "./__fixtures__/world.js";

const A = PRIMARY_ACTOR;
const ECG: ClinicalIntent = { tool: "order_test", kind: "order", investigationId: "ecg-12lead" };
const plain = (c: SpatialCheck) => JSON.parse(JSON.stringify(c)) as unknown;

/** Distinct walkable spots along the ED corridor (each a new flood when ranked). */
function spots(n: number): Pose[] {
  return Array.from({ length: n }, (_, i) => ({ x: 10 + (i % 20) * 0.5, y: 0, z: -3 - Math.floor(i / 20) * 0.5, yaw: 0, pitch: 0, level: "L0" }));
}

describe("lazy hint ranking (extra review item 4)", () => {
  it("unread failures flood nothing: 60 checks from distinct spots stay within budget, far below ranking them", () => {
    const w = makeWorld("stemi-inferior-rv");
    const poses = spots(60);
    // warm up (module JIT, grids, the bedside walk field)
    for (const p of poses.slice(0, 5)) {
      w.runtime.updatePose(A, p);
      w.runtime.checkSpatial(A, ECG);
    }
    let t0 = performance.now();
    for (const p of poses) {
      w.runtime.updatePose(A, p);
      const c = w.runtime.checkSpatial(A, ECG);
      expect(c.ok).toBe(false);
    }
    const unread = performance.now() - t0;
    t0 = performance.now();
    for (const p of poses) {
      w.runtime.updatePose(A, { ...p, x: p.x + 0.25 });
      const c = w.runtime.checkSpatial(A, ECG);
      expect(!c.ok && c.hint).toBeTruthy();
    }
    const read = performance.now() - t0;
    console.info(`[hint-cost] 60 failing checks: ${unread.toFixed(1)} ms unread, ${read.toFixed(1)} ms with the hint ranked`);
    // budget: 2.5 ms a check on average without the hint (a UI asking at 10 Hz spends < 3 %)
    expect(unread / poses.length).toBeLessThan(2.5);
    expect(unread).toBeLessThan(read);
  });

  it("identical results: resolved for the pose checked, whenever read; deterministic", () => {
    const w = makeWorld("stemi-inferior-rv");
    const far: Pose = { x: 12, y: 0, z: -3, yaw: 0, pitch: 0, level: "L0" };
    w.runtime.updatePose(A, far);
    const lazy = w.runtime.checkSpatial(A, ECG);
    expect(lazy.ok).toBe(false);
    // the actor walks on before the UI reads the hint: still the hint for where it was checked
    w.runtime.updatePose(A, { ...far, x: 30, z: -16 });
    const readLate = plain(lazy);
    w.runtime.updatePose(A, far);
    const fresh = w.runtime.checkSpatial(A, ECG);
    expect(readLate).toEqual(plain(fresh));
    // every field enumerable and stable once read
    expect(Object.keys(lazy).sort()).toEqual(["code", "details", "hint", "message", "ok", "reason", "requirement"]);
    expect(plain(lazy)).toEqual(readLate);
    if (!lazy.ok) expect(lazy.hint).toBe(lazy.hint);
  });
});
