/**
 * THE screen rule (extra review item 1, EMBODIED §6 `monitor-screen`): the monitor's `read` operation, the
 * policy's `monitor-screen` option and perception's screen cue share one predicate
 * (`WorldLocator.screenInView`): the monitor's own room, within the screen range, line of sight — never
 * through a window. Regression: the reviewer read the resus monitor from the ED station through the window.
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR, type ClinicalIntent, type SpatialPolicy } from "./contracts.js";
import { makeWorld } from "./__fixtures__/world.js";

const A = PRIMARY_ACTOR;
const VITALS: ClinicalIntent = { tool: "check_vitals", kind: "vitals" };
/** A policy whose vitals need the screen alone (the other options would hide disagreements). */
const SCREEN_ONLY: SpatialPolicy = { requirementFor: (i) => (i.kind === "vitals" ? { kind: "monitor-screen", range: 6 } : { kind: "anywhere" }) };

describe("the screen rule: read ⇔ the policy's monitor-screen option, over sampled points", () => {
  for (const caseId of ["stemi-inferior-rv", "dka-adult"]) {
    it(caseId, async () => {
      const w = makeWorld(caseId, { extra: { policy: SCREEN_ONLY } });
      w.harness.dispatch({ type: "intervene", interventionId: "cardiac-monitoring", by: "agent" });
      const monitor = w.runtime.patientMonitor()!;
      expect(monitor).toBe("eq:resus1-monitor");
      const m = w.runtime.entity(monitor)!.position;
      let sampled = 0, readable = 0;
      // a 0.5 m grid 9 m around the monitor: inside the bay, the ED station behind the window, the corridor
      for (let dx = -9; dx <= 9; dx += 0.5)
        for (let dz = -9; dz <= 9; dz += 0.5) {
          const x = m.x + dx, z = m.z + dz;
          w.runtime.updatePose(A, { x, y: 0, z, yaw: Math.atan2(x - m.x, z - m.z), pitch: 0, level: "L0" });
          const read = await w.act({ actorId: A, operation: "read", targetId: monitor });
          const check = w.runtime.checkSpatial(A, VITALS);
          expect(read.status === "completed", `(${x}, ${z}) in ${w.runtime.actor(A)!.room}: read ${read.status} (${read.message}), check ${check.ok}`).toBe(check.ok);
          // a screen the body perceives is one the rule allows
          if (w.runtime.inspect(A, monitor)?.cues?.screen) expect(check.ok, `(${x}, ${z}): screen cue without the rule`).toBe(true);
          sampled++;
          if (check.ok) readable++;
        }
      expect(sampled).toBeGreaterThan(1000);
      expect(readable).toBeGreaterThan(20);
    }, 120000);
  }

  it("the reviewer's spots at the ED station, behind the resus bay's window: no read, no screen", async () => {
    const w = makeWorld("stemi-inferior-rv", { extra: { policy: SCREEN_ONLY } });
    w.harness.dispatch({ type: "intervene", interventionId: "cardiac-monitoring", by: "agent" });
    for (const [x, z] of [
      [25.1, -15.0],
      [25.6, -15.5],
    ] as const) {
      w.runtime.updatePose(A, { x, y: 0, z, yaw: Math.PI / 2, pitch: 0, level: "L0" });
      expect(w.runtime.actor(A)!.room).toBe("ed-station");
      const read = await w.act({ actorId: A, operation: "read", targetId: "eq:resus1-monitor" });
      expect(read).toMatchObject({ status: "failed", errorCode: "NOT_IN_RANGE" });
      // the way to a spot in the monitor's own room
      expect(read.hint?.goal).toMatchObject({ kind: "look", id: "eq:resus1-monitor", sameRoom: true });
      expect(w.runtime.checkSpatial(A, VITALS).ok).toBe(false);
      expect(w.runtime.inspect(A, "eq:resus1-monitor")?.cues?.screen).toBeUndefined();
    }
  });
});
