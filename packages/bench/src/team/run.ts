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
 * (closure begun on a hold; an act given before the information it waited for); exactly once (no action id carried
 * out twice; no more hand-overs than needs). An information handoff (docs/TEAM.md §4.5) is recorded as who asked for
 * it, who supplied it, who received it (read back) and when, and what the clinician in charge did next: after the
 * team, the case's reference path goes on as the simulated clinician's — the history the team supplied is not asked
 * again, and what it escalated is asked first — up to the act it held up.
 */
import type { CaseDefinition, ClinicalAction, CountRecord, TeamScenario } from "@clinicalcraft/core";
import { awaitingAcquisition, countStatus, evaluate } from "@clinicalcraft/core";
import { actionIntent, createSession, mergeSettings, minutesUntilReadable, monitorTravels, type ClinicalSession, type TeamCheckpoint } from "@clinicalcraft/agent";
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
  kind: "deliver" | "count" | "inform";
  /** Who it is for (a member's body id; the count: the surgeon). */
  recipient: string;
  /** Equipment type (information: the case's history item). */
  item: string;
  status: "met" | "escalated" | "unfinished" | "failed";
  /** The physical outcome holds: the recipient holds an item of the type (its own); the count is settled in the record. */
  physical: boolean;
  /** The team checked it with its own eyes (the circulating nurse saw the item in hand; the count reconciled). */
  verified: boolean;
  /** An escalation with a reason (English; `reasonText` in both languages), and whether the scenario expected one. */
  escalation?: { reason: string; reasonText?: { en: string; "zh-CN": string }; appropriate: boolean };
  /** An information handoff: who asked, who supplied it, who received it and when, and what followed (`InformHandoff`). */
  handoff?: InformHandoff;
}

/** Who did something in a handoff, and when (simulated minute, scheduler round). */
export interface HandoffParty {
  by: string;
  at: number;
  round: number;
}

/**
 * An information handoff as the record has it (docs/TEAM.md §4.5): the request to the member who holds it
 * (`ordered`), their report back (`performed`), the read-back of the person who needed it, confirmed (`received`);
 * then the first clinical act after it (`next`) and the act it held up (`blocked`: when it was given — after the
 * information arrived, or not).
 */
export interface InformHandoff {
  ordered: HandoffParty | null;
  performed: HandoffParty | null;
  received: HandoffParty | null;
  next: { action: string; by: string; at: number } | null;
  blocked?: { intervention: string; givenAt: number | null; afterReceipt: boolean | null };
}

/** One act of the clinician in charge after the team's handoff (the case's reference path, continued). */
export interface ClinicianAct {
  action: string;
  by: string;
  at: number;
  accepted: boolean;
  interventionId?: string;
}

export interface TeamRunResult {
  caseId: string;
  scenario: string;
  /** What the scenario expects (authored). */
  expect: { delivered?: boolean; count?: "correct" | "reconciled" | "unresolved"; informed?: boolean };
  needs: number;
  /** Information needs, and those supplied (read back, confirmed and recorded in the case). */
  informs: number;
  informed: number;
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

/** Is this step the end of what the replay may do (finishing the case, closing the operation)? */
const isEnd = (a: ClinicalAction) => a.type === "finish" || (a.type === "operate" && (a as { op?: { op?: string } }).op?.op === "close");

/** World actions of the replay's clinician, under stable ids. */
function clinicianActs(session: ClinicalSession): (request: { operation: string; targetId?: string; goal?: { kind: "interact"; id: string }; parameters?: Record<string, unknown> }) => Promise<void> {
  let n = 0;
  return async (request) => {
    await session.run({ type: "world_action", request: { actionId: `bench-team-${++n}`, actorId: PRIMARY_ACTOR, ...request } });
  };
}

/**
 * In-world, a study is done with the patient on its device (docs/EMBODIED.md §8.7): the replay takes them there as
 * the in-world demonstration does — the clinician walks to the patient and wheels them to the device the
 * acquisition's hint names (`transport_patient`, the monitor going with them), the session records the acquisition on
 * arrival — and then back to their bed space.
 */
async function acquireStudies(session: ClinicalSession, c: CaseDefinition, act: ReturnType<typeof clinicianActs>): Promise<void> {
  const w = session.world();
  if (!w) return;
  const tried = new Set<string>();
  for (;;) {
    const order = session.state.orders.find((o) => awaitingAcquisition(o) && !tried.has(o.key));
    if (!order) break;
    tried.add(order.key);
    const intent = actionIntent({ type: "acquire", investigationId: order.investigationId });
    const check = intent ? w.checkSpatial(PRIMARY_ACTOR, intent) : null;
    const then = check && !check.ok ? check.hint?.then : undefined;
    if (then?.operation !== "transport_patient") continue;
    await act({ operation: "navigate", goal: { kind: "interact", id: then.targetId } });
    await act({ operation: "transport_patient", targetId: then.targetId, parameters: { ...(then.parameters ?? {}), ...(monitorTravels(c, session.state, w) ? { monitor: true } : {}) } });
  }
  const place = w.patientPlace();
  const patient = w.find(PRIMARY_ACTOR, { kind: "patient", limit: 1 })[0]?.id;
  const home = !place || (place.home.slot ? place.slot === place.home.slot : !place.slot && place.provider === place.home.provider);
  if (home || !patient) return;
  await act({ operation: "navigate", goal: { kind: "interact", id: patient } });
  await act({ operation: "transport_patient", targetId: patient, parameters: { destination: "home", ...(monitorTravels(c, session.state, w) ? { monitor: true } : {}) } });
}

/**
 * One step of the replayed path, as the in-world demonstration takes it: a result read waits for its turnaround (the
 * clock advanced to it), a study ordered is done with the patient on its device (`acquireStudies`).
 */
async function replayStep(session: ClinicalSession, c: CaseDefinition, a: ClinicalAction, act: ReturnType<typeof clinicianActs>): Promise<ReturnType<ClinicalSession["dispatch"]>> {
  const wait = minutesUntilReadable(c, session.state, a);
  if (wait > 0) session.dispatch({ type: "advance-time", minutes: wait, reason: "wait", by: "system" });
  const r = session.dispatch({ ...a, by: "system" } as ClinicalAction);
  if (!r.rejected && a.type === "order") await acquireStudies(session, c, act);
  return r;
}

/**
 * Replay the reference solution until `ready` holds (or the solution ends before an `operate close`); `skip`: the
 * history the scenario routes through the team (the clinician in charge does not ask it). A study ordered is done
 * with the patient on its device (`acquireStudies`). Returns the index of the first step not replayed.
 */
async function bringTo(session: ClinicalSession, c: CaseDefinition, ready: () => boolean, skip: ReadonlySet<string> = new Set()): Promise<number> {
  const act = clinicianActs(session);
  let i = 1;
  for (; i < c.solution.length; i++) {
    const a = c.solution[i]!;
    if (ready() || isEnd(a)) return i;
    if (a.type === "ask" && skip.has(a.itemId)) continue;
    const r = await replayStep(session, c, a, act);
    if (r.rejected) throw new Error(`${c.id}: the reference solution was refused at ${a.type}: ${r.rejected.message}`);
  }
  return i;
}

/** An action in a line ("intervene tenecteplase", "ask anticoagulants"). */
function actionLabel(a: ClinicalAction): string {
  const x = a as { type: string; itemId?: string; findingId?: string; investigationId?: string; interventionId?: string; decisionId?: string; phase?: string; minutes?: number };
  return [x.type, x.itemId ?? x.findingId ?? x.investigationId ?? x.interventionId ?? x.decisionId ?? x.phase ?? (x.minutes !== undefined ? `${x.minutes} min` : "")].filter(Boolean).join(" ");
}

/**
 * After an information handoff, the clinician in charge goes on (observer mode: the simulated clinician works the
 * case's reference path): what the team escalated they take themselves first (the history asked directly), then the
 * rest of the path from `from` — never asking again what the team supplied — up to the act the information held up
 * (or the end, before finishing). Stops at a refused step. Returns the acts, each with its minute.
 */
async function continueAfter(session: ClinicalSession, c: CaseDefinition, scenario: TeamScenario, from: number, supplied: ReadonlySet<string>): Promise<ClinicianAct[]> {
  const acts: ClinicianAct[] = [];
  // the clinician in charge (the team's `surgeon` member: the learner's body, simulated in observer mode)
  const by = PRIMARY_ACTOR;
  const act = clinicianActs(session);
  const run = async (a: ClinicalAction): Promise<boolean> => {
    const r = await replayStep(session, c, a, act);
    acts.push({ action: actionLabel(a), by, at: session.state.clock, accepted: !r.rejected, ...(a.type === "intervene" ? { interventionId: a.interventionId } : {}) });
    return !r.rejected;
  };
  const routed = scenario.inform.map((n) => n.history);
  const taken = new Set(supplied);
  for (const h of routed) {
    if (taken.has(h)) continue;
    taken.add(h);
    if (!(await run({ type: "ask", itemId: h }))) return acts;
  }
  const blocks = new Set(scenario.inform.flatMap((n) => (n.blocks ? [n.blocks] : [])));
  for (let i = from; i < c.solution.length; i++) {
    const a = c.solution[i]!;
    if (isEnd(a)) break;
    if (a.type === "ask" && taken.has(a.itemId)) continue;
    if (!(await run(a))) break;
    if (a.type === "intervene" && blocks.has(a.interventionId) && [...blocks].every((b) => acts.some((x) => x.interventionId === b && x.accepted))) break;
  }
  return acts;
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
    // observer mode: the team waits for the op (nothing of it runs while the case is brought to the moment), the
    // simulated surgeon answering
    await session.run({ type: "team", action: "pause" });
    await session.run({ type: "team", action: "surgeon", surgeon: "simulated" });
    const forCount = scenario.expect?.count !== undefined && !!team.count;
    // information the scenario routes through the team: the clinician in charge does not ask it themselves
    const informs = scenario.inform ?? [];
    const routed = new Set(informs.map((n) => n.history));
    const due = () => informs.every((n) => !n.when || evaluate(c, session.state, n.when));
    const stopped = await bringTo(session, c, () => team.phases.includes(session.state.phase) && (!forCount || evaluate(c, session.state, team.count!.when)) && due(), routed);
    if (!team.phases.includes(session.state.phase)) throw new Error(`${c.id}: the reference solution never reaches the team's phases (${team.phases.join(", ")})`);
    // the surgeon's body at the table
    const world = session.world()!;
    const patient = world.find(PRIMARY_ACTOR, { kind: "patient", limit: 1 })[0]?.id;
    if (patient) await session.run({ type: "world_action", request: { actionId: "bench-to-table", actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: patient } } });
    await session.run({ type: "team", action: "run", rounds: opts.maxRounds ?? 120 });
    const w = session.world()!;
    const cp = session.snapshot().team!;
    // what the clinician in charge did next: the reference path, continued (information handoffs only)
    const supplied = new Set(cp.state.tasks.filter((t) => t.kind === "inform" && t.status === "done" && t.relayed).map((t) => t.item));
    const after = informs.length ? await continueAfter(session, c, scenario, stopped, supplied) : [];
    const known = new Set(session.state.asked);
    return score(c, scenario.id, scenario.expect ?? {}, cp, { record: session.state.count, holding: (actor) => w.actor(actor)?.holding ?? [], known: (h) => known.has(h), after });
  } finally {
    await session.close();
  }
}

/**
 * What the scorer reads beyond the team's checkpoint: the case's count record, what bodies hold now, the history the
 * case records as known (`known`), and the clinician's acts after the team (`after`).
 */
export interface ScoreContext {
  record?: CountRecord;
  holding?: (actorId: string) => readonly string[];
  known?: (history: string) => boolean;
  after?: readonly ClinicianAct[];
}

const memberBody = (ref: string) => (ref === "surgeon" ? PRIMARY_ACTOR : `staff:${ref}`);

/**
 * The scenario's obligations, by id (see `TeamObligation`): every need (the scenario's and those asked for in the
 * session) — met when its supply task was verified and the person holds that item, an item no other need was
 * credited with; and the count, when the scenario expects an outcome — read from the case's count record.
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
      escalation = { reason: supply.reasonText?.en ?? supply.reason ?? "", ...(supply.reasonText ? { reasonText: { ...supply.reasonText } } : {}), appropriate: expect.delivered === false };
    } else if (supply?.status === "declined") status = "failed";
    if (status === "met" && item) credited.add(item);
    out.push({ id: `need:${need.id}`, kind: "deliver", recipient, item: need.item, status, physical, verified: supply?.verified === true && !duplicate, ...(escalation ? { escalation } : {}) });
  }
  for (const n of scenario?.inform ?? []) out.push(informObligation(n, expect, cp, ctx));
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
  return out;
}

/**
 * An information need as an obligation: met when the person who needed it read it back, the circulator confirmed it
 * and the case records it as known to them; the handoff — who asked, who supplied, who received and when — read from
 * the thread's messages; what followed from the clinician's acts after the team.
 */
function informObligation(n: TeamScenario["inform"][number], expect: TeamRunResult["expect"], cp: TeamCheckpoint, ctx: ScoreContext): TeamObligation {
  const st = cp.state;
  const task = st.tasks.find((x) => x.kind === "inform" && x.need === n.id);
  const recipient = memberBody(n.for);
  const physical = !!task?.relayed && (ctx.known ? ctx.known(n.history) : true);
  const thread = task ? st.messages.filter((m) => m.thread === task.thread) : [];
  const party = (m: (typeof thread)[number] | undefined): HandoffParty | null => (m ? { by: m.from, at: m.at, round: m.round } : null);
  const confirm = thread.findLast((m) => m.kind === "confirm" && m.from === task?.owner);
  const received = confirm ? thread.findLast((m) => m.kind === "readback" && m.from === recipient && m.round <= confirm.round) : undefined;
  const after = ctx.after ?? [];
  const accepted = after.filter((x) => x.accepted);
  const first = accepted[0];
  const given = n.blocks ? accepted.find((x) => x.interventionId === n.blocks) : undefined;
  const handoff: InformHandoff = {
    ordered: party(thread.find((m) => m.kind === "request" && m.to === memberBody(n.heldBy))),
    performed: party(thread.find((m) => m.kind === "report" && m.from === memberBody(n.heldBy))),
    received: received && task?.relayed ? { by: received.from, at: task.relayed.at, round: received.round } : null,
    next: first ? { action: first.action, by: first.by, at: first.at } : null,
    ...(n.blocks ? { blocked: { intervention: n.blocks, givenAt: given?.at ?? null, afterReceipt: given ? (task?.relayed ? given.at >= task.relayed.at : null) : null } } : {}),
  };
  let status: TeamObligation["status"] = "unfinished";
  let escalation: TeamObligation["escalation"];
  if (task?.status === "done") status = task.verified && physical ? "met" : "failed";
  else if (task?.status === "escalated") {
    status = "escalated";
    escalation = { reason: task.reasonText?.en ?? task.reason ?? "", ...(task.reasonText ? { reasonText: { ...task.reasonText } } : {}), appropriate: expect.informed === false };
  } else if (task?.status === "declined") status = "failed";
  return { id: `inform:${n.id}`, kind: "inform", recipient, item: n.history, status, physical, verified: task?.verified === true, ...(escalation ? { escalation } : {}), handoff };
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
  // activated: set up in the world and its work begun (a need noticed, information needed, or the count fallen due)
  const activated = (st.lifecycle ?? "active") !== "pending" && st.round > 0 && (st.posted.length > 0 || (st.informed?.length ?? 0) > 0 || ledger?.dueRound !== undefined || owed.length === 0);
  const completed = activated && owed.every((o) => o.status === "met" || (o.status === "escalated" && !!o.escalation?.appropriate));
  const failures: string[] = [];
  if (!activated) failures.push("invalid: the assigned scenario's work never started");
  const unfinished = owed.filter((o) => o.status === "unfinished");
  if (unfinished.length) failures.push(`unfinished when the run stopped: ${unfinished.map((o) => o.id).join(", ")}`);
  for (const o of owed) {
    if (o.status === "failed") failures.push(`${o.id}: ended without the outcome (${o.physical ? "not verified" : "not in hand"})`);
    if (o.status === "escalated" && !o.escalation?.appropriate) failures.push(`${o.id}: escalated, but the scenario expects it done`);
    if (o.status === "met" && o.kind === "deliver" && expect.delivered === false) failures.push(`${o.id}: delivered, but the scenario expects it escalated`);
    if (o.kind === "inform") {
      const h = o.handoff;
      if (o.status === "met" && expect.informed === false) failures.push(`${o.id}: supplied, but the scenario expects it escalated`);
      if (o.status === "met" && !(h?.ordered && h.performed && h.received)) failures.push(`${o.id}: the record lacks who asked, who supplied it or who received it`);
      if ((o.status === "met" || o.status === "escalated") && !h?.next) failures.push(`${o.id}: nothing was recorded of what the clinician did next`);
      if (h?.blocked && h.blocked.givenAt !== null && h.blocked.afterReceipt === false) failures.push(`${o.id}: ${h.blocked.intervention} was given before the information arrived (inappropriate progression)`);
      if (o.status === "met" && h?.blocked && h.blocked.givenAt === null) failures.push(`${o.id}: ${h.blocked.intervention} was never given after the information arrived`);
    }
  }
  if (escalations.some((m) => !m.text.en.includes("—"))) failures.push("an escalation without a reason");
  if (expect.count && count?.outcome !== expect.count) failures.push(`count: expected ${expect.count}, got ${count?.outcome ?? "nothing"}`);
  if (count?.falseHold) failures.push("a hold on closure when every item was there (false hold)");
  if (count?.inappropriateProgression) failures.push("closure began while the count was not settled");
  if (!exactlyOnce) failures.push("an act carried out twice");
  return {
    caseId: c.id,
    scenario,
    expect,
    needs: owed.filter((o) => o.kind === "deliver").length,
    informs: owed.filter((o) => o.kind === "inform").length,
    informed: owed.filter((o) => o.kind === "inform" && o.status === "met").length,
    delivered: done.length,
    verified: done.filter((t) => t.verified).length,
    // every need escalated: an item, or information the team could not pass on
    escalated: supplies.filter((t) => t.status === "escalated").length + owed.filter((o) => o.kind === "inform" && o.status === "escalated").length,
    reasoned: escalations.every((m) => m.text.en.includes("—")),
    handOvers,
    exactlyOnce,
    ...(count ? { count } : {}),
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
