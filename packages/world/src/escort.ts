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
 * transfer), when clinical state no longer lets them walk (`endEscortIfUnable`, from `refreshPatient`: they
 * lie down, or stop, where they are), and when a hand-steered walker moves where no one could have followed (a jump
 * of the body, through a wall: `stopFollowing` — they stop where they last were). No time is charged: the walking is
 * the walker's own.
 *
 * Their walk is recorded as their own (audit 2026-11-12 P2-11; `journey.ts`): each walk of the walker in the world —
 * and each stretch of a hand-steered walk — is a leg with the follower's own path (a step behind, along the walker's
 * way) and where they arrived, told by `patient.departed` / `patient.arrived`.
 */
import type { ActorState, BodyPosture, EntityId, PatientPlaceState, WorldActionRequest, WorldEvent } from "./contracts.js";
import type { Outcome } from "./effects.js";
import { worldMessage } from "./i18n.js";
import { closeStretch, followArm } from "./journey.js";
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

/** The stored place without an escort or a posture asked for (the keys left out: snapshots stay as they were before). */
function without(st: PatientPlaceState): PatientPlaceState {
  const { escort: _escort, asked: _asked, ...rest } = st;
  void _escort;
  void _asked;
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
  if (!start) {
    // the walk together ends where they are: its last leg first, then they wait on a free spot there
    const walked = closeStretch(host, "arrived", "end");
    const event = commit(host, stopHere(host, body.state()!, "standing"), actor.id);
    const ended = host.emit({ type: "patient.escort", entityId: patientId, escort: null, actorId: actor.id });
    return { status: "completed", message: worldMessage("ok.patientWaits", L, { patient: name, place: locator.regionName(body.place()!) }), events: [...walked, event, ended] };
  }
  // walking with someone else until now: that walk ends here (its own leg)
  const walked = closeStretch(host, "arrived", "end");
  // they get up and come along: no bed space, no provider, no support any more — the place is the walker's side
  const here = body.place()!;
  const next: PatientPlaceState = { ...without(body.state()!), slot: null, provider: null, spot: { level: here.level, x: here.x, z: here.z, rot: here.rot }, posture: null, support: null, escort: actor.id };
  const event = commit(host, next, actor.id);
  const started = host.emit({ type: "patient.escort", entityId: patientId, escort: actor.id, actorId: actor.id });
  // their own walk starts from here (a leg per walk of the walker: `journey.ts`)
  followArm(host, actor);
  return { status: "completed", message: worldMessage("ok.patientFollows", L, { patient: name }), events: [...walked, event, started] };
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
 * The walker went where the patient walking with them cannot have followed (`journey.ts` `followSensor`: a jump of a
 * hand-steered body, through a wall, another level by no connector): the walk together ends — the patient stopped
 * where they last were (`at`), standing on a free spot there, and the leg is recorded `stopped`.
 */
export function stopFollowing(host: TransportHost, at: { level: string; x: number; z: number }): WorldEvent[] {
  const body = host.d.patient;
  const st = body.state();
  if (!st || !body.id || !body.escort(st)) return [];
  const rot = body.place()?.rot ?? 0;
  const cell = freeCellNear(host.d.grids, host.d.visibility, at.level, { minX: at.x, maxX: at.x, minZ: at.z, maxZ: at.z }, 1.5, null) ?? { x: at.x, z: at.z };
  const moved = commit(host, { ...without(st), slot: null, provider: null, spot: { level: at.level, x: cell.x, z: cell.z, rot }, posture: "standing", support: null }, null);
  const walked = closeStretch(host, "stopped", "end");
  const ended = host.emit({ type: "patient.escort", entityId: body.id, escort: null, actorId: null });
  return [moved, ...walked, ended];
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
  // the walk stopped short where they are (its last leg), then they stop there
  closeStretch(host, "stopped", "end");
  commit(host, stopHere(host, body.state()!, lying ? null : "standing"), null);
  host.emit({ type: "patient.escort", entityId: body.id, escort: null, actorId: null });
  return true;
}
