/**
 * Scenario suites on disk: `packages/content/bench/<suite>/*.json` (one
 * scenario per file, validated with `parseScenario`), and the referential
 * check of a scenario against the loaded content (the case, the facility,
 * every case item and entity it names).
 */
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { conditionRefs, type CaseDefinition, type ClinicalAction, type Condition, type FacilityDefinition } from "@clinicalcraft/core";
import { builtinContentDir, chooseFacility, type LoadedContent } from "@clinicalcraft/agent/node";
import type { NavGoal } from "@clinicalcraft/world";
import { parseScenario, type BenchPredicate, type BenchScenario, type ReferenceStep } from "./schema.js";

/** The built-in suite. */
export const DEFAULT_SUITE = "embodied-v1";

/** `packages/content/bench` (null when the content package cannot be found). */
export function benchRoot(): string | null {
  const content = builtinContentDir();
  return content ? join(content, "bench") : null;
}

/** Suites (directories) under a bench root, sorted. */
export async function listSuites(root: string | null = benchRoot()): Promise<string[]> {
  if (!root) return [];
  try {
    return (await readdir(root, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

export interface SuiteFileIssue {
  file: string;
  issues: string[];
}

export interface LoadedSuite {
  suite: string;
  dir: string;
  /** Valid scenarios, in file-name order. */
  scenarios: BenchScenario[];
  /** Files that failed validation (invalid JSON, schema, wrong suite, duplicate id). */
  issues: SuiteFileIssue[];
}

/** Read and validate every scenario file of a suite. */
export async function loadSuite(suite: string, root: string | null = benchRoot()): Promise<LoadedSuite | null> {
  if (!root) return null;
  const dir = join(root, suite);
  let names: string[];
  try {
    names = (await readdir(dir, { withFileTypes: true }))
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"))
      .map((e) => e.name)
      .sort();
  } catch {
    return null;
  }
  const scenarios: BenchScenario[] = [];
  const issues: SuiteFileIssue[] = [];
  const ids = new Map<string, string>();
  for (const name of names) {
    const file = join(dir, name);
    let raw: unknown;
    try {
      raw = JSON.parse((await readFile(file, "utf8")).replace(/^﻿/, ""));
    } catch (err) {
      issues.push({ file, issues: [`invalid JSON: ${(err as Error).message}`] });
      continue;
    }
    const parsed = parseScenario(raw);
    if (!parsed.ok) {
      issues.push({ file, issues: parsed.issues });
      continue;
    }
    const s = parsed.scenario;
    const problems: string[] = [];
    if (s.suite !== suite) problems.push(`suite: "${s.suite}" differs from the directory "${suite}"`);
    if (basename(name, ".json") !== s.id) problems.push(`id: "${s.id}" differs from the file name "${name}"`);
    const dup = ids.get(s.id);
    if (dup) problems.push(`id: "${s.id}" is already used by ${dup}`);
    if (problems.length) {
      issues.push({ file, issues: problems });
      continue;
    }
    ids.set(s.id, name);
    scenarios.push(s);
  }
  return { suite, dir, scenarios, issues };
}

/* ------------------------------------------------------------------ */
/* Referential checks                                                  */
/* ------------------------------------------------------------------ */

function actionRefIssues(c: CaseDefinition, a: ClinicalAction, path: string): string[] {
  const out: string[] = [];
  const has = (list: readonly { id: string }[], id: string, what: string) => {
    if (!list.some((x) => x.id === id)) out.push(`${path}: unknown ${what} "${id}" in case ${c.id}`);
  };
  switch (a.type) {
    case "ask":
      has(c.history, a.itemId, "history item");
      break;
    case "examine":
      has(c.exam, a.findingId, "finding");
      break;
    case "order":
    case "read":
      has(c.investigations, a.investigationId, "investigation");
      break;
    case "intervene":
      has(c.interventions, a.interventionId, "intervention");
      break;
    case "answer":
      has(c.decisions, a.decisionId, "decision");
      break;
    case "set-phase":
      has(c.phases, a.phase, "phase");
      break;
    default:
      break;
  }
  return out;
}

function conditionIssues(c: CaseDefinition, cond: Condition, path: string): string[] {
  const out: string[] = [];
  for (const ref of conditionRefs(cond)) {
    const lists: Record<string, readonly { id: string }[]> = {
      history: c.history,
      exam: c.exam,
      investigation: c.investigations,
      decision: c.decisions,
      intervention: c.interventions,
      phase: c.phases,
      objective: c.objectives,
    };
    if (ref.kind === "procedure") continue;
    const list = lists[ref.kind];
    if (list && !list.some((x) => x.id === ref.id)) out.push(`${path}.${ref.path.join(".")}: unknown ${ref.kind} "${ref.id}" in case ${c.id}`);
  }
  return out;
}

/** Entity ids a facility certainly has (doors and levels are generated by the world; they are checked when the run starts). */
function knownEntity(f: FacilityDefinition, id: string): boolean | null {
  const [prefix, ...rest] = id.split(":");
  const name = rest.join(":");
  if (!name) return null;
  switch (prefix) {
    case "eq":
      return f.placements.some((p) => p.id === name);
    case "staff":
      return f.staff.some((s) => s.id === name);
    case "room":
      return f.rooms.some((r) => r.id === name);
    case "patient":
      return f.patientSlots.some((s) => s.id === name);
    default:
      return null;
  }
}

function goalEntities(goal: NavGoal | undefined): string[] {
  if (!goal) return [];
  if (goal.kind === "any") return goal.goals.flatMap(goalEntities);
  if (goal.kind === "point") return [];
  if (goal.kind === "room") return [goal.id.startsWith("room:") ? goal.id : `room:${goal.id}`];
  return [goal.id];
}

function stepEntities(step: ReferenceStep): string[] {
  switch (step.op) {
    case "navigate":
      return [...goalEntities(step.goal), ...(step.target ? [step.target] : [])];
    case "interact":
      return [step.target, ...goalEntities(step.goal)];
    case "inspect":
      return [step.target];
    case "answer":
      return step.entity ? [step.entity] : [];
    default:
      return [];
  }
}

function predicateEntities(p: BenchPredicate): string[] {
  if ("answerEquals" in p) return Array.isArray(p.answerEquals) ? p.answerEquals : [p.answerEquals];
  if (!("world" in p)) return [];
  const w = p.world;
  const actor = "actor" in w && w.actor ? [w.actor] : [];
  switch (w.kind) {
    case "actorInRoom":
      return [...actor, `room:${w.room.replace(/^room:/, "")}`];
    case "actorNear":
      return [...actor, w.target];
    case "entityState":
      return [w.target];
    case "deviceAtBedside":
      return w.target ? [w.target] : [];
    case "holding":
      return [...actor, w.item];
    default:
      return actor;
  }
}

/**
 * Referential problems of a scenario against loaded content: the case and
 * facility exist; every case item in conditions and clinical actions exists;
 * every prefixed entity id it names (eq:, staff:, room:, patient:) exists in
 * the facility. An empty list = consistent.
 */
export function scenarioRefIssues(s: BenchScenario, content: Pick<LoadedContent, "cases" | "facilities">): string[] {
  const entry = content.cases.get(s.caseId);
  if (!entry) return [`caseId: unknown case "${s.caseId}"`];
  const c = entry.def;
  if (s.facilityId && !content.facilities.has(s.facilityId)) return [`facilityId: unknown facility "${s.facilityId}"`];
  const facility = chooseFacility(content, c, s.facilityId, null);
  if (!facility) return ["facilityId: no facility available for this case"];
  const out: string[] = [];
  s.predicates.forEach((p, i) => {
    if ("clinical" in p) out.push(...conditionIssues(c, p.clinical, `predicates.${i}.clinical`));
  });
  (s.setup.clinical ?? []).forEach((a, i) => out.push(...actionRefIssues(c, a, `setup.clinical.${i}`)));
  s.reference.steps.forEach((step, i) => {
    if (step.op === "clinical" || step.op === "attempt") out.push(...actionRefIssues(c, step.action, `reference.steps.${i}.action`));
  });
  const entities = new Set<string>([
    ...(s.setup.unavailable ?? []),
    ...(s.setup.actions ?? []).flatMap((a) => [a.actor, ...(a.target ? [a.target] : []), ...goalEntities(a.goal)]),
    ...goalEntities(s.setup.actor?.at),
    ...s.predicates.flatMap(predicateEntities),
    ...s.reference.steps.flatMap(stepEntities),
  ]);
  for (const id of entities) {
    if (id.startsWith("actor:")) {
      if (id !== "actor:clinician") out.push(`entity "${id}": the only actor body is actor:clinician`);
      continue;
    }
    if (knownEntity(facility, id) === false) out.push(`entity "${id}" does not exist in facility ${facility.id}`);
  }
  return out;
}
