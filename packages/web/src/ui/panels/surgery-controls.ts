/**
 * The surgery window's controls as data (pure — no DOM): when the window is offered, which actions the
 * instrument in a port offers, the `operate` ops the controls submit, the identification choices and
 * the localised labels of the engine's values. The engine decides every step — a button here is an
 * offer, never a verdict: what it refuses comes back as its rejection message.
 *
 * The window by place (docs/PROCEDURE.md §7): what the learner's place may do — who holds each port, which ports they
 * may take, hand back or hand on, what they may put in or ask to be passed, what they may do through the ports they
 * hold, the camera and the instrument table — is asked of core, never worked out here: the field's gates (`fieldGate`,
 * the session's own precheck of a step), the engine's own verdict on a step without taking it (`operateRefusal`: the
 * passing rule and the physics), the instrument vocabulary (`INSTRUMENT_OPS`) — and of the world, whether a colleague
 * stands at the operating table to take a port (`atOperatingTable`). The operating learner (no place) is offered what
 * the instrument does, as always; the field refuses the rest with its reason.
 */
import type { CaseDefinition, DomainEvent, FacilityDefinition, FieldGate, FieldView, InstrumentId, ProcedureDefinition, ProcedureOp, RefusalReason, SessionState, StepRefusal, ZoomLevel } from "@clinicalcraft/core";
import {
  bodyControls,
  effectiveTeam,
  ENERGY_INSTRUMENTS,
  fieldGate,
  INSTRUMENT_OPS,
  LEARNER_BODY,
  memberBody,
  operateRefusal,
  operatorOf,
  passingRequired,
  procedureStateOf,
  refOfBody,
  t,
  UNCERTAIN,
  vocabularyStructures,
} from "@clinicalcraft/core";
import { joinList, trMaybe } from "../../i18n/index.js";

/** The surgery window is offered: the case has an operation and the session is in one of its phases. */
export function surgeryOffered(c: CaseDefinition | null | undefined, phase: string | null | undefined): boolean {
  return !!c?.procedure && !!phase && c.procedure.phases.includes(phase);
}

/** An action a port's instrument offers (an `operate` op that names the port; `aim` and `zoom`: the laparoscope's). */
export type Control = "retract" | "dissect" | "isolate" | "clip" | "divide" | "coagulate" | "suction" | "irrigate" | "image" | "bag" | "aim" | "zoom";

/**
 * The actions each instrument offers: the engine's instrument vocabulary (`INSTRUMENT_OPS`, docs/PROCEDURE.md §2),
 * shown as buttons. The engine re-checks every step.
 */
export const INSTRUMENT_CONTROLS = INSTRUMENT_OPS as Readonly<Record<InstrumentId, readonly Control[]>>;

/** Instruments that deliver energy (the "with energy" option of a dissection). */
export { ENERGY_INSTRUMENTS };

/** The actions the instrument in a port offers (none for an empty port; the laparoscope's are the camera's: aim, zoom). */
export function controlsFor(instrument: InstrumentId | null | undefined): readonly Control[] {
  return instrument ? INSTRUMENT_CONTROLS[instrument] : [];
}

/** The imaging an instrument performs: the cholangiocatheter cholangiography, the probe ultrasound. */
export function imagingFor(instrument: InstrumentId | null | undefined): "ioc" | "lap-us" | null {
  return instrument === "cholangiocatheter" ? "ioc" : instrument === "lap-us" ? "lap-us" : null;
}

/** The named pull directions (patient frame), in display order. */
export const DIRECTION_NAMES = ["cephalad", "caudal", "patient-left", "patient-right", "anterior", "posterior"] as const;
export type DirectionName = (typeof DIRECTION_NAMES)[number];

const OPPOSITE: Record<DirectionName, DirectionName> = {
  cephalad: "caudal",
  caudal: "cephalad",
  "patient-left": "patient-right",
  "patient-right": "patient-left",
  anterior: "posterior",
  posterior: "anterior",
};

/** Tick or untick a direction; ticking one unticks its opposite (they would cancel out). Display order kept. */
export function toggleDirection(current: readonly DirectionName[], d: DirectionName, on: boolean): DirectionName[] {
  const set = new Set(current);
  if (on) {
    set.add(d);
    set.delete(OPPOSITE[d]);
  } else set.delete(d);
  return DIRECTION_NAMES.filter((x) => set.has(x));
}

export type Force = "gentle" | "firm" | "excessive";
export const FORCES: readonly Force[] = ["gentle", "firm", "excessive"];

/** Grasp `structure` through `port` and pull it towards the named directions; null without a direction. */
export function retractOp(port: string, structure: string, directions: readonly DirectionName[], force: Force): ProcedureOp | null {
  if (!directions.length || !structure) return null;
  return { op: "retract", port, structure, direction: [...directions], force };
}

/** One dissection step in a region (with energy only from an energy instrument). */
export function dissectOp(port: string, region: string, energy: boolean, instrument: InstrumentId | null): ProcedureOp {
  return { op: "dissect", port, region, energy: energy && !!instrument && ENERGY_INSTRUMENTS.has(instrument) };
}

export type HandleControl = "isolate" | "clip" | "divide" | "coagulate";

/** An action on a duct or vessel by its handle ("T1"); `clips` 1–3 for a clip. */
export function handleOp(control: HandleControl, port: string, handle: string, clips = 1): ProcedureOp {
  if (control === "clip") return { op: "clip", port, handle, count: Math.min(3, Math.max(1, Math.round(clips))) };
  return { op: control, port, handle };
}

/** Intraoperative imaging with the instrument in `port` (null: it does not image). */
export function imageOp(port: string, instrument: InstrumentId | null): ProcedureOp | null {
  const modality = imagingFor(instrument);
  return modality ? { op: "image", modality, port } : null;
}

/**
 * The safety pause the operator records for a view: one claim per criterion — ticked true, unticked
 * false; for a counting criterion the number of structures the operator sees entering (the operator's
 * judgement; the engine records it next to what the field shows). Null for an unknown view.
 */
export function safetyPauseOp(def: ProcedureDefinition, viewId: string, ticked: ReadonlySet<string>, counts: Readonly<Record<string, number>> = {}): ProcedureOp | null {
  const view = def.views.find((v) => v.id === viewId);
  if (!view) return null;
  return {
    op: "safety-pause",
    view: view.id,
    claims: Object.fromEntries(view.criteria.map((c) => [c.id, isCounting(c.test) ? (counts[c.id] ?? 0) : ticked.has(c.id)])),
  };
}

/** A criterion the operator answers with a number (how many structures they see entering). */
export function isCounting(test: ProcedureDefinition["views"][number]["criteria"][number]["test"]): boolean {
  return "onlyEntering" in test && test.count != null;
}

/**
 * What a handle can be named as: every duct and vessel of the operation and of its anatomical variants
 * (the same list whatever the patient's anatomy), by its localised name, sorted by that name — never in
 * the anatomy's order, which is the order handles are given out in.
 */
export function identifyChoices(def: ProcedureDefinition, locale: string, uncertainLabel?: string): { id: string; name: string }[] {
  const tubular = new Set(["duct", "artery", "vein"]);
  const named = vocabularyStructures(def)
    .filter((s) => tubular.has(s.kind))
    .map((s) => ({ id: s.id, name: t(s.name, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale) || a.id.localeCompare(b.id));
  // last: seen, but cannot be named (still unidentified for a clip or a division)
  return uncertainLabel ? [...named, { id: UNCERTAIN, name: uncertainLabel }] : named;
}

/** The port to work with: `current` while it is in the plan, else the first working port holding an instrument, else the first port. */
export function activePort(field: FieldView, current: string | null): string | null {
  if (current && field.ports.some((p) => p.port === current)) return current;
  const working = field.ports.find((p) => p.role !== "camera" && p.instrument && p.instrument !== "laparoscope");
  return working?.port ?? field.ports.find((p) => p.role !== "camera")?.port ?? field.ports[0]?.port ?? null;
}

/** The handle still selected: `current` while it is in view, else none. */
export function selectedHandle(field: FieldView, current: string | null): string | null {
  return current && field.tubes.some((x) => x.handle === current) ? current : null;
}

/** The last step of the operation (whoever took it — the learner or the demonstration): its op and signals. */
export function lastStep(events: readonly DomainEvent[]): Extract<DomainEvent, { type: "procedure.step" }> | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === "procedure.step") return e;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* The window by place (docs/PROCEDURE.md §7)                          */
/* ------------------------------------------------------------------ */

/** What the window's offers are worked out from: the case, the session's state and the facility (its staff's positions). */
export interface FieldSeat {
  c: CaseDefinition;
  s: SessionState;
  facility?: FacilityDefinition | null;
  /**
   * Whether a body stands at the operating table now — the world's own rule (`atOperatingTable`): a port handed to a
   * body that is not is let go at once (the session's traction rule). Absent: no world (clinical mode), no table rule.
   */
  atTable?: (body: string) => boolean;
}

/**
 * Whom the learner works the operative field as (core `refOfBody` of the learner's body): undefined — the operator (no
 * place); a staff id — the member whose place the learner holds; null — no part (never the learner's body, in fact).
 */
export function learnerRef(f: FieldSeat): string | null | undefined {
  return refOfBody(f.c, f.s, LEARNER_BODY);
}

/**
 * Whether the field's gates let the learner send a step — core `fieldGate`, the session's own precheck of the step
 * before any approval (a step only the operator takes is not a colleague's; whom it names takes part; the controls
 * cover it, the learner's place's and whoever takes a port's). The physics answers the rest (`stepVerdict`).
 */
export function stepOffered(f: FieldSeat, op: ProcedureOp): boolean {
  return fieldGate(f.c, f.s, f.facility, op, LEARNER_BODY) === null;
}

/** What the field says to the learner's step now (`stepVerdict`): taken (null), refused by its gates, or by the engine. */
export type StepVerdict = null | { by: "gate"; gate: FieldGate } | { by: "engine"; refusal: StepRefusal };

/**
 * The field's verdict on the learner's step now, without sending it: its gates (core `fieldGate`: the session's own
 * precheck) and then the engine's own verdict (core `operateRefusal`: the passing rule and the physics — who holds a
 * port, consent, two hands, what is in it, the gas). An offer of the window by place is a step this takes.
 */
export function stepVerdict(f: FieldSeat, op: ProcedureOp): StepVerdict {
  return stepVerdictOf(f, op, LEARNER_BODY);
}

/**
 * The field's verdict on a step taken by a body (`stepVerdict` for anyone: a colleague asked to take it — the operating
 * table's chips of a conversation offer only what this takes): core `fieldGate` with that body, then the engine's own
 * verdict with whom the body works the field as (core `refOfBody`).
 */
export function stepVerdictOf(f: FieldSeat, op: ProcedureOp, body: string): StepVerdict {
  const gate = fieldGate(f.c, f.s, f.facility, op, body);
  if (gate) return { by: "gate", gate };
  const refusal = operateRefusal(f.c, f.s, op, refOfBody(f.c, f.s, body) ?? undefined);
  return refusal ? { by: "engine", refusal } : null;
}

/** The reason a verdict refuses for, as the field gives it (undefined: none — taken, no part, or the physics' English only). */
export function verdictReason(v: StepVerdict): RefusalReason | undefined {
  if (!v) return undefined;
  if (v.by === "engine") return v.refusal.reason;
  return v.gate.kind === "no-part" ? undefined : v.gate.kind === "operator-only" ? v.gate.reason : v.gate.refusal.reason;
}

/** Who holds a port (or the camera), as the learner reads it: you, the operator (the stand-in while you hold a place) or a colleague. */
export type Holder = { kind: "you" } | { kind: "operator"; ref: string | null } | { kind: "colleague"; ref: string };

/** The holder of a port the field records (`holder`; absent: the operator), through core `memberBody`: your place's member is you. */
export function holderOf(f: FieldSeat, holder: string | undefined): Holder {
  if (memberBody(f.c, f.s, holder ?? "surgeon") === LEARNER_BODY) return { kind: "you" };
  return holder === undefined ? { kind: "operator", ref: operatorOf(f.c, f.s) ?? null } : { kind: "colleague", ref: holder };
}

/** What the learner's place may do with one port (`portsForPlace`): each an `operate` op the field takes now. */
export interface PortOffer {
  port: string;
  instrument: InstrumentId | null;
  holder: Holder;
  /** The learner works this port: they hold it (the operator's own ports while they operate; a port handed to their place). */
  mine: boolean;
  /** Take it: from the operator into the learner's place — or, operating, back from the colleague holding it. */
  take: ProcedureOp | null;
  /** Hand it back to the operator. */
  handBack: ProcedureOp | null;
  /** Hand it, from the learner's hands, to a member of the team at the operating table whose controls cover its instrument. */
  handTo: { to: string; op: ProcedureOp }[];
  /** Instruments the learner may put into it: a colleague, into an empty port, what the field takes; operating, every instrument on the table into a port of their own (an exchange too), as always. */
  insert: InstrumentId[];
  /** Instead of an insert, while every instrument is passed first and none waits (the engine's `pass-first`): the instrument asked for, and of whom. */
  askFor: { instrument: InstrumentId; to: string }[];
  /** Take its instrument out. */
  withdraw: ProcedureOp | null;
}

/** The members of the team as it is who may take a port or a pass from the learner: not the surgeon token, the operator or the learner's place. */
function colleaguesOf(f: FieldSeat, me: string | undefined): string[] {
  const operator = operatorOf(f.c, f.s);
  return effectiveTeam(f.c, f.s)
    .map((m) => m.staff)
    .filter((x) => x !== "surgeon" && x !== operator && x !== me);
}

/** Who passes instruments to the learner's place: a member present, not the learner, whose controls hold the instrument table. */
function passerFor(f: FieldSeat, me: string): string | null {
  return colleaguesOf(f, me).find((x) => { const own = bodyControls(f.c, f.s, f.facility, memberBody(f.c, f.s, x), "field"); return own === "all" || own.includes("instruments"); }) ?? null;
}

/** The session's state with a pass of `instrument` waiting for `to` (by `by`): what the field would say once it is passed. */
function withPass(s: SessionState, instrument: InstrumentId, to: string, by: string): SessionState {
  const p = procedureStateOf(s);
  return { ...s, procedure: { ...p, passed: [...(p.passed ?? []), { instrument, to, by }] } };
}

/** Whether a member stands at the operating table (the world's rule; no world: no table rule). */
function atTable(f: FieldSeat, who: string): boolean {
  return f.atTable ? f.atTable(memberBody(f.c, f.s, who)) : true;
}

/**
 * The ports as the learner's place may work them (docs/PROCEDURE.md §7): who holds each, and every offer a step the
 * field takes now (`stepVerdict`: core's gates, then the engine's own verdict — consent, two hands, what is in a port,
 * the gas —, never a rule of the web's own): Take, Hand back, Hand to — only to a member at the operating table (the
 * world's rule: a port held away from it is let go) —, an insert (a colleague's into an empty port of its kind), and a
 * withdrawal. While every instrument is passed first (the scrub nurse's place) an insert the engine refuses for want of
 * a pass (`pass-first`) and would take once one waits becomes a request for one. Operating, the learner's own ports
 * offer every instrument and the withdrawal, as always: the field refuses the rest with its reason.
 */
export function portsForPlace(f: FieldSeat, def: ProcedureDefinition, v: FieldView): PortOffer[] {
  const me = learnerRef(f);
  const taken = (op: ProcedureOp): ProcedureOp | null => (stepVerdict(f, op) === null ? op : null);
  return v.ports.map((p): PortOffer => {
    const holder = holderOf(f, p.holder);
    const none: PortOffer = { port: p.port, instrument: p.instrument, holder, mine: false, take: null, handBack: null, handTo: [], insert: [], askFor: [], withdraw: null };
    if (me === null) return none;
    const mine = (p.holder ?? undefined) === me;
    let take: ProcedureOp | null = null;
    if (!mine && p.instrument) take = me === undefined ? taken({ op: "hand-over", port: p.port }) : taken({ op: "hand-over", port: p.port, to: me });
    const handBack = mine && p.instrument && me !== undefined ? taken({ op: "hand-over", port: p.port }) : null;
    const handTo = mine && p.instrument
      ? colleaguesOf(f, me).flatMap((to) => {
          const op = atTable(f, to) ? taken({ op: "hand-over", port: p.port, to }) : null;
          return op ? [{ to, op }] : [];
        })
      : [];
    const table = def.instruments.map((i) => i.id);
    const insert: InstrumentId[] = [];
    const askFor: PortOffer["askFor"] = [];
    // operating: into a port of the operator's own, any instrument (an exchange too); a colleague: what the field takes
    if (me === undefined) insert.push(...(mine ? table : []));
    else if (!p.instrument) {
      const passer = passingRequired(f.c, f.s) ? passerFor(f, me) : null;
      for (const i of table) {
        const op: ProcedureOp = { op: "insert", port: p.port, instrument: i };
        const verdict = stepVerdict(f, op);
        if (verdict === null) insert.push(i);
        else if (passer && verdict.by === "engine" && verdict.refusal.reason?.key === "pass-first" && operateRefusal(f.c, withPass(f.s, i, me, passer), op, me) === null) askFor.push({ instrument: i, to: passer });
      }
    }
    const withdraw = mine && p.instrument ? (me === undefined ? { op: "withdraw" as const, port: p.port } : taken({ op: "withdraw", port: p.port })) : null;
    return { ...none, mine, take, handBack, handTo, insert, askFor, withdraw };
  });
}

/** An op of an action through a port (the targets do not matter to the gates: they read the step and the port). */
function controlProbe(control: Control, port: string): ProcedureOp {
  switch (control) {
    case "retract":
      return { op: "retract", port, structure: "probe", direction: ["cephalad"], force: "firm" };
    case "dissect":
      return { op: "dissect", port, region: "probe", energy: false };
    case "isolate":
    case "divide":
    case "coagulate":
      return { op: control, port, handle: "T1" };
    case "clip":
      return { op: "clip", port, handle: "T1", count: 1 };
    case "image":
      return { op: "image", port, modality: "ioc" };
    case "aim":
      return { op: "aim", port };
    case "zoom":
      return { op: "zoom", port, level: "wide" };
    default:
      return { op: control, port };
  }
}

/**
 * The actions offered through a port (`controlsFor` by place): only a port the learner holds; operating, everything its
 * instrument does, as always; in a place, what its instrument does that the field's gates let the place do (traction,
 * suction and irrigation, the camera's — by the controls; never the operator's own steps). Their targets are chosen
 * after: the field refuses what it cannot take, with its reason.
 */
export function controlsForPlace(f: FieldSeat, port: FieldView["ports"][number]): readonly Control[] {
  const me = learnerRef(f);
  if (me === null || !port.instrument || (port.holder ?? undefined) !== me) return [];
  const all = controlsFor(port.instrument);
  return me === undefined ? all : all.filter((k) => stepOffered(f, controlProbe(k, port.port)));
}

/** The camera as the learner may work it (`cameraOffer`): where it looks, who holds it, and whether the learner aims it. */
export interface CameraOffer {
  port: string;
  at: string | null;
  zoom: ZoomLevel;
  holder: Holder;
  /** The learner aims and zooms it: the field takes their aim now — the camera holder's, or the operator's while nobody holds the camera port. */
  aims: boolean;
  /** Why not, as the field gives it (the port is someone else's, a control not held, no picture…); undefined: aims, or no reason given. */
  refusal?: RefusalReason;
}

/**
 * The camera block's offer (null: no laparoscope in a camera port): whether the field takes the learner's aim now
 * (`stepVerdict` of an aim at the whole field) — the camera holder's, or the operator's on an unheld camera port, with a
 * picture — and, if not, why.
 */
export function cameraOffer(f: FieldSeat, v: FieldView): CameraOffer | null {
  const cam = v.camera;
  if (!cam) return null;
  const verdict = stepVerdict(f, { op: "aim", port: cam.port });
  const refusal = verdictReason(verdict);
  return { port: cam.port, at: cam.at, zoom: cam.zoom, holder: holderOf(f, cam.holder), aims: verdict === null, ...(refusal ? { refusal } : {}) };
}

/** The instrument table as the learner reads it (`tableOffer`): what is on it, what was passed and waits, and passing. */
export interface TableOffer {
  instruments: InstrumentId[];
  passed: FieldView["passed"];
  /**
   * Passing, for a place holding the instrument table: to whom each instrument may go (undefined: the operator) — the
   * operator, and a member whose controls let them put it in — where the field takes the pass now; null: not the
   * learner's to pass.
   */
  pass: { to: Partial<Record<InstrumentId, (string | undefined)[]>> } | null;
}

/** Whether a member's controls let them put an instrument in (core `fieldGate` of their own insert: its control is the instrument's). */
function mayPutIn(f: FieldSeat, who: string, instrument: InstrumentId): boolean {
  const port = f.s.procedure?.ports[0]?.site ?? "A";
  return fieldGate(f.c, f.s, f.facility, { op: "insert", port, instrument }, memberBody(f.c, f.s, who)) === null;
}

/**
 * The Table section's offer: the case's instruments, the passes waiting, and — holding the instrument table — whom the
 * learner may pass each instrument to: the operator, or a member who may put it in (a grasper to whoever holds traction,
 * the laparoscope to the camera holder; an operating instrument to the operator only), where the field takes the pass.
 */
export function tableOffer(f: FieldSeat, def: ProcedureDefinition, v: FieldView): TableOffer {
  const me = learnerRef(f);
  const instruments = def.instruments.map((i) => i.id);
  let pass: TableOffer["pass"] = null;
  if (typeof me === "string") {
    const to: Partial<Record<InstrumentId, (string | undefined)[]>> = {};
    for (const i of instruments) {
      const takers = [undefined, ...colleaguesOf(f, me).filter((x) => mayPutIn(f, x, i))].filter((x) => stepVerdict(f, { op: "pass", instrument: i, ...(x ? { to: x } : {}) }) === null);
      if (takers.length) to[i] = takers;
    }
    if (Object.keys(to).length) pass = { to };
  }
  return { instruments, passed: v.passed, pass };
}

/* ------------------------------------------------------------------ */
/* Labels of engine values (i18n/surgery.ts)                           */
/* ------------------------------------------------------------------ */

/** An engine value's label in the UI language (`surgery.<group>.<value>`), the value itself when unknown. */
export function label(group: "op" | "signal" | "finding" | "dir" | "force" | "dissection" | "exposure" | "specimen" | "instrument" | "image" | "warn" | "injury" | "bailout" | "unsafe" | "role" | "hand" | "side", value: string): string {
  return trMaybe(`surgery.${group}.${value}`, value);
}

/** "patient's left + caudal" — a pull's named directions. */
export function directionText(names: readonly string[]): string {
  return names.map((n) => label("dir", n)).join(" + ");
}

/** A list of engine values as one localised phrase ("bleeding, the field is obscured"). */
export function labelList(group: Parameters<typeof label>[0], values: readonly string[]): string {
  return joinList(values.map((v) => label(group, v)));
}
