/**
 * The team benchmark (docs/TEAM.md §7): every team scenario of a case, run headless in observer mode — the case
 * replayed (its reference solution) up to the moment the scenario is about (the team's phase; the count due, for a
 * count scenario), the surgeon's body at the table, the simulated surgeon answering — then the team alone, through
 * the same `team` op the browser uses, until what was set in motion has ended. What happened is read from the
 * session's own record (team checkpoint, world), never from the team's say-so, and scored against the scenario's
 * authored `expect` (hidden from the team).
 *
 * Metrics: delivered (each need ends with the person holding the item) and verified (the circulating nurse saw it);
 * escalated with a reason when it could not be done; the count's outcome; detection latency (rounds from the count
 * falling due to the hold asked for); false holds (a hold when every item was there); inappropriate progression
 * (closure begun on a hold); exactly once (no action id carried out twice; no more hand-overs than needs).
 *
 * A site scenario (`expect.site`, docs/TEAM.md §4.5) is run where it happens — when the site's verification falls
 * due, before the Sign In — and read from the case's site record and its holds: who detected the discrepancy, who
 * called the pause, who verified which evidence, what was put right, who confirmed, who released the pause and on
 * what; a pause where the mark agreed with the plan (false pause), and a release — or the held step given — before
 * the site was verified and confirmed (unjustified resume), fail the run.
 */
import type { CaseDefinition, ClinicalAction, CountRecord, SiteLedger, SiteStatus } from "@clinicalcraft/core";
import { countStatus, evaluate, siteLedger } from "@clinicalcraft/core";
import { createSession, mergeSettings, type ClinicalSession, type TeamCheckpoint } from "@clinicalcraft/agent";
import { catalogsFor, chooseFacility, type LoadedContent } from "@clinicalcraft/agent/node";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { benchClock, benchIds } from "../session.js";

/**
 * One thing a scenario obliges the team to bring about (docs/TEAM.md §7), enumerated by id when the scenario starts:
 * a need (an item for someone) or the count. What happened is read from the session's record: who it was for, the
 * physical outcome (they hold the item; the count record's status), whether the team verified it, and an escalation
 * with its reason. `met` — done and verified; `escalated` — raised with a reason (appropriate when the scenario
 * expects it); `unfinished` — still under way when the run stopped; `failed` — ended otherwise.
 */
export interface TeamObligation {
  id: string;
  kind: "deliver" | "count" | "site";
  /** Who it is for (a member's body id; the count: the surgeon). */
  recipient: string;
  /** Equipment type. */
  item: string;
  status: "met" | "escalated" | "unfinished" | "failed";
  /** The physical outcome holds: the recipient holds an item of the type (its own); the count is settled in the record. */
  physical: boolean;
  /** The team checked it with its own eyes (the circulating nurse saw the item in hand; the count reconciled). */
  verified: boolean;
  /** An escalation with a reason, and whether the scenario expected one. */
  escalation?: { reason: string; appropriate: boolean };
}

export interface TeamRunResult {
  caseId: string;
  scenario: string;
  /** What the scenario expects (authored). */
  expect: { delivered?: boolean; count?: "correct" | "reconciled" | "unresolved"; site?: "confirmed" | "corrected" | "unresolved" };
  needs: number;
  delivered: number;
  verified: number;
  escalated: number;
  /** Every escalation gave a reason. */
  reasoned: boolean;
  handOvers: number;
  /** No action id carried out twice, and no more hand-overs than needs. */
  exactlyOnce: boolean;
  count?: { outcome: string | null; baseline: number; holds: number; detectionLatency: number | null; falseHold: boolean; inappropriateProgression: boolean };
  /** The operative site's verification, from the case's site record and its holds (a scenario with `expect.site`). */
  site?: TeamSiteResult;
  rounds: number;
  messages: number;
  acts: number;
  /** Simulated seconds the team's acts took (walking, searching, handing over). */
  seconds: number;
  /** Every obligation of the scenario, by id, as it ended (`unfinished` ones when the run stopped). */
  obligations: TeamObligation[];
  /**
   * The scenario's own state: `activated` — set up in the world and its work begun (never true for a run whose
   * required work did not start); `completed` — every obligation met or appropriately escalated; `invalid` — assigned
   * and never activated, so nothing about the team can be concluded from it.
   */
  activated: boolean;
  completed: boolean;
  invalid: boolean;
  pass: boolean;
  /** Why it did not pass (empty when it did). */
  failures: string[];
}

/**
 * What happened about the operative site (docs/TEAM.md §4.5), as the record has it — people as the record names them
 * (a staff id; `surgeon`), times in simulated minutes of the encounter.
 */
export interface TeamSiteResult {
  outcome: SiteStatus;
  /** Who raised the discrepancy, between what (as they had read it). */
  detected: { by: string; at: number; between: string } | null;
  /** Who called the pause (the hold on the step the site names), and why. */
  pause: { by: string; at: number; reason: string } | null;
  /** Who read which primary evidence after the discrepancy, and what it said. */
  verified: { source: string; says: string | null; by: string }[];
  /** What was put right: the site marked, a document corrected — and by whom. */
  corrections: { what: string; by: string }[];
  confirmed: { by: string; side: string } | null;
  /** Who released the pause, and the reassessment recorded with it: what justified resuming. */
  resumed: { by: string; at: number; justification: string } | null;
  escalated: { by: string; reason: string } | null;
  /** Rounds from the verification falling due to the discrepancy raised; simulated seconds from the discrepancy to the pause, and from the pause to its release. */
  detectionLatency: number | null;
  secondsToPause: number | null;
  secondsHeld: number | null;
  /** A pause where the mark agreed with the plan. */
  falsePause: boolean;
  /** The pause released, or the held step given, before the site was verified and confirmed. */
  unjustifiedResume: boolean;
}

export interface TeamReport {
  format: "clinicalcraft-team-report@2";
  runs: TeamRunResult[];
  passed: number;
  total: number;
  /**
   * The denominators, apart: scenarios assigned, activated (set up and begun), completed (every obligation met or
   * appropriately escalated), appropriately escalated (at least one obligation escalated as expected), invalid
   * (assigned, never activated); and obligations in all, and unfinished when their runs stopped.
   */
  counts: { assigned: number; activated: number; completed: number; escalated: number; invalid: number; obligations: number; unfinished: number };
}

/** The cases of the content that have team scenarios (optionally only `caseIds`). */
export function teamCases(content: Pick<LoadedContent, "cases">, caseIds?: readonly string[]): CaseDefinition[] {
  return [...content.cases.values()].map((e) => e.def).filter((c) => !!c.team?.scenarios.length && (!caseIds?.length || caseIds.includes(c.id)));
}

/**
 * The reference solution, replayed step by step: `until(ready)` carries on from where it stopped until `ready` holds
 * (or the solution ends before an `operate close`).
 */
function replay(session: ClinicalSession, c: CaseDefinition): { until(ready: () => boolean): void } {
  const steps = c.solution.slice(1);
  let next = 0;
  return {
    until(ready) {
      for (; next < steps.length; next++) {
        if (ready()) return;
        const a = steps[next]!;
        if (a.type === "finish" || (a.type === "operate" && (a as { op?: { op?: string } }).op?.op === "close")) return;
        const r = session.dispatch({ ...a, by: "system" } as ClinicalAction);
        if (r.rejected) throw new Error(`${c.id}: the reference solution was refused at ${a.type}: ${r.rejected.message}`);
      }
    },
  };
}

/** Run one team scenario of a case. */
export async function runTeamScenario(content: LoadedContent, c: CaseDefinition, scenarioId: string, opts: { locale?: string; maxRounds?: number } = {}): Promise<TeamRunResult> {
  const team = c.team!;
  const scenario = team.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) throw new Error(`${c.id}: no team scenario "${scenarioId}"`);
  const facility = chooseFacility(content, c, undefined, null);
  if (!facility) throw new Error(`${c.id}: no facility for the team`);
  const settings = mergeSettings([{ source: "flag", settings: { provider: "offline", locale: opts.locale ?? "en", embodiment: "embodied", approvalMode: "bypass", transcripts: { enabled: false }, autoCompact: { enabled: false, thresholdTokens: 120_000 } } }]);
  const session = await createSession({ caseDef: c, facility, catalogs: catalogsFor(content, facility), settings, newId: benchIds("t"), now: benchClock(), retry: false });
  try {
    await session.run({ type: "clinical_action", action: { type: "start", team: scenario.id } });
    const forCount = scenario.expect?.count !== undefined && !!team.count;
    const forSite = scenario.expect?.site !== undefined && !!team.site;
    const path = replay(session, c);
    // observer mode: the team waits for the op; the surgeon's body at the table, the simulated surgeon answering
    let walk = 0;
    const observe = async () => {
      await session.run({ type: "team", action: "pause" });
      await session.run({ type: "team", action: "surgeon", surgeon: "simulated" });
      const patient = session.world()!.find(PRIMARY_ACTOR, { kind: "patient", limit: 1 })[0]?.id;
      if (patient) await session.run({ type: "world_action", request: { actionId: `bench-to-table-${++walk}`, actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: patient } } });
    };
    if (forSite) {
      // the site's verification, where it happens: when it falls due, before the Sign In
      const due = () => evaluate(c, session.state, team.site!.when);
      path.until(due);
      if (!due()) throw new Error(`${c.id}: the reference solution never reaches the site's verification`);
      await observe();
      await session.run({ type: "team", action: "run", rounds: opts.maxRounds ?? 120 });
    }
    // the team's phases — for a site scenario only when it is about them too: a site that is not settled holds the
    // step the reference path needs next
    if (!forSite || forCount || (scenario.needs?.length ?? 0) > 0) {
      path.until(() => team.phases.includes(session.state.phase) && (!forCount || evaluate(c, session.state, team.count!.when)));
      if (!team.phases.includes(session.state.phase)) throw new Error(`${c.id}: the reference solution never reaches the team's phases (${team.phases.join(", ")})`);
      await observe();
      await session.run({ type: "team", action: "run", rounds: opts.maxRounds ?? 120 });
    }
    const w = session.world()!;
    return score(c, scenario.id, scenario.expect ?? {}, session.snapshot().team!, { record: session.state.count, holding: (actor) => w.actor(actor)?.holding ?? [], ...(team.site ? { site: siteLedger(c, session.state) } : {}) });
  } finally {
    await session.close();
  }
}

/** What the scorer reads beyond the team's checkpoint: the case's count record, what bodies hold now, and the site's story. */
export interface ScoreContext {
  record?: CountRecord;
  holding?: (actorId: string) => readonly string[];
  /** The operative site's verification as the case record has it (`siteLedger`). */
  site?: SiteLedger;
}

const memberBody = (ref: string) => (ref === "surgeon" ? PRIMARY_ACTOR : `staff:${ref}`);

/**
 * The scenario's obligations, by id (see `TeamObligation`): every need (the scenario's and those asked for in the
 * session) — met when its supply task was verified and the person holds that item, an item no other need was
 * credited with; the count, when the scenario expects an outcome — read from the case's count record; and the
 * operative site, when the scenario expects an outcome — read from the case's site record (`ctx.site`): met when the
 * site was confirmed as expected (after a discrepancy: verified, and the pause released on it), escalated when it
 * was raised beyond the room.
 */
export function obligations(c: CaseDefinition, scenarioId: string, expect: TeamRunResult["expect"], cp: TeamCheckpoint, ctx: ScoreContext = {}): TeamObligation[] {
  const st = cp.state;
  const scenario = c.team?.scenarios.find((x) => x.id === scenarioId);
  const needs = [...(scenario?.needs ?? []), ...st.extra];
  const credited = new Set<string>();
  const out: TeamObligation[] = [];
  for (const need of needs) {
    const recipient = memberBody(need.for);
    const supply = st.tasks.find((x) => x.kind === "supply" && x.need === need.id);
    const item = supply?.itemId;
    const duplicate = !!item && credited.has(item);
    const physical = !!item && !duplicate && (ctx.holding ? ctx.holding(recipient).includes(item) : supply?.verified === true);
    let status: TeamObligation["status"] = "unfinished";
    let escalation: TeamObligation["escalation"];
    if (supply?.status === "done") status = supply.verified && physical ? "met" : "failed";
    else if (supply?.status === "escalated") {
      status = "escalated";
      escalation = { reason: supply.reasonText?.en ?? supply.reason ?? "", appropriate: expect.delivered === false };
    } else if (supply?.status === "declined") status = "failed";
    if (status === "met" && item) credited.add(item);
    out.push({ id: `need:${need.id}`, kind: "deliver", recipient, item: need.item, status, physical, verified: supply?.verified === true && !duplicate, ...(escalation ? { escalation } : {}) });
  }
  const count = c.team?.count;
  const ledger = st.count;
  if (count && expect.count !== undefined) {
    const status = ctx.record ? countStatus(ctx.record) : null;
    const outcome = status === "correct" || status === "reconciled" ? status : status === "unresolved" || status === "excluded" ? "unresolved" : (ledger?.outcome ?? null);
    const escalated = ctx.record ? ctx.record.entries.some((e) => e.op === "escalate") : ledger?.outcome === "unresolved";
    const physical = status !== null ? status === "correct" || status === "reconciled" || status === "excluded" : ledger?.outcome === "correct" || ledger?.outcome === "reconciled";
    const settled = ledger?.settledRound !== undefined || (status !== null && status !== "baseline" && status !== "discrepancy");
    const result: TeamObligation["status"] = !settled ? "unfinished" : outcome === "correct" || outcome === "reconciled" ? "met" : escalated ? "escalated" : "failed";
    const reason = st.messages.findLast((m) => m.kind === "escalate" && m.about.count !== undefined)?.text.en;
    out.push({
      id: "count",
      kind: "count",
      recipient: PRIMARY_ACTOR,
      item: count.item,
      status: result,
      physical,
      verified: result === "met",
      ...(result === "escalated" ? { escalation: { reason: reason ?? "", appropriate: expect.count === "unresolved" } } : {}),
    });
  }
  if (c.team?.site && expect.site !== undefined) {
    const l = ctx.site;
    const status = l?.status ?? "none";
    const confirmed = status === "confirmed" || status === "corrected";
    // confirmed as expected — after a discrepancy, with the pause released on it and nothing resumed too early
    const sound = status === expect.site && (status !== "corrected" || (!!l?.pause && !!l.resumed && !l.unjustified));
    const result: TeamObligation["status"] = status === "unresolved" ? "escalated" : !confirmed ? "unfinished" : sound ? "met" : "failed";
    out.push({
      id: "site",
      kind: "site",
      recipient: PRIMARY_ACTOR,
      item: "",
      status: result,
      physical: confirmed,
      verified: confirmed && !!l?.confirmed,
      ...(result === "escalated" ? { escalation: { reason: l?.escalated?.reason ?? "", appropriate: expect.site === "unresolved" } } : {}),
    });
  }
  return out;
}

/** The site's story for the report (see `TeamSiteResult`). */
function siteResult(expect: TeamRunResult["expect"], cp: TeamCheckpoint, l: SiteLedger): TeamSiteResult {
  const timing = cp.state.site;
  const seconds = (from: number | undefined, to: number | undefined) => (from === undefined || to === undefined ? null : Math.round((to - from) * 60));
  return {
    outcome: l.status,
    detected: l.detected ? { by: l.detected.by, at: l.detected.at, between: l.detected.sources.map((s, i) => `${s}: ${l.detected!.values[i] ?? "not marked"}`).join(" / ") } : null,
    pause: l.pause,
    verified: l.verified.map((v) => ({ source: v.source, says: v.value, by: v.by })),
    corrections: l.corrections.map((x) => ({ what: x.what === "mark" ? `mark → ${x.side}` : `${x.source} → ${x.to}`, by: x.by })),
    confirmed: l.confirmed ? { by: l.confirmed.by, side: l.confirmed.side } : null,
    resumed: l.resumed,
    escalated: l.escalated ? { by: l.escalated.by, reason: l.escalated.reason } : null,
    detectionLatency: timing?.detectedRound !== undefined && timing.dueRound !== undefined ? timing.detectedRound - timing.dueRound : null,
    secondsToPause: seconds(l.detected?.at, l.pause?.at),
    secondsHeld: seconds(l.pause?.at, l.resumed?.at),
    falsePause: !!l.pause && expect.site === "confirmed",
    unjustifiedResume: l.unjustified,
  };
}

/** Score a run from the session's own record (the team's checkpoint; with `ctx`, the count record and the world). */
export function score(c: CaseDefinition, scenario: string, expect: TeamRunResult["expect"], cp: TeamCheckpoint, ctx: ScoreContext = {}): TeamRunResult {
  const st = cp.state;
  const supplies = st.tasks.filter((t) => t.kind === "supply");
  const done = supplies.filter((t) => t.status === "done");
  const escalations = st.messages.filter((m) => m.kind === "escalate");
  const handOvers = st.receipts.filter((r) => r.operation === "hand_over" && r.outcome === "completed").length;
  const ids = st.receipts.filter((r) => r.outcome === "completed").map((r) => r.id);
  const exactlyOnce = new Set(ids).size === ids.length && handOvers <= Math.max(st.posted.length, supplies.length);
  const ledger = st.count;
  const unsafe = (ctx.record?.unsafe.length ?? 0) > 0;
  const count = ledger
    ? {
        outcome: ledger.outcome ?? null,
        baseline: ledger.baseline,
        holds: ledger.holds,
        detectionLatency: ledger.detectedRound !== undefined && ledger.dueRound !== undefined ? ledger.detectedRound - ledger.dueRound : null,
        falseHold: ledger.holds > 0 && expect.count === "correct",
        inappropriateProgression: !!ledger.closedOnHold || unsafe,
      }
    : undefined;
  const owed = obligations(c, scenario, expect, cp, ctx);
  const site = ctx.site && expect.site !== undefined ? siteResult(expect, cp, ctx.site) : undefined;
  // activated: set up in the world and its work begun (a need noticed, or the count fallen due) — or, before the
  // team's phases, the site's verification fallen due
  const phases = (st.lifecycle ?? "active") !== "pending" && (st.posted.length > 0 || ledger?.dueRound !== undefined || owed.length === 0);
  const activated = st.round > 0 && (expect.site !== undefined ? st.site?.dueRound !== undefined && (phases || owed.every((o) => o.kind === "site")) : phases);
  const completed = activated && owed.every((o) => o.status === "met" || (o.status === "escalated" && !!o.escalation?.appropriate));
  const failures: string[] = [];
  if (!activated) failures.push("invalid: the assigned scenario's work never started");
  const unfinished = owed.filter((o) => o.status === "unfinished");
  if (unfinished.length) failures.push(`unfinished when the run stopped: ${unfinished.map((o) => o.id).join(", ")}`);
  for (const o of owed) {
    if (o.status === "failed") failures.push(`${o.id}: ended without the outcome (${o.physical ? "not verified" : "not in hand"})`);
    if (o.status === "escalated" && !o.escalation?.appropriate) failures.push(`${o.id}: escalated, but the scenario expects it done`);
    if (o.status === "met" && o.kind === "deliver" && expect.delivered === false) failures.push(`${o.id}: delivered, but the scenario expects it escalated`);
  }
  if (escalations.some((m) => !m.text.en.includes("—"))) failures.push("an escalation without a reason");
  if (expect.count && count?.outcome !== expect.count) failures.push(`count: expected ${expect.count}, got ${count?.outcome ?? "nothing"}`);
  if (expect.site !== undefined) {
    if (!site) failures.push("site: no site record to read");
    else {
      if (site.outcome !== expect.site) failures.push(`site: expected ${expect.site}, got ${site.outcome}`);
      if (site.falsePause) failures.push("a pause on the site when the mark agreed with the plan (false pause)");
      if (expect.site !== "confirmed" && !site.pause) failures.push("a discrepancy on the site, and nobody called a pause");
      if (expect.site === "corrected" && site.outcome === "corrected" && !site.resumed) failures.push("the site was confirmed, but the pause was never released");
      if (expect.site === "unresolved" && site.resumed) failures.push("the pause was released on a site that is not resolved");
      if (site.unjustifiedResume) failures.push("resumed before the site was verified and confirmed");
    }
  }
  if (count?.falseHold) failures.push("a hold on closure when every item was there (false hold)");
  if (count?.inappropriateProgression) failures.push("closure began while the count was not settled");
  if (!exactlyOnce) failures.push("an act carried out twice");
  return {
    caseId: c.id,
    scenario,
    expect,
    needs: owed.filter((o) => o.kind === "deliver").length,
    delivered: done.length,
    verified: done.filter((t) => t.verified).length,
    escalated: supplies.filter((t) => t.status === "escalated").length,
    reasoned: escalations.every((m) => m.text.en.includes("—")),
    handOvers,
    exactlyOnce,
    ...(count ? { count } : {}),
    ...(site ? { site } : {}),
    rounds: st.round,
    messages: st.messages.length,
    acts: st.receipts.length,
    seconds: Math.round(st.receipts.reduce((sum, r) => sum + (r.seconds ?? 0), 0)),
    obligations: owed,
    activated,
    completed,
    invalid: !activated,
    pass: failures.length === 0,
    failures,
  };
}

/** The report's denominators (see `TeamReport.counts`). */
export function teamCounts(runs: readonly TeamRunResult[]): TeamReport["counts"] {
  return {
    assigned: runs.length,
    activated: runs.filter((r) => r.activated).length,
    completed: runs.filter((r) => r.completed).length,
    escalated: runs.filter((r) => r.obligations.some((o) => o.status === "escalated" && o.escalation?.appropriate)).length,
    invalid: runs.filter((r) => r.invalid).length,
    obligations: runs.reduce((n, r) => n + r.obligations.length, 0),
    unfinished: runs.reduce((n, r) => n + r.obligations.filter((o) => o.status === "unfinished").length, 0),
  };
}

/** Run every team scenario of the cases (optionally only some scenarios). */
export async function runTeamBench(content: LoadedContent, opts: { caseIds?: readonly string[]; scenarios?: readonly string[]; locale?: string } = {}): Promise<TeamReport> {
  const runs: TeamRunResult[] = [];
  for (const c of teamCases(content, opts.caseIds)) {
    for (const s of c.team!.scenarios) {
      if (opts.scenarios?.length && !opts.scenarios.includes(s.id)) continue;
      runs.push(await runTeamScenario(content, c, s.id, opts.locale ? { locale: opts.locale } : {}));
    }
  }
  return { format: "clinicalcraft-team-report@2", runs, passed: runs.filter((r) => r.pass).length, total: runs.length, counts: teamCounts(runs) };
}
