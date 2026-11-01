/** The operative field (docs/PROCEDURE.md): pure model of a laparoscopic procedure. */
export { createProcedureState } from "./state.js";
export type { Bleeding, Injury, PortState, ProcedureState, Retraction, SafetyPause } from "./state.js";
export { operate, INSTRUMENT_OPS, ENERGY_INSTRUMENTS, type ProcedureSignal, type ProcedureStepResult } from "./reduce.js";
export { observeField, type FieldView } from "./observe.js";
export { evaluateProcedure } from "./predicates.js";
export { portReport, reach, segmentDistance, directionVector, describeDirection, angleDeg, type PortReport, type PortMetric } from "./geometry.js";
export { clearedFraction, exposure, isVisible, viewCriteria, viewHolds, obscured } from "./field.js";
