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
export { progress, currentObjective, currentWaypoint, availableDecisions, orderStatus, presentedOptions } from "./queries.js";
export { historyTwin, historyAvailable, historyCredited, creditedHistory, supersededIn, supersededItems, hasHistoryTwins } from "./twins.js";
export {
  vitalsAt,
  vitalValue,
  alarmsAt,
  patientAlarmsAt,
  unmeasurableAt,
  alarmingVitals,
  shownVitals,
  MONITORED_VITALS,
  OBSERVED_VITALS,
  monitorAttached,
  monitorAttachedAt,
  ecgAttached,
  measuredVitals,
  spotCheckVitals,
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
export { arrestKind, applyArrest, UNMEASURABLE_IN_ARREST, ARREST_MAX_ETCO2, type ArrestKind } from "./arrest.js";
export { inExtremis, oxygenAccessory, patientCues, patientPosture, type OxygenAccessory, type PatientBystanderCues } from "./cues.js";

// matching
export {
  normalizeQuery,
  matchOrders,
  orderWarnings,
  matchHistory,
  matchExam,
  matchInterventions,
  matchSpecificity,
  MATCH_THRESHOLD,
  EXCLUDE_KEYWORD_FACTOR,
  type MatchKind,
} from "./matcher.js";
export {
  compactText,
  tokenize,
  tokensMatch,
  canonicalToken,
  foldSpelling,
  phraseScore,
  phraseCoverage,
  longestCommonSubstring,
  ENGLISH_STOP_WORDS,
  ENGLISH_LEMMAS,
} from "./text.js";

// assessment
export { assess, countCriticalAlarms } from "./assessment.js";

// facility helpers
export {
  mergeCatalogs,
  placementCapabilities,
  facilityCapabilities,
  caseCapabilityGaps,
  type CapabilityGap,
  regionAt,
  assignPatientSlot,
  resolveWaypoint,
  LEVEL_CHANGE_PENALTY,
  checkFacility,
  checkCatalogs,
  placementBox,
  rectContains,
  SPATIAL_TOLERANCE,
  facilityLevels,
  defaultLevelId,
  roomLevel,
  entityLevel,
  buildingLevels,
  type Box,
  type ResolveWaypointOptions,
} from "./facility.js";

// room templates (EMBODIED R10)
export { compileFacility, checkRoomTemplate, parseRoomTemplate, rotateLocal, rotateSide, offsetSign, type CompileResult } from "./templates.js";
// GLB / glTF equipment models (EMBODIED §11, docs/ASSETS.md)
export {
  checkModelReference,
  encodeGlb,
  fitModel,
  GLB_DECODER_EXTENSIONS,
  GLB_RENDERER_EXTENSIONS,
  GlbError,
  modelScale,
  parseGlb,
  type AssetIssue,
  type GlbBounds,
  type GlbInfo,
  type ModelCheckOptions,
  type ModelFit,
} from "./glb.js";

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
  DisplayedVitals,
  MatchHit,
  MatchOptions,
  AssessmentReport,
  PatientSlot,
  WaypointLocation,
  VerifyResult,
} from "./types.js";
