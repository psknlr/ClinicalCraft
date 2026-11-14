/**
 * Test-only (excluded from the build): an operating theatre with a full care team, for the world's operations restricted
 * by a surgical control and the wound rule (docs/EMBODIED.md §8.2, §8.6). general-hospital's theatre (`or-theatre`)
 * gets the team of core's lap-chole fixture (`lap-chole-team.ts`) as its members of staff — the circulating nurse
 * `nurse-1`, the scrub nurse `nurse-2`, the first assistant `doc-1`, the second assistant `doc-2` (the line-up
 * `three-surgeons`), the anaesthetist `anaes-1` and the stand-in surgeon `doc-0`; the relief scrub nurse `nurse-9`
 * waits in the scrub room — and a porter, outside the team. Its catalog's operations carry controls: a stapler loaded
 * at the instrument table (`instruments`) and fired (`operate`), a tower switched on and off (`equipment`), a
 * lung-isolation set (`anaesthesia`); a camera head's white balance needs the tower on and names no control. Test data,
 * not a team any hospital works with.
 */
import { parseCatalog, type CaseDefinition, type ClinicalAction, type EquipmentCatalog, type FacilityDefinition, type ProcedureOp } from "@clinicalcraft/core";
import { LAP_CHOLE_TEAM, lapCholeTeamCase, REFERENCE_OPS } from "../../../core/src/engine/procedure/__fixtures__/lap-chole-team.js";
import { LAP_CHOLE_SIT } from "../../../core/src/engine/procedure/__fixtures__/lap-chole-sit.js";
import type { EntityId } from "../contracts.js";
import { loadFacility } from "./content.js";
import { catalogs, makeWorld, type TestWorld } from "./world.js";

const L = (en: string, zh: string) => ({ en, "zh-CN": zh });
const part = [{ m: "white", p: [0, 0.05, 0], s: [0.2, 0.1, 0.1] }];

/** The theatre the team works in. */
export const THEATRE = "or-theatre";

/** The bodies of the theatre's staff. */
export const STAFF = {
  standIn: "staff:doc-0",
  first: "staff:doc-1",
  second: "staff:doc-2",
  circulating: "staff:nurse-1",
  scrub: "staff:nurse-2",
  anaesthetist: "staff:anaes-1",
  relief: "staff:nurse-9",
  porter: "staff:porter-1",
} as const;

/** The test devices (placement ids). */
export const DEVICE = { stapler: "eq:t-stapler", tower: "eq:t-tower", camera: "eq:t-camera", lung: "eq:t-lung" } as const;

/** Test types whose operations name a surgical control (and one that does not). */
export function theatreCatalog(): EquipmentCatalog {
  const device = (id: string, name: ReturnType<typeof L>, behavior: Record<string, unknown>) => ({
    id,
    name,
    category: "surgery",
    description: name,
    footprint: { w: 0.3, d: 0.3, h: 0.9 },
    solid: false,
    parts: part,
    interaction: { kind: "device" },
    behavior,
  });
  const r = parseCatalog({
    schema: "clinicalcraft/equipment-catalog@1",
    id: "world-theatre-test",
    name: L("Theatre test", "手术室测试"),
    equipment: [
      device("test-stapler", L("Linear stapler", "直线切割闭合器"), {
        initial: "empty",
        states: { empty: { name: L("empty", "未装钉仓") }, loaded: { name: L("loaded", "已装钉仓") }, fired: { name: L("fired", "已击发") } },
        operations: {
          load: { name: L("Load a reload", "装钉仓"), from: ["empty", "fired"], to: "loaded", control: "instruments" },
          fire: { name: L("Fire the stapler", "击发闭合器"), from: ["loaded"], to: "fired", control: "operate" },
        },
      }),
      device("test-tower", L("Laparoscopy tower", "腹腔镜主机"), {
        initial: "off",
        states: { off: { name: L("off", "关机") }, on: { name: L("on", "开机") } },
        operations: {
          power_on: { name: L("Switch on", "开机"), from: ["off"], to: "on", control: "equipment" },
          power_off: { name: L("Switch off", "关机"), from: ["on"], to: "off", control: "equipment" },
        },
      }),
      device("test-camera-head", L("Camera head", "摄像头"), {
        initial: "idle",
        states: { idle: {}, balanced: { name: L("balanced", "已白平衡") } },
        operations: {
          balance: { name: L("White-balance the camera", "白平衡"), from: ["idle"], to: "balanced", requires: [{ nearbyState: { type: "test-tower", state: "on", within: 6 } }] },
        },
      }),
      device("test-lung-isolation", L("Bronchial blocker", "支气管封堵器"), {
        initial: "two-lung",
        states: { "two-lung": { name: L("both lungs ventilated", "双肺通气") }, "one-lung": { name: L("one lung isolated", "单肺通气") } },
        operations: {
          isolate: { name: L("Isolate the lung", "肺隔离"), from: ["two-lung"], to: "one-lung", control: "anaesthesia" },
          restore: { name: L("Ventilate both lungs", "恢复双肺通气"), from: ["one-lung"], to: "two-lung", control: "anaesthesia" },
        },
      }),
    ],
  });
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.value;
}

/** general-hospital with the theatre's staff and the test devices (non-solid: the built-in routes are unchanged). */
export function theatreFacility(): FacilityDefinition {
  const f = structuredClone(loadFacility("general-hospital"));
  const staff = (id: string, role: "attending" | "nurse" | "porter", position: string | undefined, en: string, zh: string, x: number, z: number, room = THEATRE) =>
    ({ id, role, ...(position ? { position } : {}), name: L(en, zh), room, x, z, rot: 0 }) as FacilityDefinition["staff"][number];
  f.staff.push(
    staff("doc-0", "attending", "surgeon", "Dr Ito", "伊藤医生", -19.5, -7),
    staff("doc-1", "attending", "first-assistant", "Dr Abe", "阿部医生", -20.5, -6),
    staff("doc-2", "attending", "second-assistant", "Dr Sato", "佐藤医生", -21.5, -6),
    staff("nurse-1", "nurse", "circulating-nurse", "Lin Xiao", "林晓", -19, -9.5),
    staff("nurse-2", "nurse", "scrub-nurse", "Chen Yu", "陈雨", -22.5, -6),
    staff("anaes-1", "attending", "anaesthetist", "Dr Wang", "王医生", -28.5, -9.5),
    staff("nurse-9", "nurse", "scrub-nurse", "Zhou Min", "周敏", -21, -18, "or-scrub"),
    staff("porter-1", "porter", undefined, "Li Qiang", "李强", -18.5, -12),
  );
  f.placements.push(
    { id: "t-stapler", type: "test-stapler", x: -22.4, z: -7.6, y: 0, rot: 0, room: THEATRE },
    { id: "t-tower", type: "test-tower", x: -20.5, z: -12.5, y: 0, rot: 0, room: THEATRE },
    { id: "t-camera", type: "test-camera-head", x: -21.4, z: -12.5, y: 0, rot: 0, room: THEATRE },
    { id: "t-lung", type: "test-lung-isolation", x: -27.4, z: -11, y: 0, rot: 0, room: THEATRE },
  );
  return f;
}

/** The lap-chole team case with its team in the theatre (`extra` replaces top-level fields, as `lapCholeTeamCase`). */
export function theatreCase(extra: Record<string, unknown> = {}): CaseDefinition {
  return lapCholeTeamCase({ team: { ...structuredClone(LAP_CHOLE_TEAM), room: THEATRE }, ...extra });
}

/** The theatre case whose operation may also be abandoned and referred (`bailout abandon-refer`). */
export function abandonableCase(): CaseDefinition {
  const procedure = structuredClone(LAP_CHOLE_SIT.procedure) as Record<string, unknown>;
  procedure.bailouts = ["call-help", "convert-open", "abandon-refer"];
  return theatreCase({ procedure });
}

/** A world of the theatre case (`start`: the session's first action — a place is `{ type: "start", seat }`). */
export function theatreWorld(opts: { start?: Extract<ClinicalAction, { type: "start" }>; locale?: string; caseDef?: CaseDefinition } = {}): TestWorld {
  return makeWorld("mini-lap-chole-sit", { facility: theatreFacility(), catalogs: [...catalogs(), theatreCatalog()], caseDef: opts.caseDef ?? theatreCase(), ...(opts.start ? { start: opts.start } : {}), ...(opts.locale ? { locale: opts.locale } : {}) });
}

/** Put a body right beside an entity (a sensor pose: no walk), `dz` metres to its south. */
export function standBeside(w: TestWorld, actorId: string, id: EntityId, dz = 0.6): void {
  const p = id === w.patientId ? w.runtime.patientPlace()! : { ...w.runtime.entity(id)!.position, level: w.runtime.entity(id)!.level };
  w.runtime.updatePose(actorId, { x: p.x, y: 0, z: p.z + dz, yaw: 0, pitch: 0, level: p.level });
}

/** Operate in the theatre phase: each step must be accepted (into the theatre first when the case is not there yet). */
export function operate(w: TestWorld, ops: readonly ProcedureOp[]): void {
  if (w.harness.state().phase !== "theatre") {
    const r = w.harness.dispatch({ type: "set-phase", phase: "theatre" });
    if (r.rejected) throw new Error(`set-phase: ${r.rejected.message}`);
  }
  for (const op of ops) {
    const r = w.harness.dispatch({ type: "operate", op });
    if (r.rejected) throw new Error(`${op.op}: ${r.rejected.message}`);
  }
}

/** The safe operation from the plan to the close (core's reference path). */
export const WHOLE_OPERATION: readonly ProcedureOp[] = REFERENCE_OPS;
