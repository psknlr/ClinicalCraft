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
 */
import type { CaseDefinition, ClinicalAction } from "@clinicalcraft/core";
import { evaluate } from "@clinicalcraft/core";
import { createSession, mergeSettings, type ClinicalSession, type TeamCheckpoint } from "@clinicalcraft/agent";
import { catalogsFor, chooseFacility, type LoadedContent } from "@clinicalcraft/agent/node";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { benchClock, benchIds } from "../session.js";

export interface TeamRunResult {
  caseId: string;
  scenario: string;
  /** What the scenario expects (authored). */
  expect: { delivered?: boolean; count?: "correct" | "reconciled" | "unresolved" };
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
  rounds: number;
  messages: number;
  acts: number;
  /** Simulated seconds the team's acts took (walking, searching, handing over). */
  seconds: number;
  pass: boolean;
  /** Why it did not pass (empty when it did). */
  failures: string[];
}

export interface TeamReport {
  format: "clinicalcraft-team-report@1";
  runs: TeamRunResult[];
  passed: number;
  total: number;
}

/** The cases of the content that have team scenarios (optionally only `caseIds`). */
export function teamCases(content: Pick<LoadedContent, "cases">, caseIds?: readonly string[]): CaseDefinition[] {
  return [...content.cases.values()].map((e) => e.def).filter((c) => !!c.team?.scenarios.length && (!caseIds?.length || caseIds.includes(c.id)));
}

/** Replay the reference solution until `ready` holds (or the solution ends before an `operate close`). */
function bringTo(session: ClinicalSession, c: CaseDefinition, ready: () => boolean): void {
  for (const a of c.solution.slice(1)) {
    if (ready()) return;
    if (a.type === "finish" || (a.type === "operate" && (a as { op?: { op?: string } }).op?.op === "close")) return;
    const r = session.dispatch({ ...a, by: "system" } as ClinicalAction);
    if (r.rejected) throw new Error(`${c.id}: the reference solution was refused at ${a.type}: ${r.rejected.message}`);
  }
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
    bringTo(session, c, () => team.phases.includes(session.state.phase) && (!forCount || evaluate(c, session.state, team.count!.when)));
    if (!team.phases.includes(session.state.phase)) throw new Error(`${c.id}: the reference solution never reaches the team's phases (${team.phases.join(", ")})`);
    // observer mode: the team waits for the op; the surgeon's body at the table, the simulated surgeon answering
    await session.run({ type: "team", action: "pause" });
    await session.run({ type: "team", action: "surgeon", surgeon: "simulated" });
    const world = session.world()!;
    const patient = world.find(PRIMARY_ACTOR, { kind: "patient", limit: 1 })[0]?.id;
    if (patient) await session.run({ type: "world_action", request: { actionId: "bench-to-table", actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: patient } } });
    await session.run({ type: "team", action: "run", rounds: opts.maxRounds ?? 120 });
    return score(c, scenario.id, scenario.expect ?? {}, session.snapshot().team!);
  } finally {
    await session.close();
  }
}

/** Score a run from the session's own record. */
export function score(c: CaseDefinition, scenario: string, expect: TeamRunResult["expect"], cp: TeamCheckpoint): TeamRunResult {
  const st = cp.state;
  const supplies = st.tasks.filter((t) => t.kind === "supply");
  const done = supplies.filter((t) => t.status === "done");
  const escalations = st.messages.filter((m) => m.kind === "escalate");
  const handOvers = st.receipts.filter((r) => r.operation === "hand_over" && r.outcome === "completed").length;
  const ids = st.receipts.filter((r) => r.outcome === "completed").map((r) => r.id);
  const exactlyOnce = new Set(ids).size === ids.length && handOvers <= Math.max(st.posted.length, supplies.length);
  const ledger = st.count;
  const count = ledger
    ? {
        outcome: ledger.outcome ?? null,
        baseline: ledger.baseline,
        holds: ledger.holds,
        detectionLatency: ledger.detectedRound !== undefined && ledger.dueRound !== undefined ? ledger.detectedRound - ledger.dueRound : null,
        falseHold: ledger.holds > 0 && expect.count === "correct",
        inappropriateProgression: !!ledger.closedOnHold,
      }
    : undefined;
  const failures: string[] = [];
  if (expect.delivered === true && (done.length !== supplies.length || supplies.length === 0 || done.some((t) => !t.verified))) failures.push("not every need was delivered and verified");
  if (expect.delivered === false && (supplies.some((t) => t.status === "done") || escalations.length === 0)) failures.push("a need that could not be met was not escalated");
  if (escalations.some((m) => !m.text.en.includes("—"))) failures.push("an escalation without a reason");
  if (expect.count && count?.outcome !== expect.count) failures.push(`count: expected ${expect.count}, got ${count?.outcome ?? "nothing"}`);
  if (count?.falseHold) failures.push("a hold on closure when every item was there (false hold)");
  if (count?.inappropriateProgression) failures.push("closure began while the count was short");
  if (!exactlyOnce) failures.push("an act carried out twice");
  return {
    caseId: c.id,
    scenario,
    expect,
    needs: st.posted.length,
    delivered: done.length,
    verified: done.filter((t) => t.verified).length,
    escalated: supplies.filter((t) => t.status === "escalated").length,
    reasoned: escalations.every((m) => m.text.en.includes("—")),
    handOvers,
    exactlyOnce,
    ...(count ? { count } : {}),
    rounds: st.round,
    messages: st.messages.length,
    acts: st.receipts.length,
    seconds: Math.round(st.receipts.reduce((sum, r) => sum + (r.seconds ?? 0), 0)),
    pass: failures.length === 0,
    failures,
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
  return { format: "clinicalcraft-team-report@1", runs, passed: runs.filter((r) => r.pass).length, total: runs.length };
}
