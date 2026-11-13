/** The operative field (docs/PROCEDURE.md): pure model of a laparoscopic procedure. */
export { cameraPort, createProcedureState, procedureStateOf, waitingPass } from "./state.js";
export type { Bleeding, CameraView, Injury, PassedInstrument, PortState, ProcedureState, Retraction, SafetyPause } from "./state.js";
export { operate, UNCERTAIN, INSTRUMENT_OPS, ENERGY_INSTRUMENTS, COLLEAGUE_OPS, COLLEAGUE_PORTS, type ProcedureSignal, type ProcedureStepResult } from "./reduce.js";
export { observeField, type FieldView } from "./observe.js";
export { evaluateProcedure, type PlaceMembers } from "./predicates.js";
export { portReport, reach, segmentDistance, directionVector, describeDirection, angleDeg, type PortReport, type PortMetric } from "./geometry.js";
export { clearedFraction, exposure, isVisible, viewCriteria, viewHolds, obscured } from "./field.js";
export { resolveProcedure, procedureFor, baseProcedure, nameVocabulary, tubeVocabulary, vocabularyStructures } from "./variant.js";
export { checkProcedureRef } from "./check.js";
export { claimMatches, claimAsserts, claimsMatchField, criterionCount, pauseValid } from "./claims.js";
