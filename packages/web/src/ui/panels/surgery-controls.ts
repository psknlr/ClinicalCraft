/**
 * The surgery window's controls as data (pure — no DOM): when the window is offered, which actions the
 * instrument in a port offers, the `operate` ops the controls submit, the identification choices and
 * the localised labels of the engine's values. The engine decides every step — a button here is an
 * offer, never a verdict: what it refuses comes back as its rejection message.
 */
import type { CaseDefinition, DomainEvent, FieldView, InstrumentId, ProcedureDefinition, ProcedureOp } from "@clinicalcraft/core";
import { ENERGY_INSTRUMENTS, INSTRUMENT_OPS, t, vocabularyStructures } from "@clinicalcraft/core";
import { joinList, trMaybe } from "../../i18n/index.js";

/** The surgery window is offered: the case has an operation and the session is in one of its phases. */
export function surgeryOffered(c: CaseDefinition | null | undefined, phase: string | null | undefined): boolean {
  return !!c?.procedure && !!phase && c.procedure.phases.includes(phase);
}

/** An action a port's instrument offers (an `operate` op that names the port). */
export type Control = "retract" | "dissect" | "isolate" | "clip" | "divide" | "coagulate" | "suction" | "irrigate" | "image" | "bag";

/**
 * The actions each instrument offers: the engine's instrument vocabulary (`INSTRUMENT_OPS`, docs/PROCEDURE.md §2),
 * shown as buttons. The engine re-checks every step.
 */
export const INSTRUMENT_CONTROLS = INSTRUMENT_OPS as Readonly<Record<InstrumentId, readonly Control[]>>;

/** Instruments that deliver energy (the "with energy" option of a dissection). */
export { ENERGY_INSTRUMENTS };

/** The actions the instrument in a port offers (none for an empty port or the laparoscope). */
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
 * false (the operator's judgement; the engine records it next to what the field shows). Null for an
 * unknown view.
 */
export function safetyPauseOp(def: ProcedureDefinition, viewId: string, ticked: ReadonlySet<string>): ProcedureOp | null {
  const view = def.views.find((v) => v.id === viewId);
  if (!view) return null;
  return { op: "safety-pause", view: view.id, claims: Object.fromEntries(view.criteria.map((c) => [c.id, ticked.has(c.id)])) };
}

/**
 * What a handle can be named as: every duct and vessel of the operation and of its anatomical variants
 * (the same list whatever the patient's anatomy), by its localised name, sorted by that name — never in
 * the anatomy's order, which is the order handles are given out in.
 */
export function identifyChoices(def: ProcedureDefinition, locale: string): { id: string; name: string }[] {
  const tubular = new Set(["duct", "artery", "vein"]);
  return vocabularyStructures(def)
    .filter((s) => tubular.has(s.kind))
    .map((s) => ({ id: s.id, name: t(s.name, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale) || a.id.localeCompare(b.id));
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
