/**
 * The team benchmark (docs/TEAM.md §7): every team scenario of a case, run headless in observer mode — the case
 * replayed (its reference solution) up to the moment the scenario is about (the team's phase; the count due, for a
 * count scenario), the surgeon's body at the table, the simulated surgeon answering — then the team alone, through
 * the same `team` op the browser uses, until what was set in motion has ended. What happened is read from the
 * session's own record (team checkpoint, world), never from the team's say-so, and scored against the scenario's
 * authored `expect` (hidden from the team).
 *
 * By place (`seat`: the first or second assistant's, the scrub nurse's): the encounter starts in that place — the
 * start joins the team at its phase along the reference path (docs/TEAM.md §1) —, in observer mode the place's own
 * policy plays it with the learner's body while the stand-in surgeon operates, and the run is scored on the same
 * obligations plus the operation: closed, or still open when the run stopped. Each scenario that offers the place is
 * run (one whose absences leave the place without its member is skipped, saying why).
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
import type { CaseDefinition, ClinicalAction, CountRecord, Place, TeamChoice, TeamScenario } from "@clinicalcraft/core";
import { awaitingAcquisition, countStatus, evaluate, informBlocks, memberBody, POSITION_TITLES, seatsOf, t } from "@clinicalcraft/core";
import { actionIntent, createSession, learnerAwaited, mergeSettings, minutesUntilReadable, monitorTravels, type ClinicalSession, type TeamCheckpoint } from "@clinicalcraft/agent";
import { catalogsFor, chooseFacility, type LoadedContent } from "@clinicalcraft/agent/node";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { benchClock, benchIds } from "../session.js";

/**
 * One thing a scenario obliges the team to bring about (docs/TEAM.md §7), enumerated by id when the scenario starts:
 * a need (an item for someone), information to get to someone, or the count (by place, also the operation). What
 * happened is read from the session's record: who it was for, the physical outcome (they hold the item; the count
 * record's status), whether the team verified it, and an escalation with its reason. `met` — done and verified;
 * `escalated` — raised with a reason (appropriate when the scenario expects it); `unfinished` — still under way when
 * the run stopped; `failed` — ended otherwise.
 */
export interface TeamObligation {
  id: string;
  /** `inform`: information a colleague holds, got to the person who needs it; `operation`: by place only — the stand-in's operation brought to its close. */
  kind: "deliver" | "count" | "inform" | "operation";
  /** Who it is for (a member's body id, core `memberBody`; the count and the operation: the surgeon — the stand-in's body in a place). */
  recipient: string;
  /** Equipment type (information: the case's history item; the operation: the case's procedure). */
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
 * then the first clinical act after it (`next`) and each act it held up (`blocked`, the scenario's `blocks` in their
 * order: when each was given — after the information arrived, or not; null when it was not given).
 */
export interface InformHandoff {
  ordered: HandoffParty | null;
  performed: HandoffParty | null;
  received: HandoffParty | null;
  next: { action: string; by: string; at: number } | null;
  blocked?: HeldUpAct[];
}

/** An act an information need held up, as the run ended: when it was given, and whether after the information arrived. */
export interface HeldUpAct {
  intervention: string;
  givenAt: number | null;
  afterReceipt: boolean | null;
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
  /** By place: the learner's place in the team (played by its own policy) and the line-up chosen. */
  seat?: Place;
  lineup?: string;
  /** By place: the operation — closed, or open when the run stopped; `halted`: the stand-in's word that it could not go on. */
  operation?: { closed: boolean; halted?: string };
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
  /** By place: the place every run took (and the line-up); absent for the default run. */
  seat?: Place;
  lineup?: string;
  /** By place: the scenarios not run because they do not offer the place (its member absent), and why. */
  skipped?: { caseId: string; scenario: string; reason: string }[];
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
  // the clinician in charge (the team's `surgeon` member, core `memberBody`: the learner's body, simulated in observer mode)
  const by = memberBody(c, session.state, "surgeon");
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
  // the acts each information need held up: the path stops once one of each need's acts has been given (they may be
  // alternatives — thrombolysis by either drug)
  const held = scenario.inform.map((n) => informBlocks(n)).filter((ids) => ids.length > 0);
  const given = (id: string) => acts.some((x) => x.interventionId === id && x.accepted);
  for (let i = from; i < c.solution.length; i++) {
    const a = c.solution[i]!;
    if (isEnd(a)) break;
    if (a.type === "ask" && taken.has(a.itemId)) continue;
    if (!(await run(a))) break;
    if (a.type === "intervene" && held.some((ids) => ids.includes(a.interventionId)) && held.every((ids) => ids.some(given))) break;
  }
  return acts;
}

/** The rounds a run by place may take: the stand-in's whole operation, one step a round at most. */
const SEAT_ROUNDS = 600;

/**
 * The stand-in's word that it could not go on ("I can't go on: …"), open — read from the team's record as it would wait
 * on a learner playing the place (`learnerAwaited`): observing, nothing answers it, so a run by place ends there.
 */
function cannotGoOn(cp: TeamCheckpoint): string | null {
  const req = learnerAwaited(cp.state, "learner")?.request;
  if (!req?.key.startsWith("cannot:")) return null;
  return [...cp.state.messages].reverse().find((m) => m.thread === req.thread)?.text.en ?? req.key;
}

/**
 * A run by place (observer mode: the place's own policy plays it, the stand-in operates): the team's rounds in chunks,
 * each followed by the staff's own round (`staff_step`, as a headless driver sends it: the world as it now is reaches
 * the record) — until the operation is closed and nothing the scenario obliges is still under way, the stand-in cannot
 * go on, nothing happens any more, or `maxRounds`.
 */
async function runByPlace(session: ClinicalSession, settled: () => boolean, maxRounds: number): Promise<string | null> {
  for (let guard = 0; guard < 200; guard++) {
    const cp = session.team();
    if (!cp || cp.state.round >= maxRounds || (session.state.procedure?.closed && settled())) return null;
    const before = cp.state.round;
    await session.run({ type: "team", action: "run", rounds: Math.min(40, maxRounds - before) });
    await session.run({ type: "staff_step" });
    const after = session.team();
    const halted = after ? cannotGoOn(after) : null;
    if (halted) return halted;
    if (!after || after.state.round === before) return null;
  }
  return null;
}

/** Run one team scenario of a case (`seat`: in that place, played by its own policy; `lineup`: the line-up chosen). */
export async function runTeamScenario(content: LoadedContent, c: CaseDefinition, scenarioId: string, opts: { locale?: string; maxRounds?: number; seat?: Place; lineup?: string } = {}): Promise<TeamRunResult> {
  const team = c.team!;
  const scenario = team.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) throw new Error(`${c.id}: no team scenario "${scenarioId}"`);
  const facility = chooseFacility(content, c, undefined, null);
  if (!facility) throw new Error(`${c.id}: no facility for the team`);
  const settings = mergeSettings([{ source: "flag", settings: { provider: "offline", locale: opts.locale ?? "en", embodiment: "embodied", approvalMode: "bypass", transcripts: { enabled: false }, autoCompact: { enabled: false, thresholdTokens: 120_000 } } }]);
  const session = await createSession({ caseDef: c, facility, catalogs: catalogsFor(content, facility), settings, newId: benchIds("t"), now: benchClock(), retry: false });
  try {
    if (opts.seat) return await runInPlace(session, c, scenario, opts.seat, opts);
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
 * One scenario in a place (docs/TEAM.md §7, by place): the start takes the place and joins the team at its phase (the
 * learner's body at the table), observer mode plays the place with its own policy while the stand-in operates, and the
 * run is scored on the scenario's obligations and the operation. A place the start refuses is an invalid run, saying why.
 */
async function runInPlace(session: ClinicalSession, c: CaseDefinition, scenario: NonNullable<CaseDefinition["team"]>["scenarios"][number], seat: Place, opts: { maxRounds?: number; lineup?: string }): Promise<TeamRunResult> {
  const start = await session.run({ type: "clinical_action", action: { type: "start", team: scenario.id, seat, ...(opts.lineup ? { lineup: opts.lineup } : {}) } });
  const expect = scenario.expect ?? {};
  if (session.state.seat !== seat) {
    const said = start.flatMap((e) => (e.msg.type === "error" || e.msg.type === "warning" ? [e.msg.message] : []))[0] ?? "refused";
    return { ...invalidRun(c.id, scenario.id, expect, `the place was not taken: ${said}`), seat, ...(opts.lineup ? { lineup: opts.lineup } : {}) };
  }
  // observer mode: the team waits for the op; the place played by its own policy with the learner's body (at the table)
  await session.run({ type: "team", action: "pause" });
  await session.run({ type: "team", action: "surgeon", surgeon: "simulated" });
  const w = session.world()!;
  const ctx = (): ScoreContext => ({ record: session.state.count, holding: (actor) => w.actor(actor)?.holding ?? [], choice: session.state, operation: { closed: !!session.state.procedure?.closed } });
  const halted = await runByPlace(session, () => obligations(c, scenario.id, expect, session.team()!, ctx()).every((o) => o.status !== "unfinished"), opts.maxRounds ?? SEAT_ROUNDS);
  const cp = session.snapshot().team!;
  const run = score(c, scenario.id, expect, cp, { ...ctx(), operation: { closed: !!session.state.procedure?.closed, ...(halted ? { halted } : {}) } });
  return { ...run, seat, ...(opts.lineup ? { lineup: opts.lineup } : {}) };
}

/** A run that never began (a place refused): invalid, with why. */
function invalidRun(caseId: string, scenario: string, expect: TeamRunResult["expect"], why: string): TeamRunResult {
  return {
    caseId,
    scenario,
    expect,
    needs: 0,
    informs: 0,
    informed: 0,
    delivered: 0,
    verified: 0,
    escalated: 0,
    reasoned: true,
    handOvers: 0,
    exactlyOnce: true,
    rounds: 0,
    messages: 0,
    acts: 0,
    seconds: 0,
    obligations: [],
    activated: false,
    completed: false,
    invalid: true,
    pass: false,
    failures: [`invalid: ${why}`],
  };
}

/**
 * What the scorer reads beyond the team's checkpoint: the case's count record, what bodies hold now, the history the
 * case records as known (`known`), the clinician's acts after the team (`after`), the encounter's choices (`choice`: the
 * place, the line-up, the team scenario — whose body is whose, core `memberBody`; none: the learner operates) and, by
 * place, the operation (`operation`: closed or not; `halted`: the stand-in's word that it could not go on).
 */
export interface ScoreContext {
  record?: CountRecord;
  holding?: (actorId: string) => readonly string[];
  known?: (history: string) => boolean;
  after?: readonly ClinicianAct[];
  choice?: TeamChoice;
  operation?: { closed: boolean; halted?: string };
}

/**
 * The scenario's obligations, by id (see `TeamObligation`): every need (the scenario's and those asked for in the
 * session) — met when its supply task was verified and the person holds that item, an item no other need was
 * credited with; every information need (`informObligation`); the count, when the scenario expects an outcome — read
 * from the case's count record; and, by place, the operation.
 */
export function obligations(c: CaseDefinition, scenarioId: string, expect: TeamRunResult["expect"], cp: TeamCheckpoint, ctx: ScoreContext = {}): TeamObligation[] {
  const st = cp.state;
  const scenario = c.team?.scenarios.find((x) => x.id === scenarioId);
  const needs = [...(scenario?.needs ?? []), ...st.extra];
  const credited = new Set<string>();
  const out: TeamObligation[] = [];
  // whose body is whose (core `memberBody`, by the encounter's place): the surgeon is the stand-in's body in a place
  const choice = ctx.choice ?? {};
  for (const need of needs) {
    const recipient = memberBody(c, choice, need.for);
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
  for (const n of scenario?.inform ?? []) out.push(informObligation(c, n, expect, cp, ctx));
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
      recipient: memberBody(c, choice, "surgeon"),
      item: count.item,
      status: result,
      physical,
      verified: result === "met",
      ...(result === "escalated" ? { escalation: { reason: reason ?? "", appropriate: expect.count === "unresolved" } } : {}),
    });
  }
  // by place: the stand-in's operation, closed — or open when the run stopped (failed when it said it could not go on)
  if (ctx.operation) {
    const closed = ctx.operation.closed;
    out.push({ id: "operation", kind: "operation", recipient: memberBody(c, choice, "surgeon"), item: c.procedure?.id ?? "", status: closed ? "met" : ctx.operation.halted ? "failed" : "unfinished", physical: closed, verified: closed });
  }
  return out;
}

/**
 * An information need as an obligation: met when the person who needed it read it back, the circulator confirmed it
 * and the case records it as known to them; the handoff — who asked, who supplied, who received and when — read from
 * the thread's messages; what followed from the clinician's acts after the team.
 */
function informObligation(c: CaseDefinition, n: TeamScenario["inform"][number], expect: TeamRunResult["expect"], cp: TeamCheckpoint, ctx: ScoreContext): TeamObligation {
  const st = cp.state;
  const task = st.tasks.find((x) => x.kind === "inform" && x.need === n.id);
  // whose body is whose (core `memberBody`, by the encounter's place)
  const body = (ref: string) => memberBody(c, ctx.choice ?? {}, ref);
  const recipient = body(n.for);
  const physical = !!task?.relayed && (ctx.known ? ctx.known(n.history) : true);
  const thread = task ? st.messages.filter((m) => m.thread === task.thread) : [];
  const party = (m: (typeof thread)[number] | undefined): HandoffParty | null => (m ? { by: m.from, at: m.at, round: m.round } : null);
  const confirm = thread.findLast((m) => m.kind === "confirm" && m.from === task?.owner);
  const received = confirm ? thread.findLast((m) => m.kind === "readback" && m.from === recipient && m.round <= confirm.round) : undefined;
  const after = ctx.after ?? [];
  const accepted = after.filter((x) => x.accepted);
  const first = accepted[0];
  // each act it held up, tracked on its own
  const blocked = informBlocks(n).map((id): HeldUpAct => {
    const given = accepted.find((x) => x.interventionId === id);
    return { intervention: id, givenAt: given?.at ?? null, afterReceipt: given ? (task?.relayed ? given.at >= task.relayed.at : null) : null };
  });
  const handoff: InformHandoff = {
    ordered: party(thread.find((m) => m.kind === "request" && m.to === body(n.heldBy))),
    performed: party(thread.find((m) => m.kind === "report" && m.from === body(n.heldBy))),
    received: received && task?.relayed ? { by: received.from, at: task.relayed.at, round: received.round } : null,
    next: first ? { action: first.action, by: first.by, at: first.at } : null,
    ...(blocked.length ? { blocked } : {}),
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
  // activated: set up in the world and its work begun (a need noticed, information needed, the count fallen due, by place
  // the operation begun)
  const operating = !!ctx.operation && st.tasks.some((x) => x.kind === "operate");
  const activated = (st.lifecycle ?? "active") !== "pending" && st.round > 0 && (st.posted.length > 0 || (st.informed?.length ?? 0) > 0 || ledger?.dueRound !== undefined || operating || owed.length === 0);
  const completed = activated && owed.every((o) => o.status === "met" || (o.status === "escalated" && !!o.escalation?.appropriate));
  const failures: string[] = [];
  if (!activated) failures.push("invalid: the assigned scenario's work never started");
  const unfinished = owed.filter((o) => o.status === "unfinished");
  if (unfinished.length) failures.push(`unfinished when the run stopped: ${unfinished.map((o) => o.id).join(", ")}`);
  for (const o of owed) {
    if (o.kind === "operation") {
      if (o.status === "failed") failures.push(`operation: the stand-in could not go on (${ctx.operation?.halted ?? ""})`);
      continue;
    }
    if (o.status === "failed") failures.push(`${o.id}: ended without the outcome (${o.physical ? "not verified" : "not in hand"})`);
    if (o.status === "escalated" && !o.escalation?.appropriate) failures.push(`${o.id}: escalated, but the scenario expects it done`);
    if (o.status === "met" && o.kind === "deliver" && expect.delivered === false) failures.push(`${o.id}: delivered, but the scenario expects it escalated`);
    if (o.kind === "inform") {
      const h = o.handoff;
      if (o.status === "met" && expect.informed === false) failures.push(`${o.id}: supplied, but the scenario expects it escalated`);
      if (o.status === "met" && !(h?.ordered && h.performed && h.received)) failures.push(`${o.id}: the record lacks who asked, who supplied it or who received it`);
      if ((o.status === "met" || o.status === "escalated") && !h?.next) failures.push(`${o.id}: nothing was recorded of what the clinician did next`);
      // every act it held up given before the information arrived is an inappropriate progression; once it arrived,
      // one of them (they may be alternatives) is what the clinician went on to
      for (const b of h?.blocked ?? []) if (b.givenAt !== null && b.afterReceipt === false) failures.push(`${o.id}: ${b.intervention} was given before the information arrived (inappropriate progression)`);
      if (o.status === "met" && h?.blocked?.length && h.blocked.every((b) => b.givenAt === null)) failures.push(`${o.id}: ${h.blocked.map((b) => b.intervention).join(" / ")} was never given after the information arrived`);
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
    ...(ctx.operation ? { operation: { closed: ctx.operation.closed, ...(ctx.operation.halted ? { halted: ctx.operation.halted } : {}) } } : {}),
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

/**
 * The cases a run by place takes (`seat`, with the line-up): team cases that offer the place (core `seatsOf`: a team
 * whose surgeon names a stand-in, a member in that position with the line-up) — with a line-up, only those that declare
 * it (core's `seatsOf` reads an unknown one as the base team, whose start the session would then refuse).
 */
export function placeCases(content: Pick<LoadedContent, "cases">, seat: Place, lineup?: string, caseIds?: readonly string[]): CaseDefinition[] {
  return teamCases(content, caseIds).filter((c) => (!lineup || (c.team!.lineups ?? []).some((l) => l.id === lineup)) && seatsOf(c, lineup ? { lineup } : {}).includes(seat));
}

/**
 * Run every team scenario of the cases (optionally only some scenarios). By place (`seat`, optionally `lineup`): the
 * cases that offer it, each scenario that offers it too (`seatsOf` with that scenario) — one whose absences leave the
 * place without its member is `skipped`, saying why. The line-up belongs to a run by place (`clinicalcraft bench team`
 * refuses `--lineup` without `--seat`): the default run takes each case's team as it is.
 */
export async function runTeamBench(content: LoadedContent, opts: { caseIds?: readonly string[]; scenarios?: readonly string[]; locale?: string; seat?: Place; lineup?: string } = {}): Promise<TeamReport> {
  const runs: TeamRunResult[] = [];
  const skipped: NonNullable<TeamReport["skipped"]> = [];
  const seat = opts.seat;
  const cases = seat ? placeCases(content, seat, opts.lineup, opts.caseIds) : teamCases(content, opts.caseIds);
  for (const c of cases) {
    for (const s of c.team!.scenarios) {
      if (opts.scenarios?.length && !opts.scenarios.includes(s.id)) continue;
      if (seat && !seatsOf(c, { ...(opts.lineup ? { lineup: opts.lineup } : {}), teamScenario: s.id }).includes(seat)) {
        skipped.push({ caseId: c.id, scenario: s.id, reason: `the ${t(POSITION_TITLES[seat], "en")}'s place is not offered in this scenario (its member is away)` });
        continue;
      }
      runs.push(await runTeamScenario(content, c, s.id, { ...(opts.locale ? { locale: opts.locale } : {}), ...(seat ? { seat } : {}), ...(opts.lineup ? { lineup: opts.lineup } : {}) }));
    }
  }
  return {
    format: "clinicalcraft-team-report@2",
    ...(seat ? { seat, ...(opts.lineup ? { lineup: opts.lineup } : {}), skipped } : {}),
    runs,
    passed: runs.filter((r) => r.pass).length,
    total: runs.length,
    counts: teamCounts(runs),
  };
}
