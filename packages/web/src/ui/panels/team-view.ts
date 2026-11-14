/**
 * What the care team's panel shows and sends (docs/TEAM.md; `team.ts` draws it), worked out without a DOM: the learner's
 * place and line-up, the answers offered to what is said to them, what the stand-in surgeon waits on them for, the
 * stand-in's call-out (an approval request it raised), and the ops of the Ask, Need and Count rows. Every answer and
 * request is a `team` op, every call-out answer an `approval_response`: the session decides; nothing here is a rule of
 * the web's own — who waits on the learner and for what is the agent's (`learnerAwaited`, `haltOf`), whose body is whose
 * core's (`memberBody`, `refOfBody`).
 */
import { FOLLOW_NEED, haltOf, learnerAwaited, type ActionReceipt, type FieldAsk, type Op, type TeamCheckpoint, type TeamMessage, type TeamTask } from "@clinicalcraft/agent";
import { memberBody, refOfBody, standInOf, type CaseDefinition, type DirectionName, type InstrumentId, type Place, type SessionState } from "@clinicalcraft/core";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { ct, tr, trMaybe } from "../../i18n/index.js";
import type { ApprovalRequest } from "../../app/store.js";
import { label } from "./surgery-controls.js";
import { nameLabel } from "./trace-labels.js";

/** A `team` op (the panel's controls send these). */
export type TeamOp = Extract<Op, { type: "team" }>;

/** The learner's place in the team and the line-up chosen at the start (null: no place — the learner operates). */
export interface PlaceHeader {
  place: Place;
  /** "First assistant" / "第一助手". */
  title: string;
  /** The line-up in words ("Three surgeons (authored)"), null without one. */
  lineup: string | null;
}

/** The header of the panel in a place ("You: First assistant · Team: Three surgeons (authored)"), else null. */
export function placeHeader(c: Pick<CaseDefinition, "team">, s: Pick<SessionState, "seat" | "lineup">): PlaceHeader | null {
  if (!s.seat) return null;
  const l = s.lineup ? (c.team?.lineups ?? []).find((x) => x.id === s.lineup) : undefined;
  const lineup = l ? tr("intro.lineup.tagged", { name: ct(l.name), tag: trMaybe(`intro.lineup.tag.${l.provenance}`, l.provenance) }) : null;
  return { place: s.seat, title: tr(`place.${s.seat}`), lineup };
}

/**
 * The learner's own member as the panel names them (`PRIMARY_ACTOR`): in a place, the place's title and "(you)" — "First
 * assistant (you)" —; operating, the surgeon, as always.
 */
export function learnerName(s: Pick<SessionState, "seat">): string {
  return s.seat ? tr("team.placeYou", { place: tr(`place.${s.seat}`) }) : tr("team.surgeon");
}

/** An answer the panel offers to a line said to the learner: a `team` op to send, or the surgery window to open. */
export type TeamAnswer =
  | { id: "readback" | "confirm" | "decline" | "cannot" | "goOn" | "report" | "wound" | "understood"; label: string; title?: string; op: TeamOp }
  | { id: "surgery"; label: string };

const reply = (m: TeamMessage, kind: "readback" | "confirm" | "decline" | "report", text?: string): TeamOp => ({ type: "team", action: "reply", message: m.id, kind, ...(text ? { text } : {}) });

/** What the learner reports once they have done what was asked of the field (`team.report.*`, in the UI language). */
function reportText(f: FieldAsk): string {
  return tr(f.op === "traction" ? "team.report.traction" : f.op === "release" ? "team.report.release" : f.op === "camera" ? "team.report.camera" : f.op === "aim" ? "team.report.aim" : f.op === "zoom" ? "team.report.zoom" : f.op === "pass" ? "team.report.pass" : "team.report.done");
}

/**
 * The answers to a line said to the learner's own member, in any place (`to` the learner: `PRIMARY_ACTOR`), while they
 * play their part (learner mode; observing, the team plays it: none), until they have answered it:
 * - the stand-in's stop after their Stop, or its word that it cannot go on, open (`haltOf`): "Go on" — a confirmation
 *   without words ("Yes — go ahead.");
 * - a request about the field (the stand-in's camera, traction, pass, their own reference step): Read back, Can't;
 * - another request: Read back (and "Wound checked" for a hold on closure);
 * - a read-back of the learner's own ask or need: Confirm / Not now — a confirmation or a decline without words;
 * - the stand-in's confirmation of the learner's read-back: do it in the surgery window, then report it;
 * - an escalation: Understood.
 */
export function answersFor(cp: TeamCheckpoint, m: TeamMessage): TeamAnswer[] {
  if (cp.surgeon !== "learner" || m.to !== PRIMARY_ACTOR) return [];
  if (cp.state.messages.some((x) => x.replyTo === m.id && x.from === PRIMARY_ACTOR)) return [];
  const halt = haltOf(cp.state, m);
  if (halt) return [{ id: "goOn", label: tr("team.goOn"), title: tr("team.goOnTitle"), op: reply(m, "confirm") }];
  if (m.kind === "request") {
    const readBack: TeamAnswer = { id: "readback", label: tr("team.readBack"), op: reply(m, "readback") };
    if (m.about.field) return [readBack, { id: "cannot", label: tr("team.cannot"), title: tr("team.cannotTitle"), op: reply(m, "decline") }];
    return m.about.hold ? [readBack, { id: "wound", label: tr("team.woundChecked"), op: reply(m, "report", tr("team.woundChecked")) }] : [readBack];
  }
  if (m.kind === "readback") {
    return [
      { id: "confirm", label: tr("team.confirm"), title: tr("team.confirmTitle"), op: reply(m, "confirm") },
      { id: "decline", label: tr("team.declineReadback"), title: tr("team.declineReadbackTitle"), op: reply(m, "decline") },
    ];
  }
  if (m.kind === "confirm") {
    // the learner read back a request about the field and it was confirmed: theirs to do now, then to report
    const asked = cp.state.messages.find((x) => x.thread === m.thread && x.to === PRIMARY_ACTOR && x.kind === "request" && x.about.field);
    const readBack = asked && cp.state.messages.some((x) => x.thread === m.thread && x.from === PRIMARY_ACTOR && x.kind === "readback");
    if (!asked?.about.field || !readBack) return [];
    return [
      { id: "surgery", label: tr("team.doIt") },
      { id: "report", label: reportText(asked.about.field), op: reply(m, "report", reportText(asked.about.field)) },
    ];
  }
  if (m.kind === "escalate") return [{ id: "understood", label: tr("team.understood"), op: reply(m, "report", tr("team.understood")) }];
  return [];
}

/** What the stand-in surgeon waits on the learner for (learner mode, holding a place): the line to answer, or the count. */
export type Awaited = { kind: "line"; task: TeamTask; message: TeamMessage } | { kind: "count"; task: TeamTask };

/**
 * What the stand-in waits on the learner for now (the agent's `learnerAwaited`: a `team run` stops there) — the latest
 * line of its open request said to them (its request, its stop, its word that it cannot go on), or the count it waits
 * for before closing; null when nothing waits on them.
 */
export function awaitedOf(cp: TeamCheckpoint): Awaited | null {
  const task = learnerAwaited(cp.state, cp.surgeon);
  if (!task) return null;
  const thread = task.request?.to === PRIMARY_ACTOR ? task.request.thread : null;
  const message = thread ? [...cp.state.messages].reverse().find((m) => m.thread === thread && m.to === PRIMARY_ACTOR) : undefined;
  if (message) return { kind: "line", task, message };
  return task.reason === "count" ? { kind: "count", task } : null;
}

/** The stand-in's call-out as the learner answers it: its line and who says it, the answers bound to the approval request. */
export interface CalloutCard {
  requestId: string;
  /** "Clipping the cystic duct." / "正在夹闭胆囊管。" — in the session's language. */
  line: string;
  /** The stand-in's body (`staff:<id>`). */
  actorId: string;
  /** "No objection": the approval granted. */
  go: Extract<Op, { type: "approval_response" }>;
  /** "Stop": the approval denied — the stand-in stops, looks and asks what the learner sees. */
  stop: Extract<Op, { type: "approval_response" }>;
}

/**
 * The call-out card an approval request is (docs/TEAM.md §4.5): a request carrying the stand-in's `callout` line whose
 * body (`actorId`) is the stand-in's — the operating surgeon's body while the learner holds a place (core `memberBody`)
 * — with "No objection" and "Stop" bound to that request's approval response. Null for any other request: it is asked
 * as always (the approval dialog).
 */
export function calloutOf(req: Pick<ApprovalRequest, "requestId" | "callout" | "actorId">, c: CaseDefinition, s: Pick<SessionState, "seat" | "lineup" | "teamScenario">): CalloutCard | null {
  const line = typeof req.callout === "string" ? req.callout.trim() : "";
  if (!line || !req.actorId || !standInOf(c)) return null;
  const surgeon = memberBody(c, s, "surgeon");
  if (req.actorId !== surgeon || surgeon === PRIMARY_ACTOR) return null;
  const answer = (decision: "approved" | "denied") => ({ type: "approval_response" as const, requestId: req.requestId, decision });
  return { requestId: req.requestId, line, actorId: req.actorId, go: answer("approved"), stop: answer("denied") };
}

/** Whether a task is shown in the panel's list: a member's own following of the work with the camera is not a request. */
export function taskShown(x: TeamTask): boolean {
  return !(x.kind === "assist" && x.need === FOLLOW_NEED);
}

/** A task's kind in words (`team.task.<kind>`). */
export function taskLabel(x: TeamTask): string {
  return trMaybe(`team.task.${x.kind}`, x.kind);
}

/**
 * What a receipt says was done, in words: a step of the field by its name, a look at the field, a step of the operation
 * through a device (an act of the stand-in's plan task), a world act by its name; refused or cancelled: "could not: …".
 */
export function receiptText(r: ActionReceipt, tasks: readonly TeamTask[]): string {
  const op = r.operation === "operate" ? label("op", r.step ?? "operate") : r.operation === "observe_field" ? tr("team.done.observe") : tasks.some((x) => x.id === r.task && x.kind === "operate") ? tr("team.done.device", { op: nameLabel(r.operation) }) : nameLabel(r.operation);
  return r.outcome === "completed" ? op : tr("team.done.failed", { op });
}

/* ------------------------------------------------------------------ */
/* Asking the team: team ask / need / count                            */
/* ------------------------------------------------------------------ */

/** Who the learner may ask (`team ask`): the members of the team as it stands but themselves, the operator and whoever is absent. */
export function askable(cp: TeamCheckpoint, c: CaseDefinition, s: Pick<SessionState, "seat" | "lineup" | "teamScenario">): { to: string; body: string }[] {
  const operator = memberBody(c, s, "surgeon");
  return cp.state.members.filter((m) => m.id !== PRIMARY_ACTOR && m.id !== operator && !m.absent && m.staff !== "surgeon").map((m) => ({ to: m.staff, body: m.id }));
}

/** What the Ask row asks for. */
export type AskKind = "traction" | "release" | "camera" | "aim" | "closer" | "wider" | "pass";
export const ASK_KINDS: readonly AskKind[] = ["traction", "release", "camera", "aim", "closer", "wider", "pass"];

/** The Ask row's choices: a port, what to grasp and which way, a region, an instrument (each as the field names it). */
export interface AskChoice {
  port?: string;
  structure?: string;
  direction?: DirectionName;
  force?: "gentle" | "firm" | "excessive";
  region?: string;
  instrument?: InstrumentId;
}

/**
 * The request about the field the Ask row makes (`team ask`'s `field`; the session checks it again): traction needs a
 * port, what to grasp and a direction; letting go or the camera at most a port; an aim a region; closer and wider the
 * zoom; a pass an instrument. Null: not all chosen yet.
 */
export function askField(kind: AskKind, c: AskChoice): FieldAsk | null {
  switch (kind) {
    case "traction":
      return c.port && c.structure && c.direction ? { op: "traction", port: c.port, structure: c.structure, direction: [c.direction], force: c.force ?? "firm" } : null;
    case "release":
      return { op: "release", ...(c.port ? { port: c.port } : {}) };
    case "camera":
      return { op: "camera", ...(c.port ? { port: c.port } : {}) };
    case "aim":
      return c.region ? { op: "aim", region: c.region } : null;
    case "closer":
      return { op: "zoom", zoom: "close" };
    case "wider":
      return { op: "zoom", zoom: "wide" };
    case "pass":
      return c.instrument ? { op: "pass", instrument: c.instrument } : null;
  }
}

/** The `team ask` op for a member and a request (null: nothing complete to ask). */
export function askOp(to: string, kind: AskKind, c: AskChoice): TeamOp | null {
  const field = askField(kind, c);
  return to && field ? { type: "team", action: "ask", to, field } : null;
}

/** An item the team may be told is needed (`team need`): a team scenario's need, by the name the team calls it. */
export interface NeedItem {
  item: string;
  name: string;
}

/**
 * What the Need row offers: the items the case's team scenarios name as needs — by the name the team calls them, else the
 * equipment type's — that this hospital has (`present`: an equipment type the world holds).
 */
export function needItems(c: Pick<CaseDefinition, "team">, present: (item: string) => string | null): NeedItem[] {
  const out: NeedItem[] = [];
  for (const need of (c.team?.scenarios ?? []).flatMap((x) => x.needs ?? [])) {
    if (out.some((x) => x.item === need.item)) continue;
    const typeName = present(need.item);
    if (typeName === null) continue;
    out.push({ item: need.item, name: need.name ? ct(need.name) : typeName });
  }
  return out;
}

/** The `team need` op: for the surgeon (whoever operates), or for the learner's own place (`forMe`, holding one). */
export function needOp(c: CaseDefinition, s: Pick<SessionState, "seat" | "lineup" | "teamScenario">, item: string, forMe: boolean): TeamOp {
  const me = forMe ? refOfBody(c, s, PRIMARY_ACTOR) : undefined;
  return { type: "team", action: "need", item, ...(typeof me === "string" ? { for: me } : {}) };
}

/** Whether the count is the learner's to say (their member holds the `count` duty), and whether it is due now. */
export function countRow(cp: TeamCheckpoint): { op: TeamOp; due: boolean } | null {
  const mine = cp.state.members.find((m) => m.id === PRIMARY_ACTOR)?.duties.includes("count") ?? false;
  if (!mine) return null;
  const ledger = cp.state.count;
  return { op: { type: "team", action: "count" }, due: !!ledger && ledger.dueRound !== undefined && ledger.settledRound === undefined };
}

/** The member's name in a line (`staff:<id>` through the world's names; the learner's own member as their place). */
export function memberName(id: string, s: Pick<SessionState, "seat">, worldName: (id: string) => string | null): string {
  if (id === PRIMARY_ACTOR) return learnerName(s);
  return worldName(id) ?? id.replace(/^staff:/u, "");
}
