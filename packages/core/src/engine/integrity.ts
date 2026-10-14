/**
 * Referential integrity of a parsed case: every id referenced from
 * conditions, waypoints, results, figures, order matching and the reference
 * solution must exist; decisions must be answerable.
 */
import type { CaseDefinition } from "../schema/case.js";
import type { Condition } from "../schema/common.js";
import { ClinicalActionSchema, type ClinicalAction } from "../schema/session.js";
import { conditionRefs, type ConditionRef } from "./conditions.js";
import { compileCaseRegex } from "./matcher.js";
import { formatPath, issuesFromZodError } from "./parse.js";
import type { Issue } from "./types.js";

type PathPart = string | number;

interface Ids {
  phases: Set<string>;
  history: Set<string>;
  exam: Set<string>;
  investigations: Set<string>;
  interventions: Set<string>;
  objectives: Set<string>;
  decisions: Set<string>;
  assets: Set<string>;
  /** Flags that something in the case can set. */
  flags: Set<string>;
  vitals: Set<string>;
}

const err = (path: readonly PathPart[], message: string): Issue => ({ path: formatPath(path), message, severity: "error" });
const warn = (path: readonly PathPart[], message: string): Issue => ({ path: formatPath(path), message, severity: "warning" });

function collectIds(c: CaseDefinition): Ids {
  const flags = new Set<string>();
  c.interventions.forEach((i) => i.setFlags.forEach((f) => flags.add(f)));
  c.physiology?.events.forEach((e) => e.setFlags.forEach((f) => flags.add(f)));
  c.solution.forEach((a) => {
    if (a.type === "flag" && typeof a.flag === "string") flags.add(a.flag);
  });
  const vitals = new Set<string>();
  if (c.physiology) {
    for (const [key, value] of Object.entries(c.physiology.baseline)) if (typeof value === "number") vitals.add(key);
  }
  return {
    phases: new Set(c.phases.map((p) => p.id)),
    history: new Set(c.history.map((h) => h.id)),
    exam: new Set(c.exam.map((e) => e.id)),
    investigations: new Set(c.investigations.map((i) => i.id)),
    interventions: new Set(c.interventions.map((i) => i.id)),
    objectives: new Set(c.objectives.map((o) => o.id)),
    decisions: new Set(c.decisions.map((d) => d.id)),
    assets: new Set(c.assets.map((a) => a.id)),
    flags,
    vitals,
  };
}

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

function duplicates(items: { id: string }[], path: PathPart[], label: string): Issue[] {
  const seen = new Set<string>();
  const issues: Issue[] = [];
  items.forEach((item, i) => {
    if (seen.has(item.id)) issues.push(err([...path, i, "id"], `duplicate ${label} id "${item.id}"`));
    seen.add(item.id);
  });
  return issues;
}

function checkCollections(c: CaseDefinition): Issue[] {
  const issues: Issue[] = [
    ...duplicates(c.phases, ["phases"], "phase"),
    ...duplicates(c.history, ["history"], "history item"),
    ...duplicates(c.exam, ["exam"], "exam finding"),
    ...duplicates(c.investigations, ["investigations"], "investigation"),
    ...duplicates(c.interventions, ["interventions"], "intervention"),
    ...duplicates(c.objectives, ["objectives"], "objective"),
    ...duplicates(c.decisions, ["decisions"], "decision"),
    ...duplicates(c.rubric, ["rubric"], "rubric item"),
    ...duplicates(c.assets, ["assets"], "asset"),
    ...duplicates(c.physiology?.trends ?? [], ["physiology", "trends"], "trend"),
    ...duplicates(c.physiology?.events ?? [], ["physiology", "events"], "scenario event"),
  ];
  c.decisions.forEach((d, i) => issues.push(...duplicates(d.options, ["decisions", i, "options"], "option")));
  if (c.initialPhase != null && !c.phases.some((p) => p.id === c.initialPhase)) {
    issues.push(err(["initialPhase"], `initial phase "${c.initialPhase}" is not declared in phases`));
  }
  if (c.objectives.length === 0) issues.push(err(["objectives"], "a case needs at least one objective"));
  return issues;
}

/* ------------------------------------------------------------------ */
/* Conditions                                                          */
/* ------------------------------------------------------------------ */

function checkRef(c: CaseDefinition, ids: Ids, ref: ConditionRef, owner: { objectiveId?: string }): Issue[] {
  const missing = (label: string) => [err(ref.path, `unknown ${label} "${ref.id}"`)];
  switch (ref.kind) {
    case "history":
      return ids.history.has(ref.id) ? [] : missing("history item");
    case "exam":
      return ids.exam.has(ref.id) ? [] : missing("exam finding");
    case "decision":
      return ids.decisions.has(ref.id) ? [] : missing("decision");
    case "intervention":
      return ids.interventions.has(ref.id) ? [] : missing("intervention");
    case "phase":
      return ids.phases.has(ref.id) ? [] : missing("phase");
    case "objective":
      if (!ids.objectives.has(ref.id)) return missing("objective");
      return ref.id === owner.objectiveId ? [err(ref.path, `objective "${ref.id}" depends on itself and can never complete`)] : [];
    case "flag":
      return ids.flags.has(ref.id) ? [] : [warn(ref.path, `flag "${ref.id}" is never set by an intervention, scenario event or the solution`)];
    case "vital":
      if (!c.physiology) return [warn(ref.path, `vital condition on "${ref.id}" but the case has no physiology (baseline-only vitals)`)];
      return ids.vitals.has(ref.id) ? [] : [warn(ref.path, `vital "${ref.id}" is not part of the physiology baseline`)];
    case "investigation":
      return checkInvestigationRef(c, ids, ref);
  }
}

function checkInvestigationRef(c: CaseDefinition, ids: Ids, ref: ConditionRef & { kind: "investigation" }): Issue[] {
  if (!ids.investigations.has(ref.id)) return [err(ref.path, `unknown investigation "${ref.id}"`)];
  if (ref.phase == null) return [];
  const phasePath = [...ref.path.slice(0, -1), "phase"];
  if (!ids.phases.has(ref.phase)) return [err(phasePath, `unknown phase "${ref.phase}"`)];
  const investigation = c.investigations.find((i) => i.id === ref.id);
  if (ref.requiresRecord && investigation && !Object.prototype.hasOwnProperty.call(investigation.results, ref.phase)) {
    return [err(phasePath, `"${ref.id}" has no result for phase "${ref.phase}", so this can never become true`)];
  }
  return [];
}

function checkCondition(c: CaseDefinition, ids: Ids, cond: Condition | undefined, path: PathPart[], owner: { objectiveId?: string } = {}): Issue[] {
  if (!cond) return [];
  return conditionRefs(cond, path).flatMap((ref) => checkRef(c, ids, ref, owner));
}

function checkAllConditions(c: CaseDefinition, ids: Ids): Issue[] {
  const issues: Issue[] = [];
  c.phases.forEach((p, i) => issues.push(...checkCondition(c, ids, p.enterWhen, ["phases", i, "enterWhen"])));
  c.objectives.forEach((o, i) => {
    issues.push(...checkCondition(c, ids, o.completeWhen, ["objectives", i, "completeWhen"], { objectiveId: o.id }));
    o.waypoints.forEach((w, j) => issues.push(...checkCondition(c, ids, w.unless, ["objectives", i, "waypoints", j, "unless"])));
  });
  c.decisions.forEach((d, i) => issues.push(...checkCondition(c, ids, d.requires, ["decisions", i, "requires"])));
  c.interventions.forEach((iv, i) => {
    issues.push(...checkCondition(c, ids, iv.indicatedWhen, ["interventions", i, "indicatedWhen"]));
    issues.push(...checkCondition(c, ids, iv.contraindicatedWhen, ["interventions", i, "contraindicatedWhen"]));
  });
  c.physiology?.trends.forEach((tr, i) => issues.push(...checkCondition(c, ids, tr.until, ["physiology", "trends", i, "until"])));
  c.physiology?.events.forEach((ev, i) => issues.push(...checkCondition(c, ids, ev.when, ["physiology", "events", i, "when"])));
  c.rubric.forEach((r, i) => issues.push(...checkCondition(c, ids, r.met, ["rubric", i, "met"])));
  return issues;
}

/* ------------------------------------------------------------------ */
/* Content cross-references                                            */
/* ------------------------------------------------------------------ */

function checkPhaseLists(ids: Ids, lists: { phases?: string[] }[], collection: string): Issue[] {
  const issues: Issue[] = [];
  lists.forEach((item, i) =>
    (item.phases ?? []).forEach((p, j) => {
      if (!ids.phases.has(p)) issues.push(err([collection, i, "phases", j], `unknown phase "${p}"`));
    }),
  );
  return issues;
}

function checkInvestigations(c: CaseDefinition, ids: Ids): Issue[] {
  const issues: Issue[] = [];
  c.investigations.forEach((inv, i) => {
    for (const [phase, result] of Object.entries(inv.results)) {
      if (!ids.phases.has(phase)) issues.push(err(["investigations", i, "results", phase], `result phase "${phase}" is not a declared phase`));
      result.figures.forEach((fig, j) => {
        if (!ids.assets.has(fig)) issues.push(err(["investigations", i, "results", phase, "figures", j], `unknown asset "${fig}"`));
      });
    }
  });
  c.exam.forEach((e, i) => {
    if (e.media != null && !ids.assets.has(e.media)) issues.push(err(["exam", i, "media"], `unknown asset "${e.media}"`));
  });
  c.npcs.forEach((npc, i) =>
    npc.interprets.forEach((id, j) => {
      if (!ids.investigations.has(id)) issues.push(err(["npcs", i, "interprets", j], `unknown investigation "${id}"`));
    }),
  );
  return issues;
}

function checkRegex(source: string | undefined, path: PathPart[]): Issue[] {
  if (source == null || compileCaseRegex(source)) return [];
  return [err(path, `invalid regular expression ${JSON.stringify(source)}`)];
}

function checkOrderMatching(c: CaseDefinition, ids: Ids): Issue[] {
  const issues: Issue[] = [];
  const known = (id: string, path: PathPart[]) => {
    if (!ids.investigations.has(id)) issues.push(err(path, `unknown investigation "${id}"`));
  };
  c.orderMatching.rules.forEach((rule, i) => {
    const base = ["orderMatching", "rules", i];
    if (rule.ifHas != null) known(rule.ifHas, [...base, "ifHas"]);
    if (rule.unlessHas != null) known(rule.unlessHas, [...base, "unlessHas"]);
    rule.add.forEach((id, j) => known(id, [...base, "add", j]));
    rule.remove.forEach((id, j) => known(id, [...base, "remove", j]));
    issues.push(...checkRegex(rule.ifMatches, [...base, "ifMatches"]), ...checkRegex(rule.unlessMatches, [...base, "unlessMatches"]));
  });
  for (const [key, list] of Object.entries(c.orderMatching.exact)) {
    list.forEach((id, j) => known(id, ["orderMatching", "exact", key, j]));
  }
  c.orderMatching.warnings.forEach((w, i) => {
    known(w.investigation, ["orderMatching", "warnings", i, "investigation"]);
    issues.push(...checkRegex(w.ifMatches, ["orderMatching", "warnings", i, "ifMatches"]));
  });
  return issues;
}

function checkDecisions(c: CaseDefinition): Issue[] {
  const issues: Issue[] = [];
  c.decisions.forEach((d, i) => {
    const correct = d.options.filter((o) => o.correct).length;
    if (correct === 0) issues.push(err(["decisions", i, "options"], `decision "${d.id}" has no correct option`));
    else if (d.kind === "single" && correct !== 1) issues.push(err(["decisions", i, "options"], `single-answer decision "${d.id}" has ${correct} correct options`));
  });
  return issues;
}

function checkPhysiology(c: CaseDefinition, ids: Ids): Issue[] {
  const issues: Issue[] = [];
  const physiology = c.physiology;
  if (!physiology) return issues;
  physiology.trends.forEach((tr, i) => {
    if (!ids.vitals.has(tr.vital)) issues.push(warn(["physiology", "trends", i, "vital"], `trend on "${tr.vital}", which the baseline does not define (ignored)`));
  });
  physiology.events.forEach((ev, i) => {
    if (ev.atMinute == null && ev.when == null) issues.push(warn(["physiology", "events", i], `scenario event "${ev.id}" has neither atMinute nor when and never fires`));
  });
  c.interventions.forEach((iv, i) =>
    iv.effects.forEach((e, j) => {
      if (!ids.vitals.has(e.vital)) issues.push(warn(["interventions", i, "effects", j, "vital"], `effect on "${e.vital}", which the baseline does not define (ignored)`));
    }),
  );
  return issues;
}

/* ------------------------------------------------------------------ */
/* Solution                                                            */
/* ------------------------------------------------------------------ */

function checkSolutionAction(c: CaseDefinition, ids: Ids, a: ClinicalAction, path: PathPart[]): Issue[] {
  const unknown = (field: string, label: string, id: string) => [err([...path, field], `unknown ${label} "${id}"`)];
  switch (a.type) {
    case "ask":
      return ids.history.has(a.itemId) ? [] : unknown("itemId", "history item", a.itemId);
    case "examine":
      return ids.exam.has(a.findingId) ? [] : unknown("findingId", "exam finding", a.findingId);
    case "order":
      return ids.investigations.has(a.investigationId) ? [] : unknown("investigationId", "investigation", a.investigationId);
    case "read": {
      const issues = ids.investigations.has(a.investigationId) ? [] : unknown("investigationId", "investigation", a.investigationId);
      if (a.phase != null && !ids.phases.has(a.phase)) issues.push(...unknown("phase", "phase", a.phase));
      return issues;
    }
    case "set-phase":
      return ids.phases.has(a.phase) ? [] : unknown("phase", "phase", a.phase);
    case "intervene":
      return ids.interventions.has(a.interventionId) ? [] : unknown("interventionId", "intervention", a.interventionId);
    case "answer": {
      const decision = c.decisions.find((d) => d.id === a.decisionId);
      if (!decision) return unknown("decisionId", "decision", a.decisionId);
      return a.optionIds.flatMap((id, j) =>
        decision.options.some((o) => o.id === id) ? [] : [err([...path, "optionIds", j], `unknown option "${id}" of decision "${decision.id}"`)],
      );
    }
    default:
      return [];
  }
}

function checkSolution(c: CaseDefinition, ids: Ids): Issue[] {
  return c.solution.flatMap((raw, i) => {
    const parsed = ClinicalActionSchema.safeParse(raw);
    if (!parsed.success) {
      return issuesFromZodError(parsed.error, raw).map((issue) => ({ ...issue, path: formatPath(["solution", i, ...(issue.path ? issue.path.split(".") : [])]) }));
    }
    return checkSolutionAction(c, ids, parsed.data, ["solution", i]);
  });
}

/**
 * Referential integrity of every id in a parsed case. Errors make the case
 * unplayable or unwinnable; warnings flag likely authoring mistakes.
 * Paths are dot-joined (`objectives.2.completeWhen.all.0.read`).
 */
export function checkCaseIntegrity(c: CaseDefinition): Issue[] {
  const ids = collectIds(c);
  return [
    ...checkCollections(c),
    ...checkAllConditions(c, ids),
    ...checkPhaseLists(ids, c.history, "history"),
    ...checkPhaseLists(ids, c.exam, "exam"),
    ...checkInvestigations(c, ids),
    ...checkOrderMatching(c, ids),
    ...checkDecisions(c),
    ...checkPhysiology(c, ids),
    ...checkSolution(c, ids),
  ];
}
