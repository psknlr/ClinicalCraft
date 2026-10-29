/**
 * Walking with the patient (EMBODIED §8.4): `escort_patient` — "follow me" — and `release_patient` — "wait here".
 *
 * A patient who can walk (`PatientBody.walkProblem`: not lying by clinical state, able to respond, not in
 * distress) gets up and walks with the actor who asked, from conversation range: from then on the patient is at
 * that actor's side wherever the actor goes — a world navigation, a staff member's walk, or the learner's own
 * avatar steered by hand, whose sensor pose takes the patient along without a stored step (the place is derived,
 * `PatientBody.escortSpot`). Every rule that measures from the patient follows: the bedside, conversation range,
 * goals on the patient, perception. Their bed stays where it is.
 *
 * It ends when the actor asks them to wait (`release_patient`: they stand where they are, a body on the floor
 * again), when someone takes them somewhere (`transport_patient`: they arrive there) or the team moves them (a
 * transfer), and when clinical state no longer lets them walk (`endEscortIfUnable`, from `refreshPatient`: they
 * lie down, or stop, where they are). No time is charged: the walking is the walker's own.
 */
import type { ActorState, BodyPosture, EntityId, PatientPlaceState, WorldActionRequest, WorldEvent } from "./contracts.js";
import type { Outcome } from "./effects.js";
import { worldMessage } from "./i18n.js";
import { freeCellNear, type PatientBody } from "./patient.js";
import type { TransportHost } from "./transport.js";

const grow = (a: { minX: number; maxX: number; minZ: number; maxZ: number }, m: number) => ({ minX: a.minX - m, maxX: a.maxX + m, minZ: a.minZ - m, maxZ: a.maxZ + m });

/** Store the patient's place, re-stamp the grids where the body was and is, and say where they went. */
function commit(host: TransportHost, next: PatientPlaceState, by: string | null): WorldEvent {
  const body = host.d.patient;
  const id = body.id!;
  const from = body.place()!;
  const old = host.patientStamp.body;
  host.d.store.patchEntity(id, { patient: next });
  const now = body.body();
  for (const b of [old, now]) if (b) host.invalidate({ level: b.level, ...grow(b.area, 0.1) });
  host.patientStamp = { key: body.bodyKey(), posture: body.posture(), body: now };
  const to = body.place()!;
  const distance = from.level === to.level ? Math.round(Math.hypot(to.x - from.x, to.z - from.z) * 100) / 100 : 0;
  return host.emit({ type: "patient.moved", entityId: id, from, to, by, distance, path: [] });
}

/** The stored place without an escort (the key left out: snapshots stay as they were before anyone walked together). */
function without(st: PatientPlaceState): PatientPlaceState {
  const { escort: _escort, ...rest } = st;
  void _escort;
  return rest;
}

/**
 * Where a patient who stops walking with someone stays: a free spot by where they are now (they no longer stand
 * on top of anyone), in `posture` (standing; lying down where clinical state lays them).
 */
function stopHere(host: TransportHost, st: PatientPlaceState, posture: BodyPosture | null): PatientPlaceState {
  const body = host.d.patient;
  const p = body.place()!;
  const cell = freeCellNear(host.d.grids, host.d.visibility, p.level, { minX: p.x, maxX: p.x, minZ: p.z, maxZ: p.z }, 1.5, null) ?? { x: p.x, z: p.z };
  return { ...without(st), slot: null, provider: null, spot: { level: p.level, x: cell.x, z: cell.z, rot: p.rot }, posture, support: null };
}

/** `escort_patient` / `release_patient` (the spatial phase checked the actor is within conversation range). */
export function escortPatient(host: TransportHost, _request: WorldActionRequest, actor: ActorState, patientId: EntityId, start: boolean): Outcome {
  const { patient: body, locale: L, locator } = host.d;
  const name = locator.name(patientId);
  const st = body.state()!;
  if (!start) {
    const event = commit(host, stopHere(host, st, "standing"), actor.id);
    const ended = host.emit({ type: "patient.escort", entityId: patientId, escort: null, actorId: actor.id });
    return { status: "completed", message: worldMessage("ok.patientWaits", L, { patient: name, place: locator.regionName(body.place()!) }), events: [event, ended] };
  }
  // they get up and come along: no bed space, no provider, no support any more — the place is the walker's side
  const here = body.place()!;
  const next: PatientPlaceState = { ...st, slot: null, provider: null, spot: { level: here.level, x: here.x, z: here.z, rot: here.rot }, posture: null, support: null, escort: actor.id };
  const event = commit(host, next, actor.id);
  const started = host.emit({ type: "patient.escort", entityId: patientId, escort: actor.id, actorId: actor.id });
  return { status: "completed", message: worldMessage("ok.patientFollows", L, { patient: name }), events: [event, started] };
}

/** Why the patient cannot start (`start`) or stop walking with this actor now — a precondition — or null. */
export function escortProblem(body: PatientBody, name: string, actor: ActorState, start: boolean, L: string): string | null {
  if (!body.id) return worldMessage("pre.noPatient", L);
  const by = body.escort();
  if (!start) return by ? null : worldMessage("pre.notEscorted", L, { patient: name });
  if (by === actor.id) return worldMessage("pre.alreadyEscorted", L, { patient: name });
  const problem = body.walkProblem();
  return problem ? worldMessage(`pre.cannotWalk.${problem}`, L, { patient: name }) : null;
}

/**
 * Clinical state no longer lets the patient walk (laid flat, sedated, in distress): they stop where they are —
 * lying down there when clinical state has them lying — and the walk together ends. True when it did.
 */
export function endEscortIfUnable(host: TransportHost): boolean {
  const body = host.d.patient;
  const st = body.state();
  if (!st || !body.id || !body.escort(st) || !body.walkProblem(st)) return false;
  const lying = body.clinicalPostureOf(st) === "lying";
  commit(host, stopHere(host, st, lying ? null : "standing"), null);
  host.emit({ type: "patient.escort", entityId: body.id, escort: null, actorId: null });
  return true;
}
