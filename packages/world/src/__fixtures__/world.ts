/**
 * Test-only harness for the dynamic layer (excluded from the build): the
 * built-in cases, a fake `ClinicalView` / `ClinicalPort` over the REAL core
 * engine (tools dispatch engine actions; outcomes can be gated to simulate
 * the approval gate, a rejection or a slow approval), deterministic clocks
 * and ids, and a world builder for a case in a facility slot.
 */
import { readFileSync, readdirSync } from "node:fs";
import {
  assignPatientSlot,
  createSession,
  parseCase,
  parseCatalog,
  reduce,
  vitalsAt,
  type CaseDefinition,
  type ClinicalAction,
  type EquipmentCatalog,
  type FacilityDefinition,
  type ReduceResult,
  type SessionState,
} from "@clinicalcraft/core";
import type { ClinicalInvokeResult, ClinicalPort, ClinicalView, Mover, PatientCues, Pose, WorldRuntime, WorldRuntimeOptions } from "../contracts.js";
import { createWorldRuntime } from "../runtime.js";
import { TraceRecorder } from "../trace.js";
import { loadCatalogs, loadFacility } from "./content.js";

const CASES = new URL("../../../content/cases/", import.meta.url);

/** Ids of every built-in case (directory order, sorted). */
export function caseIds(): string[] {
  return readdirSync(CASES).sort();
}

const caseCache = new Map<string, CaseDefinition>();

/** A built-in case, parsed (cached). */
export function loadCase(id: string): CaseDefinition {
  let c = caseCache.get(id);
  if (!c) {
    const r = parseCase(JSON.parse(readFileSync(new URL(`${id}/case.json`, CASES), "utf8")));
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.issues)}`);
    caseCache.set(id, (c = r.value));
  }
  return c;
}

type Gate = (tool: string, args: Record<string, unknown>, signal?: AbortSignal) => "ok" | "denied" | Promise<"ok" | "denied">;

/** Fake clinical side over the real engine. */
export interface ClinicalHarness {
  view: ClinicalView;
  port: ClinicalPort;
  state(): SessionState;
  /** Every `invoke` (in order). */
  calls: { actorId: string; tool: string; args: Record<string, unknown> }[];
  /** Every `elapse` (in order). */
  elapsed: { seconds: number; reason: string }[];
  /** Decides each invocation before the engine runs it (default: ok). */
  gate: Gate | null;
  cues: PatientCues;
  /** Dispatch an engine action directly (the clinical tool path, outside the world). */
  dispatch(action: ClinicalAction): ReduceResult;
}

/** The engine action a tool call stands for (null: read-only tools). */
function actionFor(tool: string, args: Record<string, unknown>): ClinicalAction | null {
  const s = (k: string) => (typeof args[k] === "string" ? (args[k] as string) : "");
  switch (tool) {
    case "order_test":
      return { type: "order", investigationId: s("investigation_id"), by: "agent" };
    case "read_result":
      return s("phase") ? { type: "read", investigationId: s("investigation_id"), phase: s("phase"), by: "agent" } : { type: "read", investigationId: s("investigation_id"), by: "agent" };
    case "intervene":
      return { type: "intervene", interventionId: s("intervention_id"), by: "agent" };
    case "examine":
      return { type: "examine", findingId: s("finding_id"), by: "agent" };
    default:
      return null;
  }
}

export function clinicalHarness(caseDef: CaseDefinition): ClinicalHarness {
  let state = reduce(caseDef, createSession(caseDef), { type: "start" }).state;
  let seq = 0;
  const h: ClinicalHarness = {
    calls: [],
    elapsed: [],
    gate: null,
    cues: { posture: caseDef.patient.posture, distressed: false, accessory: null, speaking: false },
    state: () => state,
    dispatch(action) {
      const r = reduce(caseDef, state, action);
      state = r.state;
      return r;
    },
    view: {
      caseDef,
      state: () => state,
      bedside: () => vitalsAt(caseDef, state),
      cues: () => ({ ...h.cues }),
      clock: () => state.clock,
    },
    port: {
      async invoke(actorId, tool, args, signal): Promise<ClinicalInvokeResult> {
        h.calls.push({ actorId, tool, args: { ...args } });
        const verdict = h.gate ? await h.gate(tool, args, signal) : "ok";
        if (signal?.aborted) return { ok: false, output: "cancelled", outcome: "cancelled", clinicalEventIds: [] };
        if (verdict === "denied") return { ok: false, output: "denied by the approval gate", outcome: "denied", clinicalEventIds: [] };
        const action = actionFor(tool, args);
        if (!action) return { ok: true, output: JSON.stringify(vitalsAt(caseDef, state).vitals), outcome: "ok", clinicalEventIds: [] };
        const r = h.dispatch(action);
        if (r.rejected) return { ok: false, output: r.rejected.message, outcome: "rejected", clinicalEventIds: [] };
        const n = ++seq;
        return { ok: true, output: `${tool} ok`, outcome: "ok", clinicalEventIds: r.events.map((_, i) => `ce-${n}-${i}`) };
      },
      elapse(seconds, reason) {
        h.elapsed.push({ seconds, reason });
      },
    },
  };
  return h;
}

/** Deterministic counters for `now` and `newId`. */
export function counters(prefix = "id") {
  let n = 0;
  let ms = 1_000_000;
  return { newId: () => `${prefix}-${++n}`, now: () => (ms += 10) };
}

const catalogsCache: { value: EquipmentCatalog[] | null } = { value: null };

/** The built-in catalogs (cached). */
export function catalogs(): EquipmentCatalog[] {
  return (catalogsCache.value ??= loadCatalogs());
}

export interface TestWorld {
  runtime: WorldRuntime;
  harness: ClinicalHarness;
  caseDef: CaseDefinition;
  facility: FacilityDefinition;
  slotId: string;
  patientId: string;
  trace: TraceRecorder;
  /** Run an action with a fresh action id. */
  act(request: Omit<Parameters<WorldRuntime["execute"]>[0], "actionId"> & { actionId?: string }, signal?: AbortSignal): ReturnType<WorldRuntime["execute"]>;
}

/** A world for a built-in case in a facility (default: the case's own, its first accepting slot). */
export function makeWorld(
  caseId: string,
  opts: { facility?: FacilityDefinition | "clinic-v4" | "general-hospital"; slotId?: string; locale?: string; mover?: Mover; spawn?: Pose; catalogs?: EquipmentCatalog[]; extra?: Partial<WorldRuntimeOptions> } = {},
): TestWorld {
  const caseDef = loadCase(caseId);
  const facility = typeof opts.facility === "object" ? opts.facility : loadFacility(opts.facility ?? (caseDef.facility as "clinic-v4" | "general-hospital"));
  const slotId = opts.slotId ?? assignPatientSlot(facility, caseDef)!.id;
  const harness = clinicalHarness(caseDef);
  const { newId, now } = counters();
  const trace = new TraceRecorder({ episodeId: "ep-1", caseId, facilityId: facility.id, now, clock: () => harness.view.clock(), newId });
  const runtime = createWorldRuntime({
    facility,
    catalogs: opts.catalogs ?? catalogs(),
    binding: { caseDef, slotId, locale: opts.locale ?? "en" },
    clinical: harness.view,
    port: harness.port,
    now,
    newId,
    trace,
    ...(opts.mover ? { mover: opts.mover } : {}),
    ...(opts.spawn ? { spawn: opts.spawn } : {}),
    ...(opts.extra ?? {}),
  });
  let n = 0;
  return {
    runtime,
    harness,
    caseDef,
    facility,
    slotId,
    patientId: `patient:${slotId}`,
    trace,
    act: (request, signal) => runtime.execute({ actionId: request.actionId ?? `a-${++n}`, ...request } as Parameters<WorldRuntime["execute"]>[0], signal),
  };
}

/** A mover that walks the path segment by segment, yielding between segments, and stops when aborted. */
export function steppingMover(onStep?: (index: number) => void): Mover & { started: Promise<void> } {
  let resolveStarted!: () => void;
  const started = new Promise<void>((r) => (resolveStarted = r));
  return {
    started,
    async move(_actorId, plan, signal) {
      let pose: Pose = { ...plan.target, x: plan.path[0]?.x ?? plan.target.x, z: plan.path[0]?.z ?? plan.target.z };
      resolveStarted();
      for (let i = 0; i < plan.path.length; i++) {
        await new Promise((r) => setTimeout(r, 1));
        onStep?.(i);
        if (signal?.aborted) return { arrived: false, pose, replans: 0 };
        const p = plan.path[i];
        pose = { ...pose, x: p.x, z: p.z, level: p.level };
      }
      return { arrived: true, pose: { ...plan.target }, replans: 0 };
    },
  };
}

/**
 * Test catalog: handheld items (`pocket-glucometer`), a key safe whose `open`
 * only porters may do, and a sterile tray that needs clean hands — all
 * non-solid (no collider: the built-in routes are unchanged).
 */
export function testCatalog(): EquipmentCatalog {
  const part = [{ m: "white", p: [0, 0.05, 0], s: [0.2, 0.1, 0.1] }];
  const r = parseCatalog({
    schema: "clinicalcraft/equipment-catalog@1",
    id: "world-test",
    name: { "zh-CN": "测试", en: "Test" },
    equipment: [
      { id: "pocket-glucometer", name: { "zh-CN": "掌上血糖仪", en: "Pocket glucometer" }, category: "monitoring", description: { "zh-CN": "掌上血糖仪", en: "A handheld glucometer" }, capabilities: ["point-of-care"], footprint: { w: 0.2, d: 0.1, h: 0.1 }, solid: false, parts: part, interaction: { kind: "device" }, portable: "handheld" },
      {
        id: "key-safe",
        name: { "zh-CN": "钥匙柜", en: "Key safe" },
        category: "storage",
        description: { "zh-CN": "钥匙柜", en: "A key safe" },
        footprint: { w: 0.4, d: 0.2, h: 0.5 },
        solid: false,
        parts: part,
        interaction: { kind: "device" },
        behavior: {
          initial: "shut",
          states: { shut: {}, open: {} },
          operations: {
            open: { name: { "zh-CN": "打开钥匙柜", en: "Open the key safe" }, from: ["shut"], to: "open", roles: ["porter"] },
            close: { name: { "zh-CN": "关上钥匙柜", en: "Close the key safe" }, from: ["open"], to: "shut" },
          },
        },
      },
      {
        id: "sterile-tray",
        name: { "zh-CN": "无菌包", en: "Sterile tray" },
        category: "surgery",
        description: { "zh-CN": "无菌包", en: "A sterile tray" },
        footprint: { w: 0.5, d: 0.4, h: 0.9 },
        solid: false,
        parts: part,
        interaction: { kind: "device" },
        behavior: {
          initial: "wrapped",
          states: { wrapped: {}, open: {} },
          operations: { unwrap: { name: { "zh-CN": "打开无菌包", en: "Unwrap" }, from: ["wrapped"], to: "open", requires: [{ handsClean: true }, { actorWithin: 1.2 }], durationSeconds: 20 } },
        },
      },
    ],
  });
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.value;
}

/** general-hospital with the test catalog's items in the resus room (free floor east of bay 1). */
export function hospitalWithTestItems(): { facility: FacilityDefinition; catalogs: EquipmentCatalog[] } {
  const facility = structuredClone(loadFacility("general-hospital"));
  facility.placements.push(
    { id: "pocket-glu-1", type: "pocket-glucometer", x: 35, z: -13, y: 0, rot: 0, room: "ed-resus" },
    { id: "pocket-glu-2", type: "pocket-glucometer", x: 35.6, z: -13, y: 0, rot: 0, room: "ed-resus" },
    { id: "pocket-glu-3", type: "pocket-glucometer", x: 36.2, z: -13, y: 0, rot: 0, room: "ed-resus" },
    { id: "key-safe", type: "key-safe", x: 37, z: -16, y: 0, rot: 0, room: "ed-resus" },
    { id: "sterile-tray", type: "sterile-tray", x: 37.5, z: -13.8, y: 0, rot: 0, room: "ed-resus" },
  );
  return { facility, catalogs: [...catalogs(), testCatalog()] };
}
