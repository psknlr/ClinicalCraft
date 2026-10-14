/**
 * Referential integrity of a parsed case: every id referenced from
 * conditions, waypoints, results, figures, order matching and the reference
 * solution must exist; condition leaves must be able to become true;
 * objectives must be completable, decisions unlockable and answerable, and
 * phases enterable.
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
    // a scenario event may start monitoring a vital the baseline lacks (e.g. capnography attached)
    for (const event of c.physiology.events) {
      for (const [key, value] of Object.entries(event.setVitals ?? {})) if (typeof value === "number") vitals.add(key);
    }
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

function checkRef(c: CaseDefinition, ids: Ids, ref: ConditionRef): Issue[] {
  const missing = (label: string) => [err(ref.path, `unknown ${label} "${ref.id}"`)];
  switch (ref.kind) {
    case "history":
      return ids.history.has(ref.id) ? [] : missing("history item");
    case "exam":
      return ids.exam.has(ref.id) ? [] : missing("exam finding");
    case "decision":
      return ids.decisions.has(ref.id) ? [] : missing("decision");
    case "intervention": {
      if (!ids.interventions.has(ref.id)) return missing("intervention");
      const max = c.interventions.find((i) => i.id === ref.id)?.maxDoses;
      if (ref.minCount != null && max != null && ref.minCount > max) {
        return [err([...ref.path.slice(0, -1), "minCount"], `needs ${ref.minCount} doses but "${ref.id}" may be given at most ${max} time(s), so this can never become true`)];
      }
      return [];
    }
    case "phase":
      return ids.phases.has(ref.id) ? [] : missing("phase");
    case "objective":
      // self-references and cycles are judged by checkReachability (they are fine inside `any`/`not`)
      return ids.objectives.has(ref.id) ? [] : missing("objective");
    case "flag":
      return ids.flags.has(ref.id) ? [] : [warn(ref.path, `flag "${ref.id}" is never set by an intervention, scenario event or the solution`)];
    case "vital":
      if (!c.physiology) return [warn(ref.path, `vital condition on "${ref.id}" but the case has no physiology (baseline-only vitals), so it is always false`)];
      return ids.vitals.has(ref.id) ? [] : [warn(ref.path, `vital "${ref.id}" is not part of the physiology baseline`)];
    case "investigation":
      return checkInvestigationRef(c, ids, ref);
  }
}

function checkInvestigationRef(c: CaseDefinition, ids: Ids, ref: ConditionRef & { kind: "investigation" }): Issue[] {
  if (!ids.investigations.has(ref.id)) return [err(ref.path, `unknown investigation "${ref.id}"`)];
  const investigation = c.investigations.find((i) => i.id === ref.id);
  if (ref.phase == null) {
    if (ref.requiresRecord && investigation && Object.keys(investigation.results).length === 0) {
      return [err(ref.path, `"${ref.id}" has no result in any phase, so this can never become true`)];
    }
    return [];
  }
  const phasePath = [...ref.path.slice(0, -1), "phase"];
  if (!ids.phases.has(ref.phase)) return [err(phasePath, `unknown phase "${ref.phase}"`)];
  if (ref.requiresRecord && investigation && !Object.prototype.hasOwnProperty.call(investigation.results, ref.phase)) {
    return [err(phasePath, `"${ref.id}" has no result for phase "${ref.phase}", so this can never become true`)];
  }
  return [];
}

/** Every leaf of a condition with its path (document order). */
function leaves(cond: Condition, path: PathPart[], visit: (leaf: Condition, path: PathPart[]) => void): void {
  if ("all" in cond) cond.all.forEach((x, i) => leaves(x, [...path, "all", i], visit));
  else if ("any" in cond) cond.any.forEach((x, i) => leaves(x, [...path, "any", i], visit));
  else if ("not" in cond) leaves(cond.not, [...path, "not"], visit);
  else visit(cond, path);
}

/** `elapsed` / `hints` ranges with `gte > lte` can never hold. */
function checkRanges(cond: Condition, path: PathPart[]): Issue[] {
  const issues: Issue[] = [];
  leaves(cond, path, (leaf, at) => {
    const [key, range] = "elapsed" in leaf ? (["elapsed", leaf.elapsed] as const) : "hints" in leaf ? (["hints", leaf.hints] as const) : [null, null];
    if (!key) return;
    if (range.gte != null && range.lte != null && range.gte > range.lte) {
      issues.push(err([...at, key], `empty range (gte ${range.gte} > lte ${range.lte}), so this can never become true`));
    }
  });
  return issues;
}

function checkCondition(c: CaseDefinition, ids: Ids, cond: Condition | undefined, path: PathPart[]): Issue[] {
  if (!cond) return [];
  return [...conditionRefs(cond, path).flatMap((ref) => checkRef(c, ids, ref)), ...checkRanges(cond, path)];
}

function checkAllConditions(c: CaseDefinition, ids: Ids): Issue[] {
  const issues: Issue[] = [];
  c.phases.forEach((p, i) => issues.push(...checkCondition(c, ids, p.enterWhen, ["phases", i, "enterWhen"])));
  c.objectives.forEach((o, i) => {
    issues.push(...checkCondition(c, ids, o.completeWhen, ["objectives", i, "completeWhen"]));
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
    if (Object.keys(inv.results).length === 0) {
      issues.push(warn(["investigations", i, "results"], `investigation "${inv.id}" has no result in any phase, so its orders can never be read`));
    }
    inv.alternativeTo.forEach((id, j) => {
      const path = ["investigations", i, "alternativeTo", j];
      if (!ids.investigations.has(id)) issues.push(err(path, `unknown investigation "${id}"`));
      else if (id === inv.id) issues.push(warn(path, `investigation "${inv.id}" lists itself as an alternative`));
    });
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
      const unknownOptions = a.optionIds.flatMap((id, j) =>
        decision.options.some((o) => o.id === id) ? [] : [err([...path, "optionIds", j], `unknown option "${id}" of decision "${decision.id}"`)],
      );
      if (unknownOptions.length) return unknownOptions;
      if (decision.kind === "single" && new Set(a.optionIds).size !== 1) {
        return [err([...path, "optionIds"], `single-answer decision "${decision.id}" takes exactly one option`)];
      }
      return [];
    }
    default:
      return [];
  }
}

/**
 * Per-step solution checks. `parseCase` already validates each step's shape;
 * steps are re-parsed here so cases built in code (not via `parseCase`) still
 * get located issues instead of a crash.
 */
function checkSolution(c: CaseDefinition, ids: Ids): Issue[] {
  return c.solution.flatMap((raw: unknown, i) => {
    const parsed = ClinicalActionSchema.safeParse(raw);
    if (!parsed.success) {
      return issuesFromZodError(parsed.error, raw).map((issue) => ({ ...issue, path: formatPath(["solution", i, ...(issue.path ? issue.path.split(".") : [])]) }));
    }
    return checkSolutionAction(c, ids, parsed.data, ["solution", i]);
  });
}

/* ------------------------------------------------------------------ */
/* Reachability                                                        */
/* ------------------------------------------------------------------ */

/** Three-valued truth: `null` = could be either, depending on play. */
type Tri = boolean | null;

/** Kleene evaluation of a condition; `leaf` decides what is known about each leaf. */
function tri(cond: Condition, leaf: (node: Condition) => Tri): Tri {
  if ("all" in cond) {
    let out: Tri = true;
    for (const x of cond.all) {
      const v = tri(x, leaf);
      if (v === false) return false;
      if (v === null) out = null;
    }
    return out;
  }
  if ("any" in cond) {
    let out: Tri = false;
    for (const x of cond.any) {
      const v = tri(x, leaf);
      if (v === true) return true;
      if (v === null) out = null;
    }
    return out;
  }
  if ("not" in cond) {
    const v = tri(cond.not, leaf);
    return v === null ? null : !v;
  }
  if ("always" in cond) return cond.always;
  return leaf(cond);
}

/**
 * Which objectives can ever complete, which decisions can ever be unlocked
 * and which phases can ever be entered — the least fixed point of: a phase
 * is enterable when it is the initial phase, learner-switchable, or its
 * `enterWhen` can become true; a decision is unlockable / an objective
 * completable when its condition can become true, where `objective`,
 * `decided`/`attempted` and `phase` leaves naming items not (yet) shown
 * reachable are false and every other leaf could go either way. This
 * catches self-locks (`requires: {decided: self}`) and cycles (A needs B,
 * B needs A) without flagging reachable patterns such as
 * `any: [{objective: self}, …]` or `not: {objective: self}`. Unknown ids
 * are left undecided (they are reported elsewhere).
 */
function checkReachability(c: CaseDefinition, ids: Ids): Issue[] {
  const initial = c.initialPhase ?? c.phases[0]?.id;
  const phases = new Set(c.phases.filter((p) => p.id === initial || p.learnerSwitchable).map((p) => p.id));
  const objectives = new Set<string>();
  const decisions = new Set<string>();
  const leaf = (node: Condition): Tri => {
    if ("objective" in node) return ids.objectives.has(node.objective) && !objectives.has(node.objective) ? false : null;
    if ("decided" in node) return ids.decisions.has(node.decided) && !decisions.has(node.decided) ? false : null;
    if ("attempted" in node) return ids.decisions.has(node.attempted) && !decisions.has(node.attempted) ? false : null;
    if ("decidedFirstTry" in node) return ids.decisions.has(node.decidedFirstTry) && !decisions.has(node.decidedFirstTry) ? false : null;
    const unreachablePhase = (phase: string | undefined) => phase != null && ids.phases.has(phase) && !phases.has(phase);
    // orders are keyed by the phase they were placed in, so a phase-restricted leaf needs that phase to be enterable
    if ("ordered" in node || "read" in node || "resultReady" in node) return unreachablePhase(node.phase) ? false : null;
    if ("phase" in node) return unreachablePhase(node.phase) ? false : null;
    return null;
  };
  const grow = <T extends { id: string }>(items: T[], reached: Set<string>, cond: (item: T) => Condition | undefined): boolean => {
    let changed = false;
    for (const item of items) {
      const condition = cond(item);
      if (reached.has(item.id) || !condition || tri(condition, leaf) === false) continue;
      reached.add(item.id);
      changed = true;
    }
    return changed;
  };
  for (let changed = true; changed; ) {
    changed = grow(c.phases, phases, (p) => p.enterWhen);
    changed = grow(c.decisions, decisions, (d) => d.requires) || changed;
    changed = grow(c.objectives, objectives, (o) => o.completeWhen) || changed;
  }

  const issues: Issue[] = [];
  c.objectives.forEach((o, i) => {
    if (objectives.has(o.id)) return;
    const self = conditionRefs(o.completeWhen, ["objectives", i, "completeWhen"]).find((r) => r.kind === "objective" && r.id === o.id);
    issues.push(
      self
        ? err(self.path, `objective "${o.id}" depends on itself and can never complete`)
        : err(["objectives", i, "completeWhen"], `objective "${o.id}" can never complete: it depends on objectives, decisions or phases that can never be reached`),
    );
  });
  c.decisions.forEach((d, i) => {
    if (decisions.has(d.id)) return;
    issues.push(err(["decisions", i, "requires"], `decision "${d.id}" can never be unlocked: its requirements depend on itself or on objectives, decisions or phases that can never be reached`));
  });
  c.rubric.forEach((r, i) => {
    if (r.met && tri(r.met, leaf) === false) issues.push(warn(["rubric", i, "met"], `rubric item "${r.id}" can never be met, so it lowers every learner's score`));
  });
  c.physiology?.events.forEach((e, i) => {
    if (e.atMinute == null && e.when && tri(e.when, leaf) === false) {
      issues.push(warn(["physiology", "events", i, "when"], `scenario event "${e.id}" can never fire: its condition depends on objectives, decisions or phases that can never be reached`));
    }
  });
  c.phases.forEach((p, i) => {
    if (phases.has(p.id)) return;
    issues.push(
      warn(
        ["phases", i],
        p.enterWhen
          ? `phase "${p.id}" can never be entered: it is not learner-switchable and its enterWhen can never become true`
          : `phase "${p.id}" can never be entered: it is neither the initial phase, learner-switchable, nor has an enterWhen`,
      ),
    );
  });
  return issues;
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
    ...checkReachability(c, ids),
  ];
}
