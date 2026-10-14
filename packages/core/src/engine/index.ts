/**
 * @clinicalcraft/core engine — the deterministic clinical simulation
 * (docs/ARCHITECTURE.md §3). Every export is a pure function of its inputs.
 */

// validation & loading
export { parseCase, parseFacility, parseCatalog, issuesFromZodError, contentWarnings, formatPath } from "./parse.js";
export { checkCaseIntegrity } from "./integrity.js";
export { verifyCase } from "./verify.js";

// session lifecycle
export { createSession, reduce, replay } from "./reducer.js";

// queries
export { evaluate, conditionRefs, resultFor, resultKey, parseResultKey, isOrderReady, type ConditionRef } from "./conditions.js";
export { progress, currentObjective, currentWaypoint, availableDecisions, orderStatus } from "./queries.js";
export {
  vitalsAt,
  vitalValue,
  alarmsAt,
  alarmLevel,
  alarmLimitsFor,
  roundVital,
  trendContribution,
  effectFraction,
  DEFAULT_ALARM_LIMITS,
  NOISE_AMPLITUDE,
  NORMAL_ADULT_VITALS,
  PHYSIOLOGICAL_RANGES,
  type AlarmLimit,
} from "./physiology.js";

// matching
export { normalizeQuery, matchOrders, orderWarnings, matchHistory, matchExam, matchInterventions, MATCH_THRESHOLD } from "./matcher.js";
export { compactText, tokenize, phraseScore, longestCommonSubstring, ENGLISH_STOP_WORDS } from "./text.js";

// assessment
export { assess, countCriticalAlarms } from "./assessment.js";

// facility helpers
export {
  mergeCatalogs,
  placementCapabilities,
  facilityCapabilities,
  regionAt,
  assignPatientSlot,
  resolveWaypoint,
  checkFacility,
  checkCatalogs,
  placementBox,
  rectContains,
  SPATIAL_TOLERANCE,
  type Box,
  type ResolveWaypointOptions,
} from "./facility.js";

// utilities
export { createRng, hashString, seedFrom } from "./random.js";

export type {
  Issue,
  ParseResult,
  ObjectiveProgress,
  DecisionAvailability,
  OrderStatus,
  ReplayRejection,
  ReplayResult,
  AlarmLevel,
  VitalAlarm,
  VitalsSnapshot,
  MatchHit,
  AssessmentReport,
  PatientSlot,
  WaypointLocation,
  VerifyResult,
} from "./types.js";
