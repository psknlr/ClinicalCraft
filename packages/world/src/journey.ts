/**
 * The record of the patient's journeys (EMBODIED §8.4, §8.7; audit 2026-11-12 P2-11): one leg
 * (`PatientPlaceState.legs`) per way they moved, told in the event log — `patient.departed` when a journey sets
 * off, `patient.arrived` when a leg ends (with the leg: the handover, the follower's own path):
 *
 * - a transport (`transport_patient`): on their bed or a trolley (`TRAVEL_MODES`), or walking beside the body that
 *   takes them; held in transit by that body; on arrival, the colleague at their bedside there who takes over
 *   (`receiverAt`, THE bedside rule; `RECEIVING_ROLES`) — nobody: the one who brought them stays responsible;
 * - a walk with someone (`escort_patient`): their own feet, behind the walker — one leg per walk the walker makes in
 *   the world, or per stretch of a hand-steered walk (closed when the walk together ends or the walker next walks in
 *   the world). The follower has a spot of their own (`PatientPlaceState.spot`, audit 2026-11-12 W3), advanced only by
 *   their own steps: each time the walker gets farther than `FOLLOW_KEEP` from them (or out of a straight step), they
 *   walk their own route, planned for their own body from their own spot (`followerRoute`: walls, windows, closed
 *   doors and furniture by the walking grid — never a line of sight), to the walker's side (`PatientBody.escortSpot`).
 *   A hand-steered walker's move that no one could have walked — farther than `MAX_FOLLOW_STEP` in one sensor pose,
 *   or a route much longer than the step (through a wall or a window), or another level by no connector — moves them
 *   not at all: the walk together ends where they are (`stopped`; `escort.ts` `stopFollowing`), and the jump is no
 *   leg. A world walk of the walker: they walk their own route after it (none: they stop where they are). Their path
 *   and arrival are their own, never inferred from where the walker is;
 * - a relocation (a phase or an intervention, `relocatePatient`): no journey — no departure, nobody in transit, no
 *   handover; the leg names the cause.
 *
 * The stretch of a hand-steered walk is transient (`TransportHost.follow`): a snapshot does not keep it.
 */
import { RECEIVING_ROLES, TRAVEL_MODES } from "./capabilities.js";
import type { ActorId, ActorState, BodyPosture, EntityId, LegEnd, PatientLeg, PatientPlaceState, PathPoint, TravelMode, WorldEvent } from "./contracts.js";
import { pluggedIn, unplugIfAway, type EffectsHost } from "./effects.js";
import { connectorInfos, levelElevation } from "./levels.js";
import type { Area } from "./raster.js";

/** How many legs of the patient's journey the world keeps (`PatientPlaceState.legs`, oldest dropped). */
export const MAX_PATIENT_LEGS = 32;

/**
 * A follower this close (m, flat, same level) to the walker — and a straight step from them (`PatientBody.clearStep`:
 * no wall, closed door or window between) — stays where they are: they step only when the walker gets away.
 */
export const FOLLOW_KEEP = 1.2;

/** Most points one stretch of a hand-steered walk keeps (the oldest intermediate ones are thinned out). */
const MAX_STRETCH_POINTS = 256;

/** The farthest (m, flat) a follower walks for one sensor pose of the walker (beyond `FOLLOW_KEEP`): farther, no one walked it. */
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
  /** What the grids hold of the patient's body (`TransportHost.patientStamp`; the follower's step keeps it up to date). */
  patientStamp: { key: string; posture: BodyPosture | null; body: { level: string; area: Area } | null };
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Two points of a path closer than this (m, same level) are one: a step to it is no step. */
const SAME_SPOT = 0.05;
const sameSpot = (a: PathPoint, b: PathPoint) => a.level === b.level && Math.hypot(a.x - b.x, a.z - b.z) < SAME_SPOT;

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

/** The follower's spot now (where the patient walking with someone is: their own spot). */
function spotNow(host: EffectsHost): PathPoint {
  const p = host.d.patient.place()!;
  return { x: p.x, z: p.z, level: p.level };
}

/** Is the follower beside the walker now — within `FOLLOW_KEEP` on their level, a straight step from them? */
function beside(host: EffectsHost, walker: ActorState, at: PathPoint): boolean {
  const w = walker.pose;
  return at.level === w.level && Math.hypot(at.x - w.x, at.z - w.z) <= FOLLOW_KEEP && host.d.patient.clearStep(w.level, w, at);
}

/**
 * The follower's own route from `from` to `to` (audit W3): planned for the patient's own body from their own spot —
 * by the walking grid (walls, windows, closed and locked doors, furniture, obstacles), through the access zones and
 * connectors of the one who walks them (escorted) — at most `maxLength` m; its points and where it ends, or null when
 * no one could walk it there. The planner starts from the free cell nearest their spot: never one beyond a wall or a
 * window.
 */
function followerRoute(host: JourneyHost, walker: ActorState, from: PathPoint, to: PathPoint, maxLength: number): { path: PathPoint[]; end: PathPoint } | null {
  const body = host.d.patient;
  const plan = host.d.backend.plan({
    actorId: body.id!,
    from: { x: from.x, y: levelElevation(host.d.facility, from.level), z: from.z, yaw: walker.pose.yaw, pitch: 0, level: from.level },
    goal: { kind: "point", x: to.x, z: to.z, level: to.level },
    role: walker.role,
  });
  if (!plan.ok || plan.length > maxLength + 1e-6) return null;
  const path = plan.path.map((p) => ({ x: p.x, z: p.z, level: p.level }));
  const first = path[0];
  if (first && first.level === from.level && !body.clearStep(from.level, from, first)) return null;
  const end = { x: plan.target.x, z: plan.target.z, level: plan.target.level };
  return { path: path.length ? path : [end], end };
}

/**
 * Store where the follower stepped to (their own spot, facing `rot`): a world walk's arrival as a change of the world,
 * a hand-steered step as a sensor update's consequence (the patient's own version only). A device whose leads were on
 * them that no longer stands by them comes off (audit W2). Returns those events.
 */
function stepTo(host: JourneyHost, at: PathPoint, rot: number, sensor: boolean, actorId: ActorId): WorldEvent[] {
  const body = host.d.patient;
  const st = body.state()!;
  const plugged = pluggedIn(host);
  const next: PatientPlaceState = { ...st, spot: { level: at.level, x: at.x, z: at.z, rot } };
  if (sensor) host.d.store.sensorPatch(body.id!, { patient: next });
  else host.d.store.patchEntity(body.id!, { patient: next });
  // walking with someone they have no body box: nothing to re-stamp on the grids, only what the stamp says of them
  host.patientStamp = { key: body.bodyKey(), posture: body.posture(), body: body.body() };
  return plugged.flatMap((id) => unplugIfAway(host, actorId, id, "escort_patient"));
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
    const now = spotNow(host);
    const last = s.path[s.path.length - 1];
    const path = last && sameSpot(last, now) ? [...s.path] : [...s.path, now];
    const leg: PatientLeg = { by: s.by, role: s.role, from: s.from, to: placeEnd(host), departedAt: s.departedAt, arrivedAt: host.d.clinical.clock(), monitor: null, status, kind: "escort", mode: "walk", vehicle: null, distance: pathLength(path), receivedBy: null, receivedRole: null };
    out.push(recordLeg(host, leg, path));
  }
  const walker = host.d.store.actor(s.by);
  if (then === "arm" && walker && body.escort() === s.by) followArm(host, walker);
  return out;
}

/**
 * The follower's own step from where they stand (`from`) to the walker's side (`to`) after a sensor pose of the walker:
 * on one level, their own route (`followerRoute`) when the walker is at most `MAX_FOLLOW_STEP` beyond `FOLLOW_KEEP`
 * away and the route at most twice the straight distance and a little more (round a corner, through a door — never a
 * detour round the building: that move was a jump, or through a wall or a window); to another level, the ride of a
 * connector both spots lie by (the lift or the stairs the walker took), on their own route when the planner has one.
 * Null when no one walked it.
 */
function stepOf(host: JourneyHost, walker: ActorState, from: PathPoint, to: PathPoint): { path: PathPoint[]; end: PathPoint } | null {
  if (from.level !== to.level) {
    const near = (p: PathPoint) => (stop: { level: string; x: number; z: number }) => stop.level === p.level && Math.hypot(stop.x - p.x, stop.z - p.z) <= CONNECTOR_REACH;
    if (!connectorInfos(host.d.locator.facility).some((c) => c.stops.some(near(from)) && c.stops.some(near(to)))) return null;
    return followerRoute(host, walker, from, to, Infinity) ?? { path: [to], end: to };
  }
  const gap = Math.hypot(to.x - from.x, to.z - from.z);
  if (gap > MAX_FOLLOW_STEP + FOLLOW_KEEP) return null;
  return followerRoute(host, walker, from, to, 2 * gap + 1);
}

/**
 * The walker of a patient walking with them moved by hand (a sensor pose): when the walker got away from them, the
 * follower takes their own step to the walker's side (`stepOf`) — the stretch sets off at the first, and their path
 * goes on with it. Returns where the follower stands when no one could have walked the walker's move (the walk
 * together is then to end there: `escort.ts` `stopFollowing` — they did not move), else null.
 */
export function followSensor(host: JourneyHost, walker: ActorState): PathPoint | null {
  const body = host.d.patient;
  if (!body.id || body.escort() !== walker.id) return null;
  if (host.follow?.by !== walker.id) followArm(host, walker);
  const s = host.follow!;
  const here = spotNow(host);
  if (beside(host, walker, here)) return null;
  const target = body.escortSpot(walker.pose);
  const step = stepOf(host, walker, here, target);
  if (!step) return here;
  // nowhere nearer the walker's side to go (it is taken, or blocked): they stay where they are, nothing changes
  if (sameSpot(step.end, here)) return null;
  setOff(host, s);
  s.path.push(...step.path);
  if (s.path.length > MAX_STRETCH_POINTS) s.path.splice(1, s.path.length - MAX_STRETCH_POINTS);
  stepTo(host, step.end, target.rot, true, walker.id);
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
 * After a world walk of the walker: the follower walks their own route from their own spot to the walker's side where
 * the walker arrived (`followerRoute`, any length: they went the same way) — and that is the leg (`stopped` when the
 * walk was cut short). None (the walker went where they cannot follow): they did not move — `stoppedAt` is where they
 * stand, and the walk together is to end there (`escort.ts` `stopFollowing`, which records the leg).
 */
export function followWalkEnd(host: JourneyHost, interrupted: boolean): { events: WorldEvent[]; stoppedAt: PathPoint | null } {
  const s = host.follow;
  const walker = s ? host.d.store.actor(s.by) : null;
  if (!s || !walker) return { events: [], stoppedAt: null };
  const body = host.d.patient;
  const here = spotNow(host);
  const events: WorldEvent[] = [];
  if (!beside(host, walker, here)) {
    const target = body.escortSpot(walker.pose);
    const own = followerRoute(host, walker, here, target, Infinity);
    if (!own) return { events: [], stoppedAt: here };
    if (!sameSpot(own.end, here)) {
      s.path.push(...own.path);
      events.push(...stepTo(host, own.end, target.rot, false, walker.id));
    }
  }
  return { events: [...events, ...closeStretch(host, interrupted ? "stopped" : "arrived", "arm")], stoppedAt: null };
}
