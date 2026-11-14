/**
 * Requests about the operative field, answered and seen through (docs/TEAM.md §4.4): an assistant at the operating table
 * (duty `assist`) — and anyone of the team asked something of the field: the scrub nurse a pass, a colleague who cannot
 * do it a decline. Pure and deterministic, from the member's own view (`MemberView`): the same view gives the same
 * proposal.
 * 1. A request (`about.field`) is read back to the one who asked (check-back step 2), or declined at once, saying why:
 *    the member's controls do not cover it (traction and letting go of it `retract`, the camera `camera`, a pass
 *    `instruments`; core `fieldControlFor`), naming who in the team may be handed it instead (`ColleagueView.handed`,
 *    `checkTaskScope` — never the surgeon); an instrument only the operator works (A13: core `instrumentControl`); a
 *    port a colleague holds (they hand it over themselves); no such port.
 * 2. The asker's confirmation (step 3) accepts the task; a decline from them withdraws it.
 * 3. The work, one step a round: walk to the operating table; take the port — the operator's handed over to them, or
 *    the instrument put into an empty port of its kind (a grasper into an assist port, the laparoscope into the camera
 *    port) —; then the step asked: traction on the structure, which way and how hard; the camera aimed, closer or
 *    wider; an instrument passed into the asker's hand. Each step is the `operate` tool with their own body (the team's
 *    caller), carried out once. Then the report: "Holding." / "拉住了。"
 * 4. Asked to let go: "Letting go now." / "我松手了。", then each traction released and each port handed back.
 * 5. Holding the camera, they follow the work: when the operator's last tissue step is in a region the camera is not
 *    aimed at, they aim it there — once for each change of region, never a loop.
 * They never withdraw an instrument, or let go, unasked; nothing here is ever proposed that their controls refuse.
 */
import { CONTROL_TITLES, describeDirection, directionVector, instrumentControl, type Controls, type FieldView, type ProcedureOp, type SurgicalControl } from "@clinicalcraft/core";
import { PRIMARY_ACTOR, type NavGoal } from "@clinicalcraft/world";
import { cameraPortOf, instrumentWords, readbackText, reportText } from "./asks.js";
import { both, joinBoth, phrase, type Bilingual } from "./i18n.js";
import type { MemberView } from "./policy.js";
import type { FieldAsk, FieldAskOp, MemberId, Proposal, TaskPatch, TeamMessage, TeamTask } from "./types.js";

const TERMINAL = new Set(["done", "declined", "escalated"]);
const NONE: Bilingual = { en: "", "zh-CN": "" };
const plain = (text: string): Bilingual => ({ en: text, "zh-CN": text });

/** The control a request about the field is worked with (letting go of what one holds needs none). */
export const ASK_CONTROL: Readonly<Record<FieldAskOp, SurgicalControl | null>> = { traction: "retract", release: null, camera: "camera", aim: "camera", zoom: "camera", pass: "instruments" };

/** The operating table's delegation task each request stands for (`checkTaskScope`): whom a decline names instead. */
export const ASK_TASK: Readonly<Record<FieldAskOp, string>> = { traction: "hold_traction", release: "release_traction", camera: "hold_camera", aim: "aim_camera", zoom: "aim_camera", pass: "pass_instrument" };

/** The requests that work the camera. */
const CAMERA_ASKS: ReadonlySet<FieldAskOp> = new Set(["camera", "aim", "zoom"]);

const holds = (controls: Controls | undefined, control: SurgicalControl): boolean => controls === "all" || (controls ?? []).includes(control);

/** The surgeon's body in a view (a view built without one is the learner's: they operate). */
function surgeonOf(v: MemberView): MemberId {
  return v.surgeon ?? PRIMARY_ACTOR;
}

/** The field's name for the member's own body (a hand-over's `to`); undefined for the operator. */
function mine(v: MemberView): string | undefined {
  return v.refOf?.(v.me.id);
}

/** A port as the field shows it. */
function portOf(f: FieldView, port: string | null | undefined): FieldView["ports"][number] | undefined {
  return port ? f.ports.find((p) => p.port === port) : undefined;
}

/** The ports the member holds an instrument in (only `port`, when one is named). */
function heldPorts(v: MemberView, f: FieldView, port?: string): FieldView["ports"] {
  const me = mine(v);
  return me === undefined ? [] : f.ports.filter((p) => p.holder === me && p.instrument && (!port || p.port === port));
}

/** The field shows the traction asked for: that structure, through that port, pulled that way, that hard. */
function tractionHeld(f: FieldView, ask: FieldAsk): boolean {
  if (!ask.direction?.length) return false;
  const want = describeDirection(directionVector(ask.direction));
  return f.retractions.some((r) => r.structure === ask.structure && r.port === ask.port && r.force === (ask.force ?? "firm") && r.direction.length === want.length && want.every((d) => r.direction.includes(d)));
}

/** The holder of a port, by name (the operator: "the surgeon"). */
function holderName(v: MemberView, holder: string | undefined): Bilingual {
  return v.name(v.bodyOf ? v.bodyOf(holder) : surgeonOf(v));
}

/** Why the member cannot do what is asked (null: they can — or it is for the table to tell, the field not in sight). */
export function fieldRefusal(v: MemberView, ask: FieldAsk): { code: string; text: Bilingual } | null {
  const control = ASK_CONTROL[ask.op];
  if (control && !holds(v.controls, control)) {
    // who in the team may be handed it instead: present, the surgeon apart (the operating table's tasks, A16)
    const helpers = v.colleagues.filter((c) => c.present && !c.absent && c.id !== surgeonOf(v) && (c.handed ?? []).includes(ASK_TASK[ask.op])).map((c) => v.name(c.id));
    const instead = helpers.length ? phrase("clause.instead", { who: joinBoth(helpers, "or") }) : NONE;
    return { code: "no-control", text: phrase("decline.noControl", { control: both(CONTROL_TITLES[control]), instead }) };
  }
  const f = v.field;
  if (!f) return null;
  const me = mine(v);
  const port = (name: string | null | undefined) => plain(name ?? "");
  switch (ask.op) {
    case "traction": {
      const p = portOf(f, ask.port);
      if (!p) return { code: "no-port", text: phrase("decline.noPort", { port: port(ask.port) }) };
      if (p.holder !== undefined && p.holder !== me) return { code: "port-held", text: phrase("decline.portHeld", { holder: holderName(v, p.holder), port: port(p.port) }) };
      if (p.instrument) {
        // A13: an instrument nobody but the operator works; one held for another control than traction
        const control = instrumentControl(p.instrument);
        if (control === null) return { code: "operator-instrument", text: phrase("decline.operatorInstrument", { instrument: instrumentWords(p.instrument), port: port(p.port) }) };
        if (control !== "retract") return { code: "not-traction", text: phrase("decline.notTraction", { instrument: instrumentWords(p.instrument), port: port(p.port) }) };
      } else if (p.role !== "assist") return { code: "empty-port", text: phrase("decline.emptyPort", { port: port(p.port) }) };
      return null;
    }
    case "camera":
    case "aim":
    case "zoom": {
      const name = cameraPortOf(f, ask);
      const p = portOf(f, name);
      if (!p) return { code: "no-port", text: phrase("decline.noPort", { port: port(name) }) };
      if (p.role !== "camera" || (p.instrument && p.instrument !== "laparoscope")) return { code: "not-camera-port", text: phrase("decline.notCameraPort", { port: port(p.port) }) };
      if (p.holder !== undefined && p.holder !== me) return { code: "port-held", text: phrase("decline.portHeld", { holder: holderName(v, p.holder), port: port(p.port) }) };
      return null;
    }
    case "release":
      return heldPorts(v, f, ask.port).length ? null : { code: "nothing-held", text: phrase("decline.nothingHeld") };
    case "pass":
      return null;
  }
}

/** A message about a field task, said to `to`. */
function sayField(v: MemberView, to: MemberId, kind: TeamMessage["kind"], text: Bilingual, task: TeamTask, o: { replyTo?: string; reason?: string; patch?: TaskPatch[] } = {}): Proposal {
  return {
    kind: "say",
    to,
    message: { thread: task.thread, kind, text, about: { ...(task.field ? { field: structuredClone(task.field) } : {}), ...(o.reason ? { reason: o.reason } : {}) }, evidence: [], ...(o.replyTo ? { replyTo: o.replyTo } : {}) },
    patch: o.patch ?? [],
  };
}

/** The task ends declined, said to the one who asked, with the reason. */
function decline(v: MemberView, task: TeamTask, code: string, text: Bilingual): Proposal {
  return sayField(v, task.initiator, "decline", text, task, { reason: code, patch: [{ id: task.id, set: { status: "declined", since: v.round, reason: code, reasonText: text } }] });
}

/** The task done, reported to the one who asked (`more`: further changes to it). */
function done(v: MemberView, task: TeamTask, text: Bilingual, more: Partial<TeamTask> = {}): Proposal {
  return sayField(v, task.initiator, "report", text, task, { patch: [{ id: task.id, set: { status: "done", since: v.round, ...more } }] });
}

/** A step in the operative field for a task. */
function operate(task: TeamTask, op: ProcedureOp, patch: TaskPatch[] = []): Proposal {
  return { kind: "operate", task: task.id, op, patch };
}

/** Whether a message is the field's: a request about it, or anything said in the thread of a field task of the member's. */
export function isFieldMessage(v: MemberView, m: TeamMessage): boolean {
  return (m.kind === "request" && !!m.about.field) || v.tasks.some((t) => t.kind === "assist" && t.thread === m.thread);
}

/**
 * A message about the field said to the member: a request read back — or declined at once, with why —; the asker's
 * confirmation accepts it, their decline withdraws it; anything else in the thread is taken in.
 */
export function answerField(v: MemberView, m: TeamMessage): Proposal {
  const read: TaskPatch = { read: m.id };
  const ask = m.about.field;
  if (m.kind === "request" && ask) {
    // the same request again: already answered
    if (v.tasks.some((t) => t.thread === m.thread && t.kind === "assist")) return { kind: "update", patch: [read] };
    const task: TeamTask = { id: v.newId("task"), kind: "assist", need: `field:${ask.op}`, item: ask.instrument ?? ask.port ?? "", for: m.from, owner: v.me.id, initiator: m.from, thread: m.thread, status: "asked", since: v.round, tried: [], acts: 0, field: structuredClone(ask) };
    const why = fieldRefusal(v, ask);
    if (why) return sayField(v, m.from, "decline", why.text, task, { replyTo: m.id, reason: why.code, patch: [read, { create: { ...task, status: "declined", reason: why.code, reasonText: why.text } }] });
    return sayField(v, m.from, "readback", readbackText(v, ask, m.from), task, { replyTo: m.id, patch: [read, { create: task }] });
  }
  const task = v.tasks.find((t) => t.kind === "assist" && t.thread === m.thread);
  if (task && task.status === "asked" && m.kind === "confirm") return { kind: "update", patch: [read, { id: task.id, set: { status: "accepted", since: v.round } }] };
  if (task && task.status === "asked" && m.kind === "decline") return { kind: "update", patch: [read, { id: task.id, set: { status: "declined", since: v.round, reason: "withdrawn" } }] };
  return { kind: "update", patch: [read] };
}

/** Letting go, asked: said first, then each traction released and each port handed back (the task ends with nothing held). */
function releaseStep(v: MemberView, f: FieldView, task: TeamTask): Proposal {
  const ask = task.field!;
  if (task.step !== "announced") return sayField(v, task.initiator, "report", reportText(v, ask), task, { patch: [{ id: task.id, set: { step: "announced" } }] });
  const held = heldPorts(v, f, ask.port)[0];
  if (!held) return { kind: "update", patch: [{ id: task.id, set: { status: "done", since: v.round } }] };
  const pulled = f.retractions.find((r) => r.port === held.port);
  return operate(task, pulled ? { op: "release", structure: pulled.structure } : { op: "hand-over", port: held.port });
}

/** Where the camera looks after an explicit aim: following resumes only when the work moves to another region. */
function followed(f: FieldView | null): Partial<TeamTask> {
  return f?.working ? { step: `followed:${f.working}` } : {};
}

/** The next step of an accepted field task (null: nothing to do now). */
function workStep(v: MemberView, task: TeamTask): Proposal | null {
  const ask = task.field!;
  // called in from outside: to the room first; the world pointed somewhere after a refusal: walk there first
  if (!v.me.inRoom) return { kind: "act", task: task.id, operation: "navigate", goal: { kind: "room", id: v.room } };
  if (task.goal) return { kind: "act", task: task.id, operation: "navigate", goal: task.goal, patch: [{ id: task.id, set: { goal: undefined } }] };
  // to the operating table, beside the patient (an operative step is done there)
  if (!v.atTable) return v.patient ? { kind: "act", task: task.id, operation: "navigate", goal: { kind: "interact", id: v.patient } } : null;
  const f = v.field;
  if (!f) return decline(v, task, "no-field", phrase("decline.noField"));
  if (ask.op === "release") return releaseStep(v, f, task);
  const why = fieldRefusal(v, ask);
  if (why) return decline(v, task, why.code, why.text);
  const me = mine(v);
  switch (ask.op) {
    case "traction": {
      const p = portOf(f, ask.port)!;
      if (p.holder !== me) return operate(task, p.instrument ? { op: "hand-over", port: p.port, ...(me ? { to: me } : {}) } : { op: "insert", port: p.port, instrument: "grasper" });
      if (!tractionHeld(f, ask)) return operate(task, { op: "retract", port: p.port, structure: ask.structure ?? "", direction: ask.direction ?? [], force: ask.force ?? "firm" });
      return done(v, task, reportText(v, ask));
    }
    case "camera":
    case "aim":
    case "zoom": {
      const port = cameraPortOf(f, ask)!;
      const p = portOf(f, port)!;
      if (p.holder !== me || !p.instrument) return operate(task, p.instrument ? { op: "hand-over", port, ...(me ? { to: me } : {}) } : { op: "insert", port, instrument: "laparoscope" });
      if (ask.op === "camera") return done(v, task, reportText(v, ask));
      if (ask.op === "aim" && f.camera?.at !== ask.region) return operate(task, { op: "aim", port, ...(ask.region ? { at: ask.region } : {}) });
      if (ask.zoom && f.camera?.zoom !== ask.zoom) return operate(task, { op: "zoom", port, level: ask.zoom });
      return done(v, task, reportText(v, ask), followed(f));
    }
    case "pass": {
      if (task.step === "passed") return done(v, task, reportText(v, ask));
      const to = v.refOf?.(task.initiator);
      return operate(task, { op: "pass", instrument: ask.instrument!, ...(to ? { to } : {}) });
    }
  }
}

/**
 * Holding the camera, the member follows the work: the operator's last tissue step is in a region the camera is not
 * aimed at — aim it there, once for each change of region (the region followed is kept on their camera task).
 */
function followWork(v: MemberView): Proposal | null {
  // only one who may hold the camera ever does (asked first: the field on the screen is costlier to look at)
  if (!holds(v.controls, "camera")) return null;
  const f = v.field;
  const me = mine(v);
  if (!f?.camera || !f.working || me === undefined || f.camera.holder !== me || f.camera.at === f.working) return null;
  const marker = `followed:${f.working}`;
  const prior = [...v.tasks].reverse().find((t) => t.kind === "assist" && t.field && CAMERA_ASKS.has(t.field.op));
  if (prior?.step === marker) return null;
  const op: ProcedureOp = { op: "aim", port: f.camera.port, at: f.working };
  if (prior) return operate(prior, op, [{ id: prior.id, set: { step: marker } }]);
  // holding the camera with no request of the team's (handed to them otherwise): a task of their own to act under
  const task: TeamTask = { id: v.newId("task"), kind: "assist", need: "field:aim", item: f.camera.port, for: v.me.id, owner: v.me.id, initiator: v.me.id, thread: v.newId("thread"), status: "done", since: v.round, tried: [], acts: 0, field: { op: "aim", port: f.camera.port }, step: marker };
  return operate(task, op, [{ create: task }]);
}

/** The member's work in the field: their accepted field tasks, oldest first; then, holding the camera, the work followed. */
export function fieldWork(v: MemberView): Proposal | null {
  for (const task of v.tasks) {
    if (task.kind !== "assist" || !task.field || task.status !== "accepted") continue;
    const step = workStep(v, task);
    if (step) return step;
  }
  return followWork(v);
}

/** An assistant (duty `assist`): anything said to them that is not the field's is taken in; then their work in the field. */
export function assist(v: MemberView): Proposal | null {
  const other = v.inbox[0];
  if (other) return { kind: "update", patch: [{ read: other.id }] };
  return fieldWork(v);
}

/**
 * After a world act of a field task (the walk to the table): a refusal for reach or sight sends them where the world
 * points, or they try again from a fresh view; any other refusal ends the task declined, with the world's reason.
 */
export function afterFieldWalk(v: MemberView, task: TeamTask, outcome: { status: string; code?: string; message: string; hint?: NavGoal }): Proposal | null {
  if (TERMINAL.has(task.status) || outcome.status === "completed") return null;
  if (outcome.hint) return { kind: "update", patch: [{ id: task.id, set: { goal: outcome.hint } }] };
  if (outcome.status === "cancelled" || outcome.code === "NOT_IN_RANGE" || outcome.code === "NOT_VISIBLE" || outcome.code === "MOVEMENT_INTERRUPTED") return null;
  const reason = (outcome.message.split("\n")[0] ?? "").replace(/[.。]\s*$/u, "");
  return decline(v, task, outcome.code ?? "failed", phrase("decline.failed", { reason: plain(reason) }));
}

/**
 * After a step in the operative field: a refusal for reach or sight sends them where the world points; an interrupted
 * call is tried again; any other refusal ends the task declined, with the field's reason; the last step of what was
 * asked is reported ("Holding.", "Passed."). A task already ended (the camera following the work) says nothing.
 */
export function afterOperate(v: MemberView, task: TeamTask, outcome: { status: string; code?: string; message: string; op: ProcedureOp; hint?: NavGoal }): Proposal | null {
  if (task.kind !== "assist" || !task.field || TERMINAL.has(task.status)) return null;
  const ask = task.field;
  if (outcome.status !== "completed") {
    if (outcome.hint) return { kind: "update", patch: [{ id: task.id, set: { goal: outcome.hint } }] };
    if (outcome.status === "cancelled") return null;
    const reason = (outcome.message.split("\n")[0] ?? "").replace(/[.。]\s*$/u, "");
    return decline(v, task, outcome.code ?? "failed", phrase("decline.failed", { reason: plain(reason) }));
  }
  const step = outcome.op.op;
  switch (ask.op) {
    case "traction":
      return step === "retract" ? done(v, task, reportText(v, ask)) : null;
    case "camera":
      return step === "hand-over" || step === "insert" ? done(v, task, reportText(v, ask)) : null;
    case "aim":
      return (step === "aim" && (!ask.zoom || v.field?.camera?.zoom === ask.zoom)) || step === "zoom" ? done(v, task, reportText(v, ask), followed(v.field)) : null;
    case "zoom":
      return step === "zoom" ? done(v, task, reportText(v, ask), followed(v.field)) : null;
    case "pass":
      return step === "pass" ? done(v, task, reportText(v, ask), { step: "passed" }) : null;
    case "release":
      return null;
  }
}
