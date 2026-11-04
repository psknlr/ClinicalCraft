/**
 * Operative-field state (docs/PROCEDURE.md §4): what the operation has done to the anatomy so far.
 * Plain JSON, replaced (never mutated) by `operate` — it lives in `SessionState.procedure`.
 */
import type { ProcedureState } from "../../schema/procedure.js";

export type { Bleeding, Injury, PortState, ProcedureState, Retraction, SafetyPause } from "../../schema/procedure.js";

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

/** A deep copy (the state is plain JSON). */
export function cloneProcedureState(s: ProcedureState): ProcedureState {
  return structuredClone(s);
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
