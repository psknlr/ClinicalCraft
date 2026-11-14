/**
 * The laparoscopic picture derived from the field (`lapScene`): nothing before the scope is in; the scope
 * at its port looking at the target — or at the region it is aimed at, nearer in a close view; organs, tissue over the regions, instruments; ducts and vessels by
 * handle only — no structure id or name of a tube anywhere in the description; retraction, clips,
 * division, blood and bile as the field shows them.
 */
import { createSession, observeField, reduce, t, type ClinicalAction, type ProcedureOp, type SessionState } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { lapCholeCase } from "./__fixtures__/lap-chole-sit.js";
import { CLOSE_SHARE, lapScene, PULL_M, sceneKey, TISSUE_OPACITY } from "./surgery-scene.js";

const c = lapCholeCase();
const def = c.procedure!;

function run(ops: ProcedureOp[]): SessionState {
  let s = reduce(c, createSession(c), { type: "start" }).state;
  s = reduce(c, s, { type: "set-phase", phase: "theatre" }).state;
  for (const op of ops) {
    const r = reduce(c, s, { type: "operate", op } as ClinicalAction);
    if (r.rejected) throw new Error(`${op.op}: ${r.rejected.message}`);
    s = r.state;
  }
  return s;
}
const scene = (s: SessionState) => lapScene(def, s.procedure!, observeField(def, s.procedure!));
const handleOf = (s: SessionState, structure: string) => s.procedure!.handles.find((h) => h.structure === structure)!.handle;

const ACCESS: ProcedureOp[] = [
  { op: "plan-ports", plan: "three-port-left" },
  { op: "insufflate", pressure: 12 },
  { op: "insert", port: "A", instrument: "laparoscope" },
  { op: "insert", port: "B", instrument: "grasper" },
  { op: "insert", port: "C", instrument: "maryland" },
];
const LATERAL: ProcedureOp = { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"], force: "firm" };
const steps = (n: number, region: string): ProcedureOp[] => Array.from({ length: n }, () => ({ op: "dissect", port: "C", region, energy: false }) as ProcedureOp);
const DISSECTED = [...ACCESS, LATERAL, ...steps(6, "hepatocystic-triangle"), ...steps(3, "cystic-plate")];

describe("the laparoscopic picture", () => {
  it("is dark until the abdomen is insufflated and the scope is in", () => {
    const s = run([{ op: "plan-ports", plan: "three-port-left" }, { op: "insufflate", pressure: 12 }]);
    const sp = scene(s);
    expect(sp.live).toBe(false);
    expect(sp.camera).toBeNull();
    expect([sp.organs, sp.tubes, sp.tissue, sp.shafts]).toEqual([[], [], [], []]);
  });

  it("looks from the camera port at the target, with the organs, the tissue over the triangle and the working instruments", () => {
    const sp = scene(run(ACCESS));
    expect(sp.live).toBe(true);
    expect(sp.camera).toEqual({ at: def.portSites.find((p) => p.id === "A")!.at, target: def.target, up: [0, 0, 1] });
    expect(sp.organs.map((o) => o.id).sort()).toEqual(["duodenum", "gallbladder", "gallbladder-fundus", "gallbladder-infundibulum", "liver"]);
    expect(sp.tubes).toEqual([]); // nothing tubular before dissection
    // tissue only over regions that hide something
    expect(sp.tissue.map((r) => [r.id, r.opacity])).toEqual([
      ["hepatocystic-triangle", TISSUE_OPACITY.untouched],
      ["cystic-plate", TISSUE_OPACITY.untouched],
    ]);
    expect(sp.shafts.map((x) => [x.port, x.instrument, x.to])).toEqual([
      ["B", "grasper", def.target],
      ["C", "maryland", def.target],
    ]);
    // the liver would wrap the target: drawn see-through; the specimen never is
    expect(sp.organs.find((o) => o.id === "liver")!.seeThrough).toBe(true);
    expect(sp.organs.find((o) => o.id === "gallbladder")!.seeThrough).toBe(false);
    expect(sp.organs.find((o) => o.id === "gallbladder")!.tint).toBe("gallbladder");
  });

  it("looks at the region the camera is aimed at, nearer in a close view — and from the port at the target again for the whole field", () => {
    const port = def.portSites.find((p) => p.id === "A")!.at;
    // the gallbladder bed: its centre is not the operation's target (the triangle's is)
    const region = def.regions.find((r) => r.id === "gallbladder-bed")!;
    const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
    const aimed = scene(run([...ACCESS, { op: "aim", port: "A", at: region.id }]));
    expect(aimed.camera).toMatchObject({ at: port, target: region.centre });
    expect(aimed.camera!.target).not.toEqual(def.target);
    const close = scene(run([...ACCESS, { op: "aim", port: "A", at: region.id }, { op: "zoom", port: "A", level: "close" }]));
    expect(close.camera!.target).toEqual(region.centre);
    expect(dist(close.camera!.at, region.centre)).toBeLessThan(dist(port, region.centre));
    expect(dist(close.camera!.at, region.centre)).toBeCloseTo(dist(port, region.centre) * (1 - CLOSE_SHARE), 6);
    // back to the whole field: the picture as it always was
    const whole = scene(run([...ACCESS, { op: "aim", port: "A", at: region.id }, { op: "zoom", port: "A", level: "close" }, { op: "aim", port: "A" }]));
    expect(whole.camera).toEqual(scene(run(ACCESS)).camera);
    // the same organs, tissue and instruments whatever the camera looks at
    expect([close.organs, close.tissue, close.shafts]).toEqual([scene(run(ACCESS)).organs, scene(run(ACCESS)).tissue, scene(run(ACCESS)).shafts]);
  });

  it("names ducts and vessels by handle only — never by id or name", () => {
    const s = run(DISSECTED);
    const sp = scene(s);
    const v = observeField(def, s.procedure!);
    expect(sp.tubes.map((x) => x.handle)).toEqual(v.tubes.map((x) => x.handle));
    expect(sp.tubes.length).toBeGreaterThanOrEqual(4);
    const json = JSON.stringify(sp);
    for (const st of def.anatomy.filter((x) => ["duct", "artery", "vein"].includes(x.kind))) {
      expect(json).not.toContain(`"${st.id}"`);
      expect(json).not.toContain(t(st.name, "en"));
    }
    expect(sp.tissue.map((r) => r.id)).toEqual([]); // both covering regions cleared
  });

  it("pulls the grasped part along the retraction; the liver stays; the duct entering it follows near that end", () => {
    const before = scene(run(ACCESS));
    const s = run([...ACCESS, LATERAL, ...steps(6, "hepatocystic-triangle")]);
    const sp = scene(s);
    const inf = sp.organs.find((o) => o.id === "gallbladder-infundibulum")!;
    const st = def.anatomy.find((x) => x.id === "gallbladder-infundibulum")!;
    const d = [inf.points[0][0] - st.points[0][0], inf.points[0][1] - st.points[0][1], inf.points[0][2] - st.points[0][2]];
    // patient-left + caudal: +x, −y, by the firm pull
    expect(d[0]).toBeGreaterThan(0);
    expect(d[1]).toBeLessThan(0);
    expect(Math.hypot(d[0], d[1], d[2])).toBeCloseTo(PULL_M.firm, 5);
    expect(sp.organs.find((o) => o.id === "liver")!.points).toEqual(before.organs.find((o) => o.id === "liver")!.points);
    const cd = sp.tubes.find((x) => x.handle === handleOf(s, "cystic-duct"))!;
    const cdDef = def.anatomy.find((x) => x.id === "cystic-duct")!;
    const moved = (i: number) => Math.hypot(...cd.points[i].map((x, k) => x - cdDef.points[i][k]));
    expect(moved(0)).toBeGreaterThan(moved(1)); // the gallbladder end moves, the junction barely
  });

  it("shows clips, the gap of a divided tube, blood and bile as the field shows them", () => {
    const base = run(DISSECTED);
    const cd = handleOf(base, "cystic-duct");
    const ca = handleOf(base, "cystic-artery");
    const ops: ProcedureOp[] = [
      ...DISSECTED,
      { op: "isolate", port: "C", handle: cd },
      { op: "isolate", port: "C", handle: ca },
      { op: "withdraw", port: "C" },
      { op: "insert", port: "C", instrument: "clip-applier" },
      { op: "clip", port: "C", handle: cd, count: 3 },
      { op: "withdraw", port: "C" },
      { op: "insert", port: "C", instrument: "scissors" },
      { op: "divide", port: "C", handle: cd },
      // the artery divided without clips: it bleeds and the field is obscured
      { op: "divide", port: "C", handle: ca },
    ];
    const sp = scene(run(ops));
    expect(sp.tubes.find((x) => x.handle === cd)).toMatchObject({ clips: 3, divided: true, isolated: true });
    expect(sp.tubes.find((x) => x.handle === ca)).toMatchObject({ clips: 0, divided: true });
    expect(sp.blood).toBe("haze");
    expect(sp.shafts.find((x) => x.port === "C")!.instrument).toBe("scissors");
    // suctioned: the field clears, the bleeding still shows
    const sucked = run([...ops, { op: "withdraw", port: "C" }, { op: "insert", port: "C", instrument: "suction" }, { op: "suction", port: "C" }]);
    expect(scene(sucked).blood).toBe("pool");
  });

  it("shows bile and stones from a perforated gallbladder", () => {
    const s = run([...ACCESS, { op: "retract", port: "B", structure: "gallbladder-fundus", direction: ["cephalad"], force: "excessive" }]);
    const sp = scene(s);
    expect(sp.bile).toBe(true);
    expect(sp.stones).toBe(true);
  });

  it("has a stable key", () => {
    expect(sceneKey(scene(run(ACCESS)))).toBe(sceneKey(scene(run(ACCESS))));
    expect(sceneKey(scene(run(ACCESS)))).not.toBe(sceneKey(scene(run([...ACCESS, LATERAL]))));
  });
});
