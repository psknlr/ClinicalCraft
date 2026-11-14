/**
 * THE screen rule, the device's side (EMBODIED §6, audit 2026-11-12 P2-13): whose bedside a device's own live
 * screen (`vitals` / `ecg`) shows now — what the device is connected to where it stands now, wherever it was
 * wheeled — or nobody. A front-end draws that patient's bedside snapshot (the session's: what `check_vitals` and
 * the monitor panel show) or "no patient"; it never binds a screen to a bed of its own.
 *
 * - nobody: no patient in the encounter, not equipment, no live screen (its type's `screen` is not `vitals` /
 *   `ecg`), or out of service;
 * - a monitor (`interaction: "monitor"`): the patient when it is the patient's monitor where they are now
 *   (`WorldLocator.patientMonitor`: the linked monitor of their bed space, else one at their bedside) — attached
 *   or not, which the snapshot itself says;
 * - any other device (an ECG cart, a defibrillator, a ventilator): the patient when it stands at their bedside
 *   (THE bedside rule) by their bed — no other bed space of the room they are in is nearer to it than they are —
 *   and, for a device with a stored behaviour, while it is on the patient: in a state its type marks `live` (the ECG
 *   cart with its leads on — `connected`, `completed`; idle or only prepared, it shows nobody), else out of its
 *   initial state.
 */
import type { BehaviorSpec } from "./behaviors.js";
import type { EntityId } from "./contracts.js";
import { entityLevel } from "./levels.js";
import type { Placed, WorldLocator } from "./locate.js";

/** The screen kinds that show a patient's bedside live (any other picture is drawn once and shows nobody). */
const LIVE_SCREENS: ReadonlySet<string> = new Set(["vitals", "ecg"]);

/** What the rule reads: where things are now, and a device's behaviour and state. */
export interface ScreenSourceDeps {
  locator: WorldLocator;
  rules: {
    spec(id: EntityId): Pick<BehaviorSpec, "stateSource" | "initial" | "states">;
    state(id: EntityId): string | null;
  };
}

/** The patient whose bedside the live screen of `id` shows now, or null (see the module docs). */
export function screenPatient(d: ScreenSourceDeps, id: EntityId): EntityId | null {
  const loc = d.locator;
  const patient = loc.patientId;
  const e = loc.registry.entity(id);
  if (!patient || !e || e.kind !== "equipment" || !LIVE_SCREENS.has(e.equipmentType?.screen ?? "none") || !loc.state.available(id)) return null;
  if (e.interaction === "monitor") return loc.patientMonitor() === id ? patient : null;
  const p = loc.place(id);
  if (!p || !loc.atBedside(p) || !byPatientsBed(loc, p)) return null;
  const spec = d.rules.spec(id);
  if (spec.stateSource === "stored") {
    const state = d.rules.state(id);
    const live = liveStates(spec);
    if (live.length ? !state || !live.includes(state) : state === spec.initial) return null;
  }
  return patient;
}

/** The states a device's type marks `live` (its screen shows the patient in them), in no particular order. */
export function liveStates(spec: Pick<BehaviorSpec, "states">): string[] {
  return Object.entries(spec.states).flatMap(([id, st]) => (st.live ? [id] : []));
}

/**
 * The state a device in a `live` state goes back to when it is unplugged from the patient (wheeled away): the state
 * its live states are entered from (the ECG cart `connected` or `completed` → `prepared`); null when it is not in a
 * live state, or no operation leads into it.
 */
export function unpluggedState(spec: Pick<BehaviorSpec, "states" | "operations">, state: string | null): string | null {
  let s = state;
  const seen = new Set<string>();
  while (s && spec.states[s]?.live && !seen.has(s)) {
    seen.add(s);
    const into = spec.operations.find((o) => o.to === s && o.from !== "*" && o.from.length > 0);
    if (!into || into.from === "*") return null;
    s = into.from[0] ?? null;
  }
  return s && s !== state ? s : null;
}

/**
 * Does the placed device stand by the patient's bed: is no other bed space of the room the patient is in (on their
 * level) nearer to it than where they are now? A cart wheeled to them qualifies; the equipment of the next bed in
 * the same bay — at the bedside by the room — does not.
 */
export function byPatientsBed(loc: Pick<WorldLocator, "facility" | "patientAnchor" | "patientBody" | "slot">, p: Pick<Placed, "level" | "position">): boolean {
  const a = loc.patientAnchor();
  if (!a || a.level !== p.level) return false;
  const from = (x: number, z: number) => Math.hypot(p.position.x - x, p.position.z - z);
  const theirs = from(a.x, a.z);
  const own = loc.patientBody ? loc.patientBody.slotNow()?.id : loc.slot?.id;
  return !loc.facility.patientSlots.some((s) => s.id !== own && (s.room ?? null) === a.room && entityLevel(loc.facility, s) === a.level && from(s.x, s.z) < theirs - 1e-9);
}
