/**
 * Operative-field state (docs/PROCEDURE.md §4): what the operation has done to the anatomy so far.
 * Plain JSON, replaced (never mutated) by `operate` — it lives in `SessionState.procedure`.
 */
import type { InstrumentId, PortState, ProcedureState } from "../../schema/procedure.js";

export type { Bleeding, CameraView, Injury, PassedInstrument, PortState, ProcedureState, Retraction, SafetyPause } from "../../schema/procedure.js";

/** The field before the first incision. */
export function createProcedureState(): ProcedureState {
  return {
    plan: null,
    ports: [],
    insufflated: false,
    pressure: 0,
    retractions: {},
    cleared: {},
    exposedMax: {},
    isolated: [],
    handles: [],
    claims: {},
    clips: {},
    divided: [],
    injuries: [],
    bleeding: [],
    spillage: { bile: false, stones: false, cleared: false },
    pauses: [],
    unsafe: [],
    imaged: [],
    specimen: "in-situ",
    bailouts: [],
    inspected: false,
    closed: false,
    counters: { steps: 0, exchanges: 0, clashes: 0, crossings: 0, falseAlarms: 0 },
  };
}

/** A deep copy (the state is plain JSON: the camera, the passes and the refs with the rest). */
export function cloneProcedureState(s: ProcedureState): ProcedureState {
  return structuredClone(s);
}

/** The camera port the picture comes from: a camera-role port with the laparoscope in it (undefined: none). */
export function cameraPort(s: Pick<ProcedureState, "ports">): PortState | undefined {
  return s.ports.find((p) => p.role === "camera" && p.instrument === "laparoscope");
}

/**
 * The first pass of `instrument` waiting for `to` (undefined: the operator) — its index in `passed`, -1 when there is
 * none. An insert by that hand takes it.
 */
export function waitingPass(s: Pick<ProcedureState, "passed">, instrument: InstrumentId, to: string | undefined): number {
  return (s.passed ?? []).findIndex((q) => q.instrument === instrument && q.to === to);
}

/**
 * The operation's field now: the recorded one, else the field before the first incision with the equipment as
 * recorded so far (`SessionState.equipment` — a fault before the operation opens is carried into it, never a start).
 */
export function procedureStateOf(s: { procedure?: ProcedureState | undefined; equipment?: { image: boolean; gas: boolean } | undefined }): ProcedureState {
  if (s.procedure) return s.procedure;
  const p = createProcedureState();
  const e = s.equipment;
  return e && (!e.image || !e.gas) ? { ...p, supply: { image: e.image, gas: e.gas } } : p;
}
