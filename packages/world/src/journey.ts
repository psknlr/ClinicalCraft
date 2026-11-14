/**
 * The record of the patient's journeys (EMBODIED §8.4, §8.7; audit 2026-11-12 P2-11): one leg
 * (`PatientPlaceState.legs`) per way they moved, told in the event log — `patient.departed` when a journey sets
 * off, `patient.arrived` when a leg ends (with the leg: the handover, the follower's own path):
 *
 * - a transport (`transport_patient`): on their bed or a trolley (`TRAVEL_MODES`), or walking beside the body that
 *   takes them; held in transit by that body; on arrival, the colleague at their bedside there who takes over
 *   (`receiverAt`, THE bedside rule; `RECEIVING_ROLES`) — nobody: the one who brought them stays responsible;
 * - a walk with someone (`escort_patient`): their own feet, a step behind the walker on the walker's way — one leg
 *   per walk the walker makes in the world (the follower's path: from where they stood, along the walker's route, to
 *   where they arrived), or per stretch of a hand-steered walk (closed when the walk together ends or the walker next
 *   walks in the world). A hand-steered walker's every move is checked as the follower's own step (`followSensor`):
 *   a straight step clear of walls, else a short route the planner finds around them, or a ride in a lift or up the
 *   stairs the walker took — otherwise (a jump of the body, through a wall, another level by no connector) the walk
 *   together ends where the follower last was (`stopped`). The follower's own path and arrival are recorded, never
 *   inferred from where the walker is;
 * - a relocation (a phase or an intervention, `relocatePatient`): no journey — no departure, nobody in transit, no
 *   handover; the leg names the cause.
 *
 * The stretch of a hand-steered walk is transient (`TransportHost.follow`): a snapshot does not keep it.
 */
import { RECEIVING_ROLES, TRAVEL_MODES } from "./capabilities.js";
import type { ActorId, ActorState, EntityId, LegEnd, PatientLeg, PatientPlaceState, PathPoint, Pose, TravelMode, WorldEvent } from "./contracts.js";
import type { EffectsHost } from "./effects.js";
import { connectorInfos } from "./levels.js";

/** How many legs of the patient's journey the world keeps (`PatientPlaceState.legs`, oldest dropped). */
export const MAX_PATIENT_LEGS = 32;

/** A hand-steered walker's positions closer than this (m) to the last one recorded are not added to the follower's path. */
const STEP = 0.5;

/** Most points one stretch of a hand-steered walk keeps (the oldest intermediate ones are thinned out). */
const MAX_STRETCH_POINTS = 256;

/** The farthest (m, flat) a follower walks between two sensor poses of the walker: farther, no one walked it. */
export const MAX_FOLLOW_STEP = 5;

/** A level change is a ride (or a flight of stairs) when both spots lie this close (m) to the same connector's stops. */
const CONNECTOR_REACH = 6;

/**
 * The stretch a patient walking with someone is on (armed when the walk together starts and after each leg; it sets
 * off — `departedAt`, the departure event — when the walker first moves).
 */
export interface FollowStretch {
  by: ActorId;
  role: string;
  from: LegEnd;
  /** Simulated minute it set off (null: not yet — the walker has not moved). */
  departedAt: number | null;
  /** The follower's own path so far (where they stood first). */
  path: PathPoint[];
}

/** What the journey record needs from the bus (the transport host's view). */
export interface JourneyHost extends EffectsHost {
  /** The stretch of a hand-steered walk together now, or null. */
  follow: FollowStretch | null;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Where a leg starts or ends, from a stored place: the bed space, the device, the room. */
export function legEnd(host: EffectsHost, st: Pick<PatientPlaceState, "slot" | "provider" | "spot">): LegEnd {
  const room = st.slot ? (host.d.patient.slot(st.slot)?.room ?? null) : st.spot ? host.d.registry.roomAt(st.spot.level, st.spot.x, st.spot.z) : null;
  return { slot: st.slot, provider: st.provider, room };
}

/** Where the patient is now as a leg's end (a walk together: the room their spot is in). */
export function placeEnd(host: EffectsHost): LegEnd {
  const p = host.d.patient.place()!;
  return { slot: p.slot, provider: p.provider, room: p.room };
}

/** How a patient wheeled on this equipment travels (`TRAVEL_MODES`; another trolley type: a trolley), or on foot. */
export function travelMode(host: EffectsHost, vehicle: EntityId | null): TravelMode {
  if (!vehicle) return "walk";
  const type = host.d.registry.entity(vehicle)?.equipmentType?.id;
  return (type && TRAVEL_MODES[type]) || "trolley";
}

/** Flat metres along a path (a ride between levels counts nothing). */
export function pathLength(path: readonly PathPoint[]): number {
  let m = 0;
  for (let i = 1; i < path.length; i++) if (path[i]!.level === path[i - 1]!.level) m += Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.z - path[i - 1]!.z);
  return r2(m);
}

/**
 * The handover (`PatientLeg.receivedBy`): a colleague other than the one who brought the patient, of a role that takes
 * over a patient (`RECEIVING_ROLES`), at their bedside where they are now (THE bedside rule), nearest first.
 */
export function receiverAt(host: EffectsHost, by: ActorId | null): ActorState | null {
  const loc = host.d.locator;
  const patient = loc.patient();
  if (!patient) return null;
  const near: { a: ActorState; d: number }[] = [];
  for (const a of host.d.store.actors()) {
    if (a.id === by || !RECEIVING_ROLES.includes(a.role)) continue;
    const p = loc.place(a.id);
    if (p && loc.atBedside(p)) near.push({ a, d: loc.distance(a.pose, patient) });
  }
  near.sort((x, y) => x.d - y.d || (x.a.id < y.a.id ? -1 : x.a.id > y.a.id ? 1 : 0));
  return near[0]?.a ?? null;
}

/** Add a leg to the patient's record (the last `MAX_PATIENT_LEGS`) and tell it: `patient.arrived`. */
export function recordLeg(host: EffectsHost, leg: PatientLeg, path?: readonly PathPoint[]): WorldEvent {
  const body = host.d.patient;
  const st = body.state()!;
  host.d.store.patchEntity(body.id!, { patient: { ...st, legs: [...(st.legs ?? []), leg].slice(-MAX_PATIENT_LEGS) } });
  return host.emit({ type: "patient.arrived", entityId: body.id!, leg, ...(path ? { path: path.map((p) => ({ ...p })) } : {}) });
}

/** The legs a stored place keeps, with one more (the last `MAX_PATIENT_LEGS`). */
export function withLeg(st: PatientPlaceState, leg: PatientLeg): PatientLeg[] {
  return [...(st.legs ?? []), leg].slice(-MAX_PATIENT_LEGS);
}

/* ------------------------------------------------------------------ */
/* Walking with someone: the follower's own path and arrival            */
/* ------------------------------------------------------------------ */

/** The follower's spot now (where the patient walking with someone is). */
function spotNow(host: EffectsHost): PathPoint {
  const p = host.d.patient.place()!;
  return { x: p.x, z: p.z, level: p.level };
}

/** Arm a stretch of the walk together where the follower stands now (the walk together starts, or goes on after a leg). */
export function followArm(host: JourneyHost, walker: ActorState): void {
  host.follow = { by: walker.id, role: walker.role, from: placeEnd(host), departedAt: null, path: [spotNow(host)] };
}

/** The armed stretch sets off (the walker's first move): the departure (none when it already set off). */
function setOff(host: JourneyHost, s: FollowStretch): WorldEvent[] {
  if (s.departedAt !== null) return [];
  s.departedAt = host.d.clinical.clock();
  return [host.emit({ type: "patient.departed", entityId: host.d.patient.id!, kind: "escort", by: s.by, role: s.role, mode: "walk", vehicle: null, monitor: null, from: s.from, to: null, at: s.departedAt })];
}

/**
 * Close the stretch the follower is on (where they are now): the leg and its event — when it set off. `then`: arm the
 * next one for the same walker (the walk together goes on), or end it (it is over).
 */
export function closeStretch(host: JourneyHost, status: PatientLeg["status"], then: "arm" | "end"): WorldEvent[] {
  const s = host.follow;
  host.follow = null;
  const body = host.d.patient;
  if (!s || !body.id || !body.state()) return [];
  const out: WorldEvent[] = [];
  if (s.departedAt !== null) {
    const path = [...s.path, spotNow(host)];
    const leg: PatientLeg = { by: s.by, role: s.role, from: s.from, to: placeEnd(host), departedAt: s.departedAt, arrivedAt: host.d.clinical.clock(), monitor: null, status, kind: "escort", mode: "walk", vehicle: null, distance: pathLength(path), receivedBy: null, receivedRole: null };
    out.push(recordLeg(host, leg, path));
  }
  const walker = host.d.store.actor(s.by);
  if (then === "arm" && walker && body.escort() === s.by) followArm(host, walker);
  return out;
}

/**
 * The way a follower walks from `from` to `to` when its walker moved by hand: a straight step clear of walls, else a
 * short route around them (the planner's, at most twice the step and a little more), or the ride of a connector both
 * spots lie by — null when no one walked it (a jump, through a wall, another level by no connector).
 */
function stepOf(host: JourneyHost, walker: ActorState, from: PathPoint, to: PathPoint): PathPoint[] | null {
  if (from.level !== to.level) {
    const near = (p: PathPoint) => (stop: { level: string; x: number; z: number }) => stop.level === p.level && Math.hypot(stop.x - p.x, stop.z - p.z) <= CONNECTOR_REACH;
    return connectorInfos(host.d.locator.facility).some((c) => c.stops.some(near(from)) && c.stops.some(near(to))) ? [to] : null;
  }
  const gap = Math.hypot(to.x - from.x, to.z - from.z);
  if (gap > MAX_FOLLOW_STEP) return null;
  if (host.d.visibility.lineOfSight(from.level, from, to)) return [to];
  const plan = host.d.backend.plan({ actorId: walker.id, from: { ...walker.pose, x: from.x, z: from.z, level: from.level }, goal: { kind: "point", x: to.x, z: to.z, level: to.level }, role: walker.role });
  return plan.ok && plan.length <= 2 * gap + 1 ? [...plan.path.slice(1).map((p) => ({ x: p.x, z: p.z, level: p.level })), to] : null;
}

/**
 * The walker of a patient walking with them moved by hand (a sensor pose): the stretch sets off at the first step and
 * the follower's own path goes on to where they are now — the follower's own step (`stepOf`). Returns where the
 * follower stopped when no one could have walked the walker's move (the walk together is then to end there:
 * `escort.ts` `stopFollowing`), else null.
 */
export function followSensor(host: JourneyHost, walker: ActorState): PathPoint | null {
  const body = host.d.patient;
  if (!body.id || body.escort() !== walker.id) return null;
  if (host.follow?.by !== walker.id) followArm(host, walker);
  const s = host.follow!;
  const here = spotNow(host);
  const last = s.path[s.path.length - 1]!;
  if (last.level === here.level && Math.hypot(last.x - here.x, last.z - here.z) < STEP) return null;
  const step = stepOf(host, walker, last, here);
  if (!step) return { ...last };
  setOff(host, s);
  s.path.push(...step);
  if (s.path.length > MAX_STRETCH_POINTS) s.path.splice(1, s.path.length - MAX_STRETCH_POINTS);
  return null;
}

/**
 * Before a world walk of the walker: a hand-steered stretch ends here, and the walk's own leg sets off. Returns those
 * events — or null when the patient does not walk with this actor (else `followWalkEnd` records the leg).
 */
export function followWalkStart(host: JourneyHost, walker: ActorState): WorldEvent[] | null {
  const body = host.d.patient;
  if (!body.id || body.escort() !== walker.id) return null;
  const out = host.follow?.by === walker.id && host.follow.departedAt !== null ? closeStretch(host, "arrived", "arm") : [];
  if (host.follow?.by !== walker.id) followArm(host, walker);
  return [...out, ...setOff(host, host.follow!)];
}

/**
 * After a world walk of the walker (`from`: where the walker started, `route`: its path): the follower walked the same
 * way a step behind — from their own spot, to the walker's start, along the route, to where they arrived now — and
 * that is the leg (`stopped` when the walk was cut short).
 */
export function followWalkEnd(host: JourneyHost, from: Pose, route: readonly PathPoint[], interrupted: boolean): WorldEvent[] {
  const s = host.follow;
  if (!s) return [];
  const walked = route.slice(0, Math.max(0, route.length - 1)).map((p) => ({ ...p }));
  s.path = [s.path[0]!, { x: from.x, z: from.z, level: from.level }, ...walked];
  return closeStretch(host, interrupted ? "stopped" : "arrived", "arm");
}
