/**
 * The stand-in surgeon's requests to the team (docs/TEAM.md §4.5), for its policy (`./operator.ts`): whom it asks by
 * control — the camera holder, the traction assistant, the scrub nurse —, a request made and ended (seen through, or
 * not done: `undone`), a purpose asked at most twice (`nextAsk`), what the screen shows once a request is done, a request
 * the field's record has gone past (`stale`), and the reference's steps that are requests — a colleague's own step
 * (`askOf`), a step of its own it hands on (`handedAsk`). Pure: from the stand-in's own view.
 */
import type { DirectionName, FieldView } from "@clinicalcraft/core";
import { askText } from "./asks.js";
import { directionNames, furthestDone, tractionShown, type Handed } from "./operator-plan.js";
import type { ColleagueView, MemberView } from "./policy.js";
import type { FieldAsk, MemberId, PlanStep, Proposal, StandInRequest, TeamTask } from "./types.js";

/** How often a request for one purpose is asked before the stand-in does the thing itself. */
const ASKS = 2;

/** Requests asked after the plan step they name (the camera after its scope insert, wider after the pause): over once a later one is done. */
const ASKED_AFTER: ReadonlySet<string> = new Set(["camera", "wider"]);

/** Waiting no more: the task under way again (what it was waiting for, forgotten). */
export function going(task: TeamTask): Partial<TeamTask> {
  return task.status === "accepted" && task.reason === undefined ? {} : { status: "accepted", reason: undefined, reasonText: undefined };
}

/** The plan step a ref is for (`standin:<k>…`), or null. */
export function stepOfRef(ref: string | undefined): number | null {
  const k = Number(ref?.split(":")[1]);
  return ref?.startsWith("standin:") && Number.isInteger(k) ? k : null;
}

const holds = (c: ColleagueView, control: "camera" | "retract" | "instruments"): boolean => c.controls === "all" || (c.controls ?? []).includes(control);
export const here = (c: ColleagueView): boolean => c.present && !c.absent;

/** The camera holder (docs/GLOSSARY.md): the colleague holding the camera port with the scope in it, else the present colleague holding the camera control. */
export function cameraHolder(v: MemberView, f: FieldView): MemberId | null {
  if (f.camera?.holder !== undefined) return v.bodyOf(f.camera.holder);
  return v.colleagues.find((c) => here(c) && c.id !== v.me.id && holds(c, "camera"))?.id ?? null;
}

/** The traction assistant (docs/TEAM.md §4.5): a present colleague other than the camera holder, holding `retract`. */
export function tractionAssistant(v: MemberView, f: FieldView): MemberId | null {
  const camera = cameraHolder(v, f);
  return v.colleagues.find((c) => here(c) && c.id !== v.me.id && c.id !== camera && holds(c, "retract"))?.id ?? null;
}

/** The scrub nurse in the room: the present colleague holding the instrument table. */
export function scrubNurse(v: MemberView): MemberId | null {
  return v.colleagues.find((c) => here(c) && c.id !== v.me.id && holds(c, "instruments"))?.id ?? null;
}

/** Two requests about the field are the same request (a read-back is about what was asked). */
export function sameAsk(a: FieldAsk | undefined, b: FieldAsk | undefined): boolean {
  if (!a || !b) return false;
  const key = (x: FieldAsk) => JSON.stringify([x.op, x.port ?? null, x.structure ?? null, [...(x.direction ?? [])].sort(), x.force ?? null, x.region ?? null, x.zoom ?? null, x.instrument ?? null]);
  return key(a) === key(b);
}

/** A request about the field said to a colleague (`key`: what it is for), its thread its own. */
export function request(v: MemberView, task: TeamTask, to: MemberId, field: FieldAsk, key: string): Proposal {
  const thread = v.newId("thread");
  const open: StandInRequest = { key, to, field: structuredClone(field), thread, times: 1, since: v.round };
  return { kind: "say", to, message: { thread, kind: "request", text: askText(v, field, to), about: { field: structuredClone(field) }, evidence: [] }, patch: [{ id: task.id, set: { ...going(task), request: open } }] };
}

/**
 * The request over — seen through, declined or given up (`undone`: not done — the stand-in then does it itself) —, or
 * dropped: never made again.
 */
export function over(v: MemberView, task: TeamTask, key: string, undone = false): Partial<TeamTask> {
  return { ...going(task), request: undefined, requested: [...(task.requested ?? []), key], ...(undone ? { undone: [...(task.undone ?? []), key] } : {}), since: v.round };
}

/**
 * The request to make now for one purpose (`base`: `aim:<k>`, `closer:<k>`, `wider:<k>`, `exposure:<k>`, `scope:<k>`),
 * asked at most twice (`<base>`, then `<base>#2`): the first not asked yet — once the one before it was seen through and
 * then undone —, or `self`: one was given up or declined, or both were undone again — the stand-in does it itself.
 */
export function nextAsk(task: TeamTask, base: string): { ask: string } | { self: true } {
  const ended = new Set(task.requested ?? []);
  const undone = new Set(task.undone ?? []);
  for (let n = 1; n <= ASKS; n++) {
    const key = n === 1 ? base : `${base}#${n}`;
    if (!ended.has(key)) return { ask: key };
    if (undone.has(key)) return { self: true };
  }
  return { self: true };
}

/**
 * What the screen shows once a request said to `to` is done: the camera in their hands; an aim — the camera on that
 * region, as close as asked (a follow aim elsewhere never counts); the zoom; their traction as asked; the port let go;
 * the instrument passed to the operator.
 */
export function fieldShows(v: MemberView, ask: FieldAsk, to: MemberId): boolean {
  const f = v.field;
  if (!f) return false;
  const ref = v.refOf(to);
  switch (ask.op) {
    case "camera":
      return !!f.camera && f.camera.holder === ref;
    case "aim":
      return !!f.camera && f.camera.at === (ask.region ?? null) && (!ask.zoom || f.camera.zoom === ask.zoom);
    case "zoom":
      return !!f.camera && f.camera.zoom === ask.zoom;
    case "traction": {
      const p = f.ports.find((x) => x.port === ask.port);
      return !!p && p.holder === ref && tractionShown(f, { structure: ask.structure ?? "", port: ask.port ?? "", direction: ask.direction ?? [], force: ask.force ?? "firm" });
    }
    case "release":
      return !f.retractions.some((r) => r.port === ask.port) && f.ports.find((p) => p.port === ask.port)?.holder !== ref;
    case "pass":
      return f.passed.some((q) => q.instrument === ask.instrument && q.to === undefined);
  }
}

/** What the screen shows once a request is done (`fieldShows`); the stop after a call-out, or after it could not go on, ends only by the learner's word. */
export function requestDone(v: MemberView, req: StandInRequest): boolean {
  return !!req.field && fieldShows(v, req.field, req.to);
}

/**
 * A request the field's record has gone past — a team restored older than the field (a crash in the middle of a run):
 * a pass whose insert is recorded, a request for a plan step that is done (or, asked after a step — the camera after its
 * scope insert, wider after the pause —, once a later one is).
 */
export function stale(plan: readonly PlanStep[], refs: readonly string[], key: string): boolean {
  const at = key.indexOf(":");
  const kind = key.slice(0, at);
  const rest = key.slice(at + 1);
  const furthest = furthestDone(plan, new Set(refs));
  if (kind === "pass") {
    const k = stepOfRef(rest);
    return refs.includes(rest) || (k !== null && furthest >= k);
  }
  const k = Number.parseInt(rest, 10);
  if (!Number.isInteger(k)) return false;
  return ASKED_AFTER.has(kind) ? furthest > k : furthest >= k;
}

/**
 * A colleague's own step of the reference as a request about the field (null: none names it — passed over): a traction,
 * letting go of one, the camera taken (the scope handed to them, or put into the camera port by them), an aim at a
 * region, a zoom, a pass to the operator (`operator`: whether a field reference names the stand-in).
 */
export function askOf(f: FieldView, x: PlanStep, operator: (ref: string) => boolean): FieldAsk | null {
  const op = x.op;
  switch (op.op) {
    case "retract":
      return { op: "traction", port: op.port, structure: op.structure, direction: directionNames(op.direction), force: op.force };
    case "release": {
      const port = f.retractions.find((r) => r.structure === op.structure)?.port;
      return port ? { op: "release", port } : null;
    }
    case "aim":
      return op.at !== undefined ? { op: "aim", region: op.at } : null;
    case "zoom":
      return { op: "zoom", zoom: op.level };
    case "pass":
      return op.to === undefined || op.to === "surgeon" || operator(op.to) ? { op: "pass", instrument: op.instrument } : null;
    case "hand-over":
    case "insert": {
      const port = f.ports.find((p) => p.port === op.port);
      const scope = op.op === "insert" ? op.instrument === "laparoscope" : port?.instrument === "laparoscope";
      const theirs = op.op === "insert" || op.to === x.actor;
      return port?.role === "camera" && scope && theirs ? { op: "camera", port: op.port } : null;
    }
    default:
      return null;
  }
}

/**
 * A step of its own plan the stand-in hands on now (docs/TEAM.md §4.5), to whom and asked how: its traction on an
 * assist port, to the traction assistant; a hand-over the reference has the operator make, to whoever holds the port's
 * control — the scope in a camera port to the camera holder, a grasper pulling to the traction assistant. `keep`: a
 * hand-over nobody may take (an instrument only the operator works, nobody holding the control): the stand-in keeps the
 * port. Null: its own to take.
 */
export function handedAsk(v: MemberView, f: FieldView, x: PlanStep): { to: MemberId; ask: FieldAsk } | "keep" | null {
  const op = x.op;
  if (x.actor !== undefined) return null;
  if (op.op === "retract") {
    const port = f.ports.find((p) => p.port === op.port);
    const who = port?.role === "assist" ? tractionAssistant(v, f) : null;
    return who ? { to: who, ask: { op: "traction", port: op.port, structure: op.structure, direction: directionNames(op.direction), force: op.force } } : null;
  }
  if (op.op === "hand-over" && op.to !== undefined) {
    const port = f.ports.find((p) => p.port === op.port);
    if (port?.role === "camera" && port.instrument === "laparoscope") {
      const who = cameraHolder(v, f);
      return who && who !== v.me.id ? { to: who, ask: { op: "camera", port: op.port } } : "keep";
    }
    const pull = f.retractions.find((r) => r.port === op.port);
    const who = port?.instrument === "grasper" && pull ? tractionAssistant(v, f) : null;
    return who && pull ? { to: who, ask: { op: "traction", port: op.port, structure: pull.structure, direction: [...pull.direction] as DirectionName[], force: pull.force } } : "keep";
  }
  return null;
}

/** The steps of its own plan the stand-in hands on in this view (`handedAsk`). */
export function handedIn(v: MemberView): Handed {
  const f = v.field;
  return (x) => !!f && handedAsk(v, f, x) !== null;
}
