/**
 * The stand-in surgeon (docs/TEAM.md §4.5): the operator while the learner holds a place in the team — the team's
 * surgeon member, with a member of staff's body (`standIn`). Pure and deterministic, from its own view (`MemberView`):
 * the same view gives the same proposal, and where the operation has got to is read from the field's own record
 * (`./operator-plan.ts`), never from the team's memory; its requests to the team are `./operator-asks.ts`.
 *
 * Each round, at most one thing:
 * 1. **What was said to it** first, as any surgeon answers (`./surgeon.ts`: a hold on closure read back and the wound
 *    checked, an escalation acknowledged); a read-back of its own request confirmed (check-back step 3) or the request
 *    said again; a colleague's decline taken in; the learner's word after a stop, or after it could not go on.
 * 2. **To the table**: the room, where the world pointed after a refusal, the patient — a walk that leaves it away from
 *    the table counts as a refusal (bounded, like every other).
 * 3. **An injury** the screen shows, or one a colleague said aloud, said aloud by itself (`recognise`) before anything
 *    else — a colleague's word is never the operator's.
 * 4. **A request under way** (one at a time) is seen through: done once the field shows it; a read-back not given within
 *    `waitRounds` asked for once more, then given up; once confirmed, `waitRounds × 3` to be done; given up, it is
 *    withdrawn ("No — not now.") and the stand-in does it itself. A pass is never given up and never done by itself: it
 *    keeps waiting and says what for. A request the field's record has gone past (a team restored older than the
 *    field) is dropped. Requests for one purpose (the camera on a region, closer, wider, a traction) are asked at most
 *    twice; only one given up or declined — or undone twice — makes it do the thing itself (a port taken back first:
 *    never without asking and waiting).
 * 5. **The equipment**: no gas — the abdomen let down, or the gas to begin with — or no picture, it waits and says so;
 *    the gas back after a fault, the abdomen insufflated again; the scope out of the camera port, the camera holder
 *    asked to put it back (else it does). **The field**: obscured, or bile and stones in it — suction (and irrigation
 *    for spillage), the suction put into a working port when none is in.
 * 6. **What its last step hands on** (A17), right after it: after its own scope insert, "Take the camera, please." to the
 *    camera holder (the holder of the camera port, else the present colleague holding the camera control). Then **a
 *    colleague's own step** the reference has before its next (`actor`): asked of them as a request about the field —
 *    the learner's place's too, and waited for —, never taken by the stand-in itself; one no request names is passed
 *    over. And **a step of its own it hands on** (`handed`): a traction on an assist port goes to the traction assistant
 *    (a present colleague other than the camera holder holding `retract`: "Please hold the grasper in port D, pulling
 *    the fundus cephalad.") — read back, confirmed, they take the port and pull: "Holding."; given up, the stand-in takes
 *    the port back and pulls it itself, as its plan step; a hand-over the reference has the operator make goes to whoever
 *    holds the port's control (the camera to the camera holder, a grasper's traction to the traction assistant) — never
 *    to anyone else: one nobody may take, the stand-in keeps.
 * 7. **What the next step needs**: a port a colleague holds — "I'll take port B." / "B 孔我来。", then taken back (the
 *    camera port before the extraction through it too); on tissue, the reference's traction (lost on a port a colleague
 *    holds, or on an assist port while a traction assistant is there: asked of them first; else pulled again itself) and
 *    the camera on the step's region ("Camera on the cystic plate."; held by nobody, it aims it itself); "Closer." before
 *    the safety pause, "Wider." right after it; the instrument the reference has in the port (put back after the
 *    suction); in the scrub nurse's place every instrument asked for ("Maryland, please.") and waited for — never put in
 *    without the pass.
 * 8. **The call-out**, one round before a clip, a division, a coagulation or a bail-out ("Clipping the cystic duct." /
 *    "正在夹闭胆囊管。", `about.callout`); in a supervised approval mode the session asks the learner then (No
 *    objection / Stop). Stopped, it looks at the field (`observe_field`), says "Stopped — tell me what you see." / "停下
 *    了——告诉我你看到了什么。" and waits for the learner's confirmation; then the same step again, its call-out first.
 * 9. **Closure** only once the count is settled. **The step**: the gas through the device that offers it (A11), else the
 *    `operate` tool with its own body; recorded with the plan step's ref.
 * A step the field refuses three times in a row stops it there: it says why ("I can't go on: …") and waits for the
 * learner's word to try again.
 */
import type { FieldView, InstrumentId, ProcedureOp } from "@clinicalcraft/core";
import type { NavGoal } from "@clinicalcraft/world";
import { askText, instrumentWords, theWords } from "./asks.js";
import { CALLOUT_OPS } from "./callout.js";
import { phrase, type Bilingual } from "./i18n.js";
import { askOf, cameraHolder, fieldShows, going, handedAsk, handedIn, here, nextAsk, over, request, requestDone, sameAsk, scrubNurse, stale, stepOfRef, tractionAssistant } from "./operator-asks.js";
import { colleagueSteps, expectedInstruments, expectedTractions, extraRef, extras, furthestDone, instrumentPort, lastOwn, needsPicture, nextStep, planRef, TISSUE_OPS, tractionShown, type Handed, type NextStep } from "./operator-plan.js";
import type { MemberView } from "./policy.js";
import { surgeonAnswer, woundStep } from "./surgeon.js";
import type { FieldAsk, MemberId, PlanStep, Proposal, StandInRequest, TaskPatch, TeamMessage, TeamTask } from "./types.js";

const TERMINAL = new Set(["done", "declined", "escalated"]);
const plain = (text: string): Bilingual => ({ en: text, "zh-CN": text });

/** Refusals of one step in a row before the stand-in stops there and asks the learner for their word. */
const MAX_TRIES = 3;
/** The most extra steps of a kind for one plan step (a port taken back, the camera worked, an instrument put back…). */
const BOUND: Readonly<Record<string, number>> = { take: 3, aim: 2, zoom: 2, recognise: 3, suction: 2, irrigate: 1, insert: 3, retract: 2, insufflate: 3 };

/** The ports a step works on, which a colleague's hold on gets in the way (taken back first). */
const PORT_STEPS: ReadonlySet<ProcedureOp["op"]> = new Set(["insert", "withdraw", "retract", "dissect", "isolate", "clip", "divide", "coagulate", "suction", "irrigate", "image", "bag", "extract"]);

/** The states in which it waits on the learner's word for a plan step: stopped by them, or unable to go on. */
const HALTED = /^(denied|inspected|stopped|cannot):(\d+)$/u;

/** How a step of the stand-in's went (`TeamHost.operate`, a device's operation, a walk): with its ref, and whether the learner said Stop. */
export interface StandInOutcome {
  status: string;
  code?: string;
  message: string;
  hint?: NavGoal;
  reason?: Bilingual;
  /** The step's approval was denied by the learner (the call-out answered Stop). */
  byLearner?: boolean;
  /** The ref the step was taken under (a walk has none). */
  ref?: string;
  /** A walk's goal (where it went). */
  goal?: NavGoal;
}

/** The stand-in's plan task (one per encounter). */
function planTask(tasks: readonly TeamTask[]): TeamTask | undefined {
  return tasks.find((t) => t.kind === "operate");
}

/** The plan task, made the first time (`created`: the patch that makes it, said with the first proposal). */
function ensureTask(v: MemberView): { task: TeamTask; created: TaskPatch[] } {
  const own = planTask(v.tasks);
  if (own) return { task: own, created: [] };
  const task: TeamTask = { id: v.newId("task"), kind: "operate", need: "operate", item: "", for: v.me.id, owner: v.me.id, initiator: v.me.id, thread: v.newId("thread"), status: "accepted", since: v.round, tried: [], acts: 0, cursor: 0 };
  return { task, created: [{ create: task }] };
}

/** A step in the field under the plan task, recorded with `ref`. */
function step(task: TeamTask, op: ProcedureOp, ref: string, k: number, set: Partial<TeamTask> = {}): Proposal {
  return { kind: "operate", task: task.id, op, ref, patch: [{ id: task.id, set: { ...going(task), cursor: k, ...set } }] };
}

/** Said to whoever it concerns (a notice: nothing owed). */
function notice(task: TeamTask, to: MemberId, text: Bilingual, set: Partial<TeamTask> = {}, about: TeamMessage["about"] = {}): Proposal {
  return { kind: "say", to, message: { thread: task.thread, kind: "notice", text, about, evidence: [] }, patch: Object.keys(set).length ? [{ id: task.id, set }] : [] };
}

/** Waiting for something, said once to the learner (`code`: what for; said again only when it changes). */
function waitFor(v: MemberView, task: TeamTask, code: string, text: Bilingual): Proposal | null {
  if (task.reason === code) return null;
  return notice(task, v.learner, text, { status: "waiting", reason: code, reasonText: text, since: v.round });
}

/** A field step of the operation the camera works with (an aim or a zoom) — the stand-in's own on a camera port nobody holds. */
type CameraOp = Extract<ProcedureOp, { op: "aim" | "zoom" }>;

/**
 * The colleagues' own steps the reference has before the stand-in's next (`colleagueSteps`, A3), and the steps of its
 * own it hands on: each asked of whose it is — the learner too, when it is their place's: then waited for — and seen
 * through like any request; one nobody is there to do, one no request names, one the field shows done already, is
 * passed over. The stand-in never takes a colleague's own step: it goes on once the field shows it done or it gave up
 * waiting, and what its next step needs then (a traction gone) it sees to itself. A step of its own it handed on and
 * gave up waiting for (or was declined) it takes back as its own plan step: the port taken back, then pulled.
 */
function colleagueStep(v: MemberView, plan: readonly PlanStep[], task: TeamTask, next: NextStep | null, handed: Handed): Part {
  const f = v.field;
  if (!f) return undefined;
  const asked = new Set(task.requested ?? []);
  const undone = new Set(task.undone ?? []);
  for (const x of colleagueSteps(plan, v.refs, next?.step ?? null, handed)) {
    const key = `step:${x.k}`;
    if (x.actor === undefined) {
      const h = handedAsk(v, f, x);
      if (asked.has(key)) {
        if (h !== "keep" && undone.has(key)) {
          const own = takeOwn(v, task, f, x);
          if (own) return own;
        }
        continue;
      }
      if (!h || h === "keep" || fieldShows(v, h.ask, h.to)) return { kind: "update", patch: [{ id: task.id, set: over(v, task, key) }] };
      return request(v, task, h.to, h.ask, key);
    }
    if (asked.has(key)) continue;
    const who = v.bodyOf(x.actor);
    const ask = askOf(f, x, (ref) => v.bodyOf(ref) === v.me.id);
    const there = who !== v.me.id && v.colleagues.some((c) => c.id === who && here(c));
    if (!ask || !there || fieldShows(v, ask, who)) return { kind: "update", patch: [{ id: task.id, set: over(v, task, key) }] };
    return request(v, task, who, ask, key);
  }
  return undefined;
}

/** A step of its own it handed on and did not get: the port taken back from whoever holds it, then the step as its plan step. */
function takeOwn(v: MemberView, task: TeamTask, f: FieldView, x: PlanStep): Proposal | undefined {
  const op = x.op;
  if (op.op !== "retract") return undefined;
  const p = f.ports.find((q) => q.port === op.port);
  if (p?.holder !== undefined) return takeBack(v, task, p.port, p.holder, x.k);
  return step(task, op, planRef(x.k), x.k);
}

/**
 * The request under way: done, declined, waited for, asked again, given up (withdrawn: "No — not now."). A pass is never
 * given up: the stand-in keeps waiting for it and says what for.
 */
function requestStep(v: MemberView, task: TeamTask, req: StandInRequest): Proposal | null {
  if (req.key.startsWith("stop:") || req.key.startsWith("cannot:")) return null;
  if (requestDone(v, req)) return { kind: "update", patch: [{ id: task.id, set: over(v, task, req.key) }] };
  const pass = req.field?.op === "pass";
  const waitPass = () => waitFor(v, task, `pass:${req.field?.instrument ?? ""}`, phrase("standin.wait.pass", { instrument: instrumentWords(req.field?.instrument ?? "") }));
  if (req.declined && !pass) return { kind: "update", patch: [{ id: task.id, set: over(v, task, req.key, true) }] };
  const waited = v.round - req.since;
  if (!req.confirmed || req.declined) {
    if (waited < v.waitRounds) return null;
    if (req.times < 2 && req.field) {
      // said once more, in the same thread
      return { kind: "say", to: req.to, message: { thread: req.thread, kind: "request", text: askText(v, req.field, req.to), about: { field: structuredClone(req.field) }, evidence: [] }, patch: [{ id: task.id, set: { request: { ...req, times: req.times + 1, since: v.round, declined: false } } }] };
    }
  } else if (waited < v.waitRounds * 3) return null;
  if (pass) return waitPass();
  // given up: withdrawn, said in its thread — the stand-in does it itself
  return { kind: "say", to: req.to, message: { thread: req.thread, kind: "decline", text: phrase("reply.decline"), about: req.field ? { field: structuredClone(req.field) } : {}, evidence: [] }, patch: [{ id: task.id, set: over(v, task, req.key, true) }] };
}

/** Put an instrument into a port: in the scrub nurse's place only once it is passed (asked for, never forged). */
function insert(v: MemberView, task: TeamTask, port: string, instrument: InstrumentId, ref: string, k: number): Proposal | null {
  const f = v.field;
  const passed = (f?.passed ?? []).some((q) => q.instrument === instrument && q.to === undefined);
  if (v.passingRequired && !passed) return passFor(v, task, instrument, ref);
  return step(task, { op: "insert", port, instrument }, ref, k);
}

/** "<instrument>, please." to the scrub nurse, then waited for (asked again whenever none is waiting); nobody to ask: waiting, said once. */
function passFor(v: MemberView, task: TeamTask, instrument: InstrumentId, ref: string): Proposal | null {
  const nurse = scrubNurse(v);
  if (!nurse) return waitFor(v, task, `pass:${instrument}`, phrase("standin.wait.pass", { instrument: instrumentWords(instrument) }));
  return request(v, task, nurse, { op: "pass", instrument }, `pass:${ref}`);
}

/**
 * What a part of a round makes of the plan step: a proposal; `null` — waiting (the round ends with nothing done);
 * `undefined` — nothing needed here (the round goes on to the next part).
 */
type Part = Proposal | null | undefined;

/** "I'll take port P." said to whoever holds it, then the port taken back (undefined: taken back as often as it may be). */
function takeBack(v: MemberView, task: TeamTask, port: string, holder: string, k: number): Proposal | undefined {
  const n = extras(v.refs, k, "take");
  if (n >= BOUND.take!) return undefined;
  const said = `take:${port}:${k}`;
  if (task.step !== said) return notice(task, v.bodyOf(holder), phrase("standin.take", { port: plain(port) }), { step: said });
  return step(task, { op: "hand-over", port }, extraRef(k, "take", n + 1), k, { step: undefined });
}

/**
 * A camera step for plan step `k`: asked of the colleague holding the camera (at most twice, `nextAsk`), the port taken
 * back only once that came to nothing; a camera port nobody holds, the operator's own step.
 */
function cameraStep(v: MemberView, task: TeamTask, f: FieldView, k: number, ask: FieldAsk, base: string, own: CameraOp): Proposal | undefined {
  const camera = f.camera!;
  if (camera.holder !== undefined) {
    const next = nextAsk(task, base);
    if ("ask" in next) return request(v, task, v.bodyOf(camera.holder), ask, next.ask);
    return takeBack(v, task, camera.port, camera.holder, k);
  }
  const n = extras(v.refs, k, own.op);
  if (n >= (BOUND[own.op] ?? 2)) return undefined;
  return step(task, own, extraRef(k, own.op, n + 1), k);
}

/** The call-out of a critical step, in both languages (the structure named as the operator identified it, else its handle). */
function calloutText(v: MemberView, op: ProcedureOp): Bilingual {
  if (op.op === "bailout") return phrase("callout.bailout", { strategy: phrase(`clause.bailout.${op.strategy}`) });
  const handle = "handle" in op ? op.handle : "";
  const named = v.field?.tubes.find((t) => t.handle === handle)?.namedAs;
  const label = named ? v.label(named) : null;
  const structure = label && label.en !== named ? theWords(label) : plain(handle);
  return phrase(`callout.${op.op as "clip" | "divide" | "coagulate"}`, { structure });
}

/** What the call-out is about (`about.callout`): the step and its handle — a bail-out's strategy. */
function calloutOf(op: ProcedureOp): { op: ProcedureOp["op"]; handle: string } {
  return { op: op.op, handle: op.op === "bailout" ? op.strategy : "handle" in op ? op.handle : "" };
}

/**
 * Waiting on the learner's word for a plan step: stopped by them — the field looked at, "Stopped — tell me what you
 * see.", then waiting —, or unable to go on (said when it stopped). The record past that step (a team restored older than
 * the field): the wait is over.
 */
function haltStep(v: MemberView, plan: readonly PlanStep[], task: TeamTask): Part {
  const halted = HALTED.exec(task.step ?? "");
  if (!halted) return undefined;
  const [, state, at] = halted;
  const k = Number(at);
  if (furthestDone(plan, new Set(v.refs)) >= k) return { kind: "update", patch: [{ id: task.id, set: { ...going(task), step: undefined, request: undefined, since: v.round } }] };
  if (state === "denied") return { kind: "observe", task: task.id, patch: [{ id: task.id, set: { step: `inspected:${k}`, since: v.round } }] };
  if (state === "inspected") {
    const op = plan.find((x) => x.k === k)?.op;
    const thread = v.newId("thread");
    const open: StandInRequest = { key: `stop:${k}`, to: v.learner, thread, times: 1, since: v.round };
    return {
      kind: "say",
      to: v.learner,
      message: { thread, kind: "request", text: phrase("standin.stopped"), about: op ? { callout: calloutOf(op) } : {}, evidence: [] },
      patch: [{ id: task.id, set: { step: `stopped:${k}`, status: "waiting", since: v.round, request: open } }],
    };
  }
  return null;
}

/** To the room, where the world pointed after a refusal, and the operating table. */
function walkStep(v: MemberView, task: TeamTask): Proposal | null {
  if (!v.me.inRoom) return { kind: "act", task: task.id, operation: "navigate", goal: { kind: "room", id: v.room } };
  if (task.goal) return { kind: "act", task: task.id, operation: "navigate", goal: task.goal, patch: [{ id: task.id, set: { goal: undefined } }] };
  if (!v.atTable && v.patient) return { kind: "act", task: task.id, operation: "navigate", goal: { kind: "interact", id: v.patient } };
  return null;
}

/** An injury the screen shows or a colleague said aloud, not yet said by the operator: said aloud now. */
function recogniseStep(v: MemberView, task: TeamTask, k: number): Proposal | null {
  const open = v.injuries.find((i) => !i.recognised);
  const n = extras(v.refs, k, "recognise");
  if (!open || n >= BOUND.recognise!) return null;
  return step(task, { op: "recognise", injury: open.kind }, extraRef(k, "recognise", n + 1), k);
}

/**
 * The equipment: no gas — for the gas itself, or for a step that needs the picture while the abdomen is let down — or no
 * picture: waiting, said once; the gas back after a fault: the abdomen insufflated again; the scope out of the camera
 * port the reference has it in: the camera holder asked to put it back (`scope:<k>`), else — given up, nobody to ask —
 * put back by the stand-in itself (in the scrub nurse's place, passed first).
 */
function supplyStep(v: MemberView, plan: readonly PlanStep[], task: TeamTask, next: NextStep): Part {
  const f = v.field;
  const op = next.step.op;
  const k = next.step.k;
  if (!f) return undefined;
  const picture = needsPicture(op);
  if (!f.supply.gas && (op.op === "insufflate" || (picture && !f.insufflated))) return waitFor(v, task, "no-gas", phrase("standin.wait.gas"));
  if (!picture) return undefined;
  if (!f.supply.image) return waitFor(v, task, "no-picture", phrase("standin.wait.picture"));
  const gas = lastOwn(plan, k, (x) => x.op === "insufflate");
  const again = extras(v.refs, k, "insufflate");
  if (!f.insufflated && gas && gas.op.op === "insufflate" && again < BOUND.insufflate!) {
    return gasStep(v, task, { op: "insufflate", pressure: gas.op.pressure }, extraRef(k, "insufflate", again + 1), k);
  }
  if (!f.ports.some((p) => p.instrument === "laparoscope")) {
    const port = [...expectedInstruments(plan, k)].find(([, instrument]) => instrument === "laparoscope")?.[0];
    const empty = port ? f.ports.find((p) => p.port === port && !p.instrument) : undefined;
    if (empty) {
      const holder = cameraHolder(v, f);
      if (holder && holder !== v.me.id) {
        const ask = nextAsk(task, `scope:${k}`);
        if ("ask" in ask) return request(v, task, holder, { op: "camera", port: empty.port }, ask.ask);
      }
      const n = extras(v.refs, k, "insert");
      if (n < BOUND.insert!) return insert(v, task, empty.port, "laparoscope", extraRef(k, "insert", n + 1), k);
    }
  }
  return undefined;
}

/**
 * The gas through the device that offers it now (the tower: A11), with its own body; at the table when none does — or
 * when the device refused the step (out of the patient's reach, say: `failed` holds the step's ref).
 */
function gasStep(v: MemberView, task: TeamTask, op: ProcedureOp, ref: string, k: number): Proposal {
  const device = (op.op === "insufflate" || op.op === "desufflate") && task.failed?.ref !== ref ? v.gasControl(op.op) : null;
  if (!device) return step(task, op, ref, k);
  const parameters = { ...(device.parameters ?? {}), ...(op.op === "insufflate" ? { pressure: op.pressure } : {}) };
  return { kind: "act", task: task.id, operation: device.operation, targetId: device.id, ...(Object.keys(parameters).length ? { parameters } : {}), ref, patch: [{ id: task.id, set: { ...going(task), cursor: k } }] };
}

/** The port the suction goes into when none of the operator's holds it: the next step's working port, else the right hand's. */
function suctionPort(f: FieldView, next: NextStep): string | null {
  const mine = f.ports.filter((p) => p.role === "working" && p.holder === undefined);
  const wanted = instrumentPort(next.step.op);
  return (mine.find((p) => p.port === wanted) ?? mine.find((p) => p.hand === "right") ?? mine[0])?.port ?? null;
}

/** The field obscured, or bile and stones in it: suction (irrigation first for spillage), the suction put in when none is. */
function fieldStep(v: MemberView, task: TeamTask, next: NextStep): Part {
  const f = v.field;
  if (!f) return undefined;
  const obscured = f.findings.includes("field-obscured");
  const spill = f.findings.includes("bile") || f.findings.includes("stones");
  const k = next.step.k;
  const n = extras(v.refs, k, "suction");
  if ((!obscured && !spill) || n >= BOUND.suction!) return undefined;
  const port = f.ports.find((p) => p.instrument === "suction" && p.holder === undefined);
  if (port) {
    if (spill && !obscured && extras(v.refs, k, "irrigate") < BOUND.irrigate!) return step(task, { op: "irrigate", port: port.port }, extraRef(k, "irrigate", 1), k);
    return step(task, { op: "suction", port: port.port }, extraRef(k, "suction", n + 1), k);
  }
  const into = suctionPort(f, next);
  const m = extras(v.refs, k, "insert");
  if (!into || m >= BOUND.insert!) return undefined;
  return insert(v, task, into, "suction", extraRef(k, "insert", m + 1), k);
}

/**
 * What its last step hands on (A17), right after it: the camera after its own scope insert, to the camera holder —
 * asked once, then the stand-in carries on either way (and never again once the plan has moved on: a port it takes back
 * later stays its own).
 */
function handOnStep(v: MemberView, plan: readonly PlanStep[], task: TeamTask, next: NextStep): Part {
  const f = v.field;
  if (!f) return undefined;
  const k = next.step.k;
  const last = lastOwn(plan, k, () => true);
  const scope = last?.op.op === "insert" && last.op.instrument === "laparoscope" ? last : null;
  if (scope && !(task.requested ?? []).includes(`camera:${scope.k}`)) {
    const port = f.ports.find((p) => p.role === "camera" && p.instrument === "laparoscope" && p.holder === undefined);
    const holder = cameraHolder(v, f);
    if (port && holder) return request(v, task, holder, { op: "camera", port: port.port }, `camera:${scope.k}`);
  }
  return undefined;
}

/**
 * What the next step needs (in order): a port a colleague holds, taken back; on tissue, the reference's traction kept
 * — lost on a port a colleague holds, or on an assist port while a traction assistant is there, asked of them first
 * (`exposure:<k>`), else pulled again itself — and the camera on the region; the camera close before the safety pause
 * and wide right after it; the instrument the reference has in the port; in the scrub nurse's place, the pass for an
 * insert.
 */
function prepareStep(v: MemberView, plan: readonly PlanStep[], task: TeamTask, next: NextStep): Part {
  const f = v.field;
  const op = next.step.op;
  const k = next.step.k;
  if (!f) return undefined;
  // a port a colleague holds that the step works on: taken back (the camera port before the extraction through it too)
  const port = PORT_STEPS.has(op.op) && "port" in op ? f.ports.find((p) => p.port === op.port) : undefined;
  if (port?.holder !== undefined) {
    const p = takeBack(v, task, port.port, port.holder, k);
    if (p) return p;
  }
  // the instrument the reference has in the port (an exchange undone, the suction put back)
  const ip = instrumentPort(op);
  const want = ip ? expectedInstruments(plan, k).get(ip) : undefined;
  const has = ip ? f.ports.find((p) => p.port === ip) : undefined;
  if (ip && want && has && has.holder === undefined && has.instrument !== want) {
    const n = extras(v.refs, k, "insert");
    if (n < BOUND.insert!) return insert(v, task, ip, want, extraRef(k, "insert", n + 1), k);
  }
  if (TISSUE_OPS.has(op.op)) {
    // exposure: a traction of the reference's gone — asked of whoever holds its port (or, on an assist port the operator
    // holds, of the traction assistant); given up, nobody to ask: the port taken back if a colleague holds it, then
    // pulled again by the operator
    const lost = expectedTractions(plan, k).find((t) => !tractionShown(f, t));
    if (lost) {
      const q = f.ports.find((p) => p.port === lost.port);
      const asked = q?.holder !== undefined ? v.bodyOf(q.holder) : q?.role === "assist" && q.instrument === "grasper" ? tractionAssistant(v, f) : null;
      if (asked && asked !== v.me.id) {
        const ask = nextAsk(task, `exposure:${k}`);
        if ("ask" in ask) return request(v, task, asked, { op: "traction", port: lost.port, structure: lost.structure, direction: lost.direction, force: lost.force }, ask.ask);
      }
      const n = extras(v.refs, k, "retract");
      if (n < BOUND.retract!) {
        if (q?.holder !== undefined) {
          const p = takeBack(v, task, q.port, q.holder, k);
          if (p) return p;
        } else if (q?.instrument) return step(task, { op: "retract", port: lost.port, structure: lost.structure, direction: lost.direction, force: lost.force }, extraRef(k, "retract", n + 1), k);
      }
    }
    // the camera on the region worked (an aimed camera elsewhere: the work would be off the picture)
    const region = op.op === "dissect" ? op.region : "handle" in op ? v.where(op.handle) : null;
    if (region && f.camera && f.camera.at !== null && f.camera.at !== region) {
      const p = cameraStep(v, task, f, k, { op: "aim", region }, `aim:${k}`, { op: "aim", port: f.camera.port, at: region });
      if (p) return p;
    }
  }
  // closer before the safety pause (aimed first when it looks at the whole field)
  if (op.op === "safety-pause" && f.camera && f.camera.zoom !== "close") {
    const at = f.camera.at ?? f.working ?? null;
    if (at) {
      const ask: FieldAsk = f.camera.at ? { op: "zoom", zoom: "close" } : { op: "aim", region: at, zoom: "close" };
      const own: CameraOp = f.camera.at ? { op: "zoom", port: f.camera.port, level: "close" } : { op: "aim", port: f.camera.port, at };
      const p = cameraStep(v, task, f, k, ask, `closer:${k}`, own);
      if (p) return p;
    }
  }
  // wider right after it (its next own step): a close view later on is the camera holder's to keep
  const last = lastOwn(plan, k, () => true);
  if (last?.op.op === "safety-pause" && f.camera?.zoom === "close") {
    const p = cameraStep(v, task, f, k, { op: "zoom", zoom: "wide" }, `wider:${last.k}`, { op: "zoom", port: f.camera.port, level: "wide" });
    if (p) return p;
  }
  // in the scrub nurse's place, the reference's own insert waits for its pass (asked for in `doStep`)
  return undefined;
}

/** The step itself: closure once the count is settled; the call-out one round before a critical step; the gas through its device. */
function doStep(v: MemberView, task: TeamTask, next: NextStep): Proposal | null {
  const op = next.step.op;
  const k = next.step.k;
  if (op.op === "close" && v.countSettled === false) return waitFor(v, task, "count", phrase("standin.wait.count"));
  if (CALLOUT_OPS.includes(op.op) && task.step !== `callout:${k}`) {
    return notice(task, v.learner, calloutText(v, op), { ...going(task), step: `callout:${k}` }, { callout: calloutOf(op) });
  }
  if (op.op === "insert") return insert(v, task, op.port, op.instrument, next.ref, k);
  if (op.op === "insufflate" || op.op === "desufflate") return gasStep(v, task, op, next.ref, k);
  return step(task, op, next.ref, k);
}

/** The plan done: the task ends. */
function finished(v: MemberView, task: TeamTask): Proposal {
  return { kind: "update", patch: [{ id: task.id, set: { status: "done", since: v.round, request: undefined, reason: undefined, reasonText: undefined } }] };
}

/** One round of the plan (null: waiting). */
function decide(v: MemberView, plan: readonly PlanStep[], task: TeamTask): Proposal | null {
  // a request the record has gone past (a team restored older than the field) is over
  if (task.request && stale(plan, v.refs, task.request.key)) {
    return { kind: "update", patch: [{ id: task.id, set: { ...over(v, task, task.request.key), ...(HALTED.test(task.step ?? "") ? { step: undefined } : {}) } }] };
  }
  const halt = haltStep(v, plan, task);
  if (halt !== undefined) return halt;
  const walk = walkStep(v, task);
  if (walk) return walk;
  const handed = handedIn(v);
  const next = nextStep(plan, v.refs, v.field, handed);
  // an injury in sight is said aloud before anything else of the operation (none once its plan is done)
  const seen = next ? recogniseStep(v, task, next.step.k) : null;
  if (seen) return seen;
  if (task.request) return requestStep(v, task, task.request);
  // the plan done: a colleague's own step the reference ends with asked for first
  if (!next) return colleagueStep(v, plan, task, null, handed) ?? finished(v, task);
  // the field's first step is taken before anything is on the screen (the port plan); every other needs it in sight
  if (!v.field && next.step.op.op !== "plan-ports") return null;
  // in order, each looked at only when the ones before it need nothing (no id given out for a request not made)
  const parts: (() => Part)[] = [
    () => supplyStep(v, plan, task, next),
    () => fieldStep(v, task, next),
    () => handOnStep(v, plan, task, next),
    () => colleagueStep(v, plan, task, next, handed),
    () => prepareStep(v, plan, task, next),
  ];
  for (const part of parts) {
    const p = part();
    if (p !== undefined) return p;
  }
  return doStep(v, task, next);
}

/**
 * What was said to the stand-in: a hold on closure and an escalation as any surgeon answers them; in the thread of its own
 * request, a read-back confirmed when it says what was asked (else the request said again), a decline taken in; after a
 * stop, or once it could not go on, the learner's confirmation — carrying on; anything else taken in.
 */
function answer(v: MemberView, m: TeamMessage): Proposal {
  const surgeon = surgeonAnswer(v, m);
  if (surgeon) return surgeon;
  const read: TaskPatch = { read: m.id };
  const task = planTask(v.tasks);
  const req = task?.request;
  if (task && req && m.thread === req.thread && m.from === req.to) {
    if (req.key.startsWith("stop:") || req.key.startsWith("cannot:")) {
      if (m.kind !== "confirm") return { kind: "update", patch: [read] };
      return { kind: "update", patch: [read, { id: task.id, set: { request: undefined, step: undefined, failed: undefined, status: "accepted", since: v.round, reason: undefined, reasonText: undefined } }] };
    }
    if (m.kind === "readback" && !req.confirmed && req.field) {
      if (sameAsk(m.about.field, req.field)) {
        return { kind: "say", to: m.from, message: { thread: req.thread, kind: "confirm", text: phrase("reply.confirm"), about: { field: structuredClone(req.field) }, evidence: [], replyTo: m.id }, patch: [read, { id: task.id, set: { request: { ...req, confirmed: true, since: v.round } } }] };
      }
      return { kind: "say", to: m.from, message: { thread: req.thread, kind: "request", text: askText(v, req.field, m.from), about: { field: structuredClone(req.field) }, evidence: [], replyTo: m.id }, patch: [read, { id: task.id, set: { request: { ...req, times: req.times + 1, since: v.round } } }] };
    }
    if (m.kind === "decline") return { kind: "update", patch: [read, { id: task.id, set: { request: { ...req, declined: true, since: v.round } } }] };
  }
  return { kind: "update", patch: [read] };
}

/** The stand-in surgeon's next step (null: nothing now) — see the module docs. */
export function operator(v: MemberView): Proposal | null {
  const first = v.inbox[0];
  if (first) return answer(v, first);
  const wound = woundStep(v);
  if (wound) return wound;
  const { task, created } = ensureTask(v);
  if (TERMINAL.has(task.status)) return null;
  const p = decide(v, v.plan ?? [], task);
  if (!p) return created.length ? { kind: "update", patch: created } : null;
  return created.length ? ({ ...p, patch: [...created, ...(p.patch ?? [])] } as Proposal) : p;
}

/** A refusal in words, without its full stop: the field's reason in both languages when it gave one, else the first line said. */
function refusalWords(outcome: StandInOutcome): Bilingual {
  const bare = (text: string) => text.replace(/[.。]\s*$/u, "");
  if (outcome.reason) return { en: bare(outcome.reason.en), "zh-CN": bare(outcome.reason["zh-CN"]) };
  return plain(bare(outcome.message.split("\n")[0] ?? ""));
}

/**
 * After a step of the stand-in's (in the field, through a device, or a walk): done — what it waited on forgotten (a walk
 * to the patient that left it away from the table counts as refused); the learner said Stop to its call-out — it stops
 * (`denied:<k>`, then looks and asks, `haltStep`); refused for reach or sight — where the world points; refused otherwise
 * — tried again once what it needs is secured, and after three refusals in a row it stops there and says why, then waits
 * for the learner's word to try again (`cannot:<k>`: a request to them, answered by their confirmation).
 */
export function afterStandIn(v: MemberView, task: TeamTask, outcome: StandInOutcome): Proposal | null {
  if (task.kind !== "operate" || TERMINAL.has(task.status)) return null;
  const ref = outcome.ref ?? "walk";
  const awayFromTable = outcome.status === "completed" && outcome.ref === undefined && outcome.goal?.kind === "interact" && outcome.goal.id === v.patient && !v.atTable;
  if (outcome.status === "completed" && !awayFromTable) {
    const set: Partial<TeamTask> = {};
    if (task.failed) set.failed = undefined;
    // a step of the field done: what was said for it (its call-out, "I'll take port P.") is spent — never the halts' own states
    if (outcome.ref && task.step && !HALTED.test(task.step)) set.step = undefined;
    return Object.keys(set).length ? { kind: "update", patch: [{ id: task.id, set }] } : null;
  }
  if (outcome.status === "cancelled") return null;
  if (outcome.code === "DENIED" && outcome.byLearner) {
    return { kind: "update", patch: [{ id: task.id, set: { step: `denied:${stepOfRef(outcome.ref) ?? task.cursor ?? 0}`, status: "waiting", since: v.round, failed: undefined } }] };
  }
  if (outcome.hint) return { kind: "update", patch: [{ id: task.id, set: { goal: outcome.hint } }] };
  const times = task.failed?.ref === ref ? task.failed.times + 1 : 1;
  const code = awayFromTable ? "NOT_AT_TABLE" : outcome.code;
  const failed = { ref, times, ...(code ? { code } : {}) };
  if (times < MAX_TRIES) return { kind: "update", patch: [{ id: task.id, set: { failed } }] };
  // it stops there and says why — then waits for the learner's word (their confirmation) to try again (a walk: for the
  // plan step it was walking to)
  const k = stepOfRef(outcome.ref) ?? nextStep(v.plan ?? [], v.refs, v.field, handedIn(v))?.step.k ?? task.cursor ?? 0;
  const text = phrase("standin.cannot", { reason: awayFromTable ? phrase("standin.reason.table") : refusalWords(outcome) });
  const thread = v.newId("thread");
  const open: StandInRequest = { key: `cannot:${k}`, to: v.learner, thread, times: 1, since: v.round };
  return {
    kind: "say",
    to: v.learner,
    message: { thread, kind: "escalate", text, about: {}, evidence: [] },
    patch: [{ id: task.id, set: { status: "waiting", step: `cannot:${k}`, since: v.round, failed, reason: code ?? "failed", reasonText: text, request: open } }],
  };
}
