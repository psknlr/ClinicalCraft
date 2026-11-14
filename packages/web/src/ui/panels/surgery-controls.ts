/**
 * The surgery window's controls as data (pure — no DOM): when the window is offered, which actions the
 * instrument in a port offers, the `operate` ops the controls submit, the identification choices and
 * the localised labels of the engine's values. The engine decides every step — a button here is an
 * offer, never a verdict: what it refuses comes back as its rejection message.
 *
 * The window by place (docs/PROCEDURE.md §7): what the learner's place may do — who holds each port, which ports they
 * may take, hand back or hand on, what they may put in or ask to be passed, what they may do through the ports they
 * hold, the camera and the instrument table — is asked of core: the field's gates before the physics (`stepOffered`:
 * `COLLEAGUE_OPS`, `stepPartyRefusal`, `seatCheck` with each body's controls) and the instrument vocabulary
 * (`INSTRUMENT_OPS`, `colleaguePortFits`). The operating learner (no place) is offered what the instrument does, as
 * always; the field refuses the rest with its reason.
 */
import type { CaseDefinition, Controls, DomainEvent, FacilityDefinition, FieldView, InstrumentId, ProcedureDefinition, ProcedureOp, SessionState, ZoomLevel } from "@clinicalcraft/core";
import {
  bodyControls,
  COLLEAGUE_OPS,
  COLLEAGUE_PORTS,
  colleaguePortFits,
  effectiveTeam,
  ENERGY_INSTRUMENTS,
  INSTRUMENT_OPS,
  LEARNER_BODY,
  memberBody,
  normaliseStep,
  operatorOf,
  passingRequired,
  procedureStateOf,
  refOfBody,
  seatCheck,
  stepPartyRefusal,
  t,
  UNCERTAIN,
  vocabularyStructures,
  waitingPass,
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
}

/**
 * Whom the learner works the operative field as (core `refOfBody` of the learner's body): undefined — the operator (no
 * place); a staff id — the member whose place the learner holds; null — no part (never the learner's body, in fact).
 */
export function learnerRef(f: FieldSeat): string | null | undefined {
  return refOfBody(f.c, f.s, LEARNER_BODY);
}

/**
 * Whether the field's gates let the learner send a step — what core says before the physics, as the session's own
 * precheck does: a step only the operator takes is not a colleague's (`COLLEAGUE_OPS`); whom it names takes part
 * (`stepPartyRefusal`); and the controls cover it, the learner's place's and whoever takes a port's (`seatCheck`, each
 * body's own: `bodyControls` for the field). The physics (who holds a port, what is in it) answers the rest.
 */
export function stepOffered(f: FieldSeat, op: ProcedureOp): boolean {
  const me = learnerRef(f);
  if (me === null) return false;
  const step = normaliseStep(f.c, f.s, op, me);
  if (step.actor !== undefined && !COLLEAGUE_OPS.has(step.op.op)) return false;
  if (stepPartyRefusal(f.c, f.s, step.op, step.actor)) return false;
  const controlsOf = (who: string): Controls => bodyControls(f.c, f.s, f.facility, memberBody(f.c, f.s, who), "field");
  return seatCheck(f.c, { ...f.s, procedure: procedureStateOf(f.s) }, step.op, step.actor, controlsOf) === null;
}

/** Who holds a port (or the camera), as the learner reads it: you, the operator (the stand-in while you hold a place) or a colleague. */
export type Holder = { kind: "you" } | { kind: "operator"; ref: string | null } | { kind: "colleague"; ref: string };

/** The holder of a port the field records (`holder`; absent: the operator), through core `memberBody`: your place's member is you. */
export function holderOf(f: FieldSeat, holder: string | undefined): Holder {
  if (memberBody(f.c, f.s, holder ?? "surgeon") === LEARNER_BODY) return { kind: "you" };
  return holder === undefined ? { kind: "operator", ref: operatorOf(f.c, f.s) ?? null } : { kind: "colleague", ref: holder };
}

/** What the learner's place may do with one port (`portsForPlace`): each an `operate` op the field's gates let through. */
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
  /** Hand it, from the learner's hands, to a member of the team whose controls cover its instrument. */
  handTo: { to: string; op: ProcedureOp }[];
  /** Instruments the learner may put into it (an empty port); operating: every instrument on the table, as always. */
  insert: InstrumentId[];
  /** Instead of an insert, while every instrument is passed first and none waits: the instrument asked for, and of whom. */
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

/**
 * The ports as the learner's place may work them (docs/PROCEDURE.md §7): who holds each; Take, Hand back and Hand to by
 * the controls (a colleague takes a port from the operator — another colleague hands theirs over themselves); what may
 * be put in (a colleague: the laparoscope into a camera port, a grasper or the suction into an assist port — the
 * instrument's control); while every instrument is passed first (`passingRequired`: the scrub nurse's place) an insert
 * with no pass waiting becomes a request for one; and the withdrawal of the instrument in a port the learner holds.
 */
export function portsForPlace(f: FieldSeat, def: ProcedureDefinition, v: FieldView): PortOffer[] {
  const me = learnerRef(f);
  const field = procedureStateOf(f.s);
  const held = (who: string) => v.ports.filter((p) => p.holder === who).length;
  return v.ports.map((p): PortOffer => {
    const holder = holderOf(f, p.holder);
    const none: PortOffer = { port: p.port, instrument: p.instrument, holder, mine: false, take: null, handBack: null, handTo: [], insert: [], askFor: [], withdraw: null };
    if (me === null) return none;
    const mine = (p.holder ?? undefined) === me;
    const offer = (op: ProcedureOp): ProcedureOp | null => (stepOffered(f, op) ? op : null);
    let take: ProcedureOp | null = null;
    if (!mine && p.instrument) {
      if (me !== undefined && p.holder === undefined) take = offer({ op: "hand-over", port: p.port, to: me });
      else if (me === undefined && p.holder !== undefined) take = offer({ op: "hand-over", port: p.port });
    }
    const handBack = mine && p.instrument && me !== undefined ? offer({ op: "hand-over", port: p.port }) : null;
    const handTo = mine && p.instrument ? colleaguesOf(f, me).filter((to) => held(to) < COLLEAGUE_PORTS).flatMap((to) => {
      const op = offer({ op: "hand-over", port: p.port, to });
      return op ? [{ to, op }] : [];
    }) : [];
    let insert: InstrumentId[] = [];
    const askFor: PortOffer["askFor"] = [];
    if (!p.instrument && (p.holder === undefined || mine)) {
      const table = def.instruments.map((i) => i.id);
      if (me === undefined) insert = table;
      else {
        const own = table.filter((i) => colleaguePortFits(p.role, i) && stepOffered(f, { op: "insert", port: p.port, instrument: i }));
        if (!passingRequired(f.c, f.s)) insert = own;
        else {
          const passer = passerFor(f, me);
          for (const i of own) {
            if (waitingPass(field, i, me) >= 0) insert.push(i);
            else if (passer) askFor.push({ instrument: i, to: passer });
          }
        }
      }
    }
    const withdraw = mine && p.instrument ? (me === undefined ? { op: "withdraw" as const, port: p.port } : offer({ op: "withdraw", port: p.port })) : null;
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
 * suction and irrigation, the camera's — by the controls; never the operator's own steps).
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
  /** The learner aims and zooms it: the camera holder — or the operator while nobody holds the camera port — by the controls. */
  aims: boolean;
}

/** The camera block's offer (null: no laparoscope in a camera port). Aiming is the camera holder's, or the operator's on an unheld camera port. */
export function cameraOffer(f: FieldSeat, v: FieldView): CameraOffer | null {
  const cam = v.camera;
  if (!cam) return null;
  const me = learnerRef(f);
  const aims = me !== null && (cam.holder ?? undefined) === me && stepOffered(f, { op: "aim", port: cam.port });
  return { port: cam.port, at: cam.at, zoom: cam.zoom, holder: holderOf(f, cam.holder), aims };
}

/** The instrument table as the learner reads it (`tableOffer`): what is on it, what was passed and waits, and passing. */
export interface TableOffer {
  instruments: InstrumentId[];
  passed: FieldView["passed"];
  /** Passing, for a place holding the instrument table: to whom (undefined: the operator) — null: not the learner's. */
  pass: { to: (string | undefined)[] } | null;
}

/** The Table section's offer: the case's instruments, the passes waiting, and — holding the instrument table — whom the learner may pass to. */
export function tableOffer(f: FieldSeat, def: ProcedureDefinition, v: FieldView): TableOffer {
  const me = learnerRef(f);
  const instruments = def.instruments.map((i) => i.id);
  const probe = instruments[0];
  let pass: TableOffer["pass"] = null;
  if (typeof me === "string" && probe) {
    const to = [undefined, ...colleaguesOf(f, me)].filter((x) => stepOffered(f, { op: "pass", instrument: probe, ...(x ? { to: x } : {}) }));
    if (to.length) pass = { to };
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
