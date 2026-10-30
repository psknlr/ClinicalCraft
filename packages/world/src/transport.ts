/**
 * Moving the patient (EMBODIED §8, review G8). Two ways:
 *
 * - `transport_patient {destination}` (an operation on the patient, physical class: the clinician, a
 *   porter, a nurse): the body at the patient's side wheels the bed — the trolley the patient lies on — or
 *   walks a patient who can walk (a child to the peak-flow station) to a provider, a bed space or `home`;
 *   accessible routes only (beds take the lift); travel charged once (the walk, `elapse(…, "travel")`); the
 *   patient and the trolley are busy meanwhile; an interrupted walk leaves the patient where it stopped.
 * - `relocatePatient(destination)` (a control the session calls when a transfer is given or a phase with a
 *   location starts): the team moves the patient — nobody's body walks, nothing is charged (the clinical
 *   act's own time) — and it becomes where the patient belongs (`home`).
 *
 * Both commit the same way: the patient's place (`PatientPlaceState`), the trolley parked beside a provider
 * (or wheeled home with the patient), the grids re-stamped where bodies and beds were and are, a
 * `patient.moved` event with the route (the browser animates it).
 */
import { capabilityLabels } from "@clinicalcraft/core";
import { PATIENT_AT_PROVIDER_CAPABILITIES, PATIENT_PERFORMED_CAPABILITIES } from "./capabilities.js";
import type { ActorState, BodyPosture, EntityId, PatientDestination, PatientPlace, PatientPlaceState, PathPoint, PatientRelocation, Pose, WorldActionRequest, WorldEvent } from "./contracts.js";
import { failed, type EffectsHost, type Outcome, type Walk } from "./effects.js";
import { endEscortIfUnable } from "./escort.js";
import { listText, metres, worldMessage } from "./i18n.js";
import { levelElevation } from "./levels.js";
import { freeCellNear, patientProviders, resolveTarget, sameTarget, trolleySpot, type PatientTarget, type TargetDeps } from "./patient.js";
import { footprintArea, type Area } from "./raster.js";

/** The bus side transports need: the patient's body as last stamped on the grids, the transport in progress. */
export interface TransportHost extends EffectsHost {
  /** What the grids hold of the patient's body (`refreshPatient` compares the body now with it). */
  patientStamp: { key: string; posture: BodyPosture | null; body: { level: string; area: Area } | null };
  /** The transport walking now (`PatientPlace.transit`), or null. */
  transit: NonNullable<PatientPlace["transit"]> | null;
}

/** The resolution context of destinations (`patient.ts`) over the bus's services. */
export function targetDeps(host: EffectsHost): TargetDeps {
  const loc = host.d.locator;
  return {
    body: host.d.patient,
    registry: host.d.registry,
    capabilities: (id) => loc.capabilities(id),
    reach: (id) => {
      const p = loc.place(id);
      return p ? loc.reach(p) : 0;
    },
    grids: host.d.grids,
    visibility: host.d.visibility,
    sight: (id) => {
      const p = loc.place(id);
      return p ? loc.sight(p) : null;
    },
    locale: host.d.locale,
  };
}

/**
 * What a transport request names as its destination: `parameters.destination` — `home` (also `back`), a bed
 * space (its slot id), a room (`room:<id>` or the id: its first bed space, else its first device a patient is
 * brought to), an equipment id or alias (a provider; a bed space's own bed is that bed space) — or
 * `parameters.capability` (the equipment providing it), or a navigation `goal` naming an entity or a room.
 */
export function destinationOf(host: EffectsHost, request: WorldActionRequest): PatientDestination | null {
  const { facility, registry } = host.d;
  const params = request.parameters ?? {};
  const capability = typeof params.capability === "string" && params.capability.trim() ? params.capability.trim() : null;
  if (capability) return { capability };
  const fromGoal = (g: unknown): string | null => {
    if (!g || typeof g !== "object") return null;
    const goal = g as { kind?: unknown; id?: unknown };
    if (typeof goal.id !== "string") return null;
    return goal.kind === "room" ? `room:${goal.id.replace(/^room:/, "")}` : goal.id;
  };
  const raw = typeof params.destination === "string" ? params.destination.trim() : (fromGoal(params.goal) ?? fromGoal(request.goal));
  if (!raw) return null;
  if (raw === "home" || raw === "back") return { home: true };
  if (facility.patientSlots.some((s) => s.id === raw)) return { slot: raw };
  const roomId = raw.startsWith("room:") ? raw.slice(5) : facility.rooms.some((r) => r.id === raw) && !registry.resolveId(raw)?.startsWith("eq:") ? raw : null;
  if (roomId) {
    const slot = facility.patientSlots.find((s) => s.room === roomId);
    if (slot) return { slot: slot.id };
    const loc = host.d.locator;
    const device = patientProviders({ registry, capabilities: (id) => loc.capabilities(id) }, []).find((id) => {
      const e = registry.entity(id);
      return e?.room === roomId && loc.capabilities(id).some((c) => PATIENT_AT_PROVIDER_CAPABILITIES.includes(c) || PATIENT_PERFORMED_CAPABILITIES.includes(c));
    });
    return device ? { provider: device } : { slot: `room:${roomId}` };
  }
  return { provider: raw };
}

/**
 * How the patient travels (EMBODIED §8.4): the trolley they lie on while they go (returned), or on foot (null).
 * The patient's posture now, where they go and their posture there are three different things: a patient whom
 * clinical state has standing (an outpatient, `walks()`) gets up from a scanner table or a couch and walks
 * there upright, lying down only on arrival; anyone else travels lying on their own trolley when they lie now
 * or will lie there — and walks when there is no trolley free to lie on (a couch is no trolley): a body is never
 * carried lying through the air.
 */
function trolleyFor(host: EffectsHost, st: PatientPlaceState, target: PatientTarget): EntityId | null {
  const body = host.d.patient;
  if (body.walks(st) || !trolleyAtHand(host, st)) return null;
  // lying now, or lying where they go (a bed space: the clinical posture there)
  const lying = body.posture(st) === "lying" || (target.posture ? target.posture === "lying" : body.clinicalPostureOf(st) === "lying");
  return lying && st.trolley && !host.busy.get(st.trolley) ? st.trolley : null;
}

/** How far (m) a trolley may wait from the patient and still come along (parked beside a scanner: `TROLLEY_RINGS`). */
const TROLLEY_AT_HAND = 5;

/**
 * Is the patient's trolley with them — they lie or sit on it, or it waits beside them (parked by the scanner they
 * lie on)? Not while they walk with someone, nor once they walked away from it: a bed left in its bay never
 * follows the patient across the hospital.
 */
function trolleyAtHand(host: EffectsHost, st: PatientPlaceState): boolean {
  const body = host.d.patient;
  if (!st.trolley || body.escort(st)) return false;
  if (st.support === st.trolley) return true;
  const at = body.equipmentAt(st.trolley);
  const p = body.anchor();
  return !!at && !!p && at.level === p.level && Math.hypot(at.x - p.x, at.z - p.z) <= TROLLEY_AT_HAND;
}

/** The area of an equipment footprint where it stands now (null: unknown). */
function equipmentArea(host: EffectsHost, id: EntityId): { level: string; area: Area } | null {
  const at = host.d.patient.equipmentAt(id);
  return at ? { level: at.level, area: footprintArea({ position: { x: at.x, z: at.z }, footprint: at.footprint }) } : null;
}

const grow = (a: Area, m: number): Area => ({ minX: a.minX - m, maxX: a.maxX + m, minZ: a.minZ - m, maxZ: a.maxZ + m });

/**
 * Commit the patient's new place: the trolley (parked beside a provider, carrying the patient at a spot,
 * or home again with the patient in a bed space), home, the grids where bodies and beds were and are, the
 * event. Returns the events.
 */
export function commitPatient(host: TransportHost, target: PatientTarget, trolley: EntityId | null, home: "set" | "keep", by: string | null, path: PathPoint[], distance: number): WorldEvent[] {
  const { store, patient: body, facility, mover } = host.d;
  const id = body.id!;
  const st = body.state()!;
  const from = body.place()!;
  const touched: { level: string; area: Area }[] = [];
  const oldBody = host.patientStamp.body;
  if (oldBody) touched.push(oldBody);
  const support = target.support === "trolley" ? trolley : target.support;
  const next: PatientPlaceState = {
    slot: target.slot,
    provider: target.provider,
    home: home === "set" ? { slot: target.slot, provider: target.slot ? null : target.provider } : { ...st.home },
    spot: target.spot ? { ...target.spot } : null,
    posture: target.posture,
    trolley: st.trolley,
    support,
  };
  /** Trolley moves: a position, or undefined (back where it is kept). */
  const moves: { id: EntityId; position: { x: number; y: number; z: number; level: string; rot: number } | undefined }[] = [];
  if (target.slot) {
    const slot = body.slot(target.slot)!;
    const bed = slot.bed && host.d.registry.entity(`eq:${slot.bed}`) ? `eq:${slot.bed}` : null;
    // every trolley the patient leaves goes back where it is kept: the one they came on, their old one parked away
    for (const t of new Set([trolley, st.trolley].filter((x): x is EntityId => !!x))) if (store.entity(t)?.position) moves.push({ id: t, position: undefined });
    next.trolley = body.isTrolley(bed) ? bed : null;
    next.support = bed;
    next.spot = null;
    next.posture = null;
  } else if (trolley) {
    const at = body.equipmentAt(trolley)!;
    const level = target.spot!.level;
    const y = levelElevation(facility, level);
    if (support === trolley) moves.push({ id: trolley, position: { x: target.spot!.x, y, z: target.spot!.z, level, rot: at.rot } });
    else {
      // the patient got off it (onto a table, standing at a station): it waits beside them
      const near = support ? equipmentArea(host, support)?.area : footprintArea({ position: { x: target.spot!.x, z: target.spot!.z }, footprint: { w: 0.8, d: 0.8 } });
      const spot = near ? trolleySpot(targetDeps(host), trolley, level, near) : null;
      moves.push({ id: trolley, position: spot ? { x: spot.x, y, z: spot.z, level, rot: at.rot } : undefined });
    }
  }
  for (const m of moves) {
    const before = equipmentArea(host, m.id);
    if (before) touched.push({ level: before.level, area: grow(before.area, 0.5) });
  }
  // a transport or a transfer ends a walk together (the patient is where they were taken now)
  const escorted = body.escort(st);
  store.patchEntity(id, { patient: next });
  for (const m of moves) {
    store.patchEntity(m.id, { position: m.position });
    const after = equipmentArea(host, m.id);
    if (after) touched.push({ level: after.level, area: grow(after.area, 0.5) });
    const e = host.d.registry.entity(m.id);
    if (e) mover.placeEntity?.(m.id, m.position ?? { x: e.position.x, y: e.position.y, z: e.position.z, level: e.level, rot: e.rot });
  }
  const newBody = body.body();
  if (newBody) touched.push(newBody);
  for (const t of touched) host.invalidate({ level: t.level, ...grow(t.area, 0.1) });
  host.patientStamp = { key: body.bodyKey(), posture: body.posture(), body: newBody };
  const to = body.place()!;
  const events = [host.emit({ type: "patient.moved", entityId: id, from, to, by, distance: Math.round(distance * 100) / 100, path: path.map((p) => ({ ...p })) })];
  if (escorted) events.push(host.emit({ type: "patient.escort", entityId: id, escort: null, actorId: null }));
  return events;
}

/** Where the patient stays when a transport stops short: beside the body that wheeled them (on the trolley), or standing where they walked to. */
function stopTarget(host: EffectsHost, pose: Pose, trolley: EntityId | null): PatientTarget {
  const ahead = { x: pose.x - Math.sin(pose.yaw) * 0.95, z: pose.z - Math.cos(pose.yaw) * 0.95 };
  const cell = freeCellNear(host.d.grids, host.d.visibility, pose.level, { minX: ahead.x, maxX: ahead.x, minZ: ahead.z, maxZ: ahead.z }, 2, null) ?? ahead;
  return {
    slot: null,
    provider: null,
    spot: { level: pose.level, x: cell.x, z: cell.z, rot: 0 },
    posture: trolley ? "lying" : "standing",
    support: trolley ? "trolley" : null,
    stand: { kind: "point", x: cell.x, z: cell.z, level: pose.level, range: 1.5 },
    name: host.d.locator.regionName({ level: pose.level, x: cell.x, z: cell.z }),
  };
}

/** `transport_patient`: run (see the module docs). The body is at the patient's side (the spatial phase checked it). */
export async function transportPatient(host: TransportHost, request: WorldActionRequest, actor: ActorState, patientId: EntityId, signal: AbortSignal): Promise<Outcome> {
  const { patient: body, backend, locale: L, locator } = host.d;
  const name = locator.name(patientId);
  const dest = destinationOf(host, request);
  if (!dest) return failed("INVALID_REQUEST", worldMessage("INVALID_REQUEST", L, { reason: worldMessage("pre.noDestination", L) }));
  const st = body.state()!;
  const deps = targetDeps(host);
  let target = resolveTarget(deps, dest, st.trolley);
  if (!target) return failed("TARGET_NOT_FOUND", worldMessage("pre.unknownDestination", L, { destination: body.describe(dest) }));
  if (sameTarget(st, target)) return { status: "completed", message: worldMessage("ok.patientThere", L, { patient: name, place: target.name }), events: [] };
  const trolley = trolleyFor(host, st, target);
  if (trolley !== st.trolley) target = resolveTarget(deps, dest, trolley) ?? target;
  const plan = backend.plan({ actorId: actor.id, from: actor.pose, goal: target.stand, role: actor.role, accessibleOnly: true });
  if (!plan.ok) return failed(plan.code, plan.message, { hint: null });
  host.busy.set(patientId, actor.id);
  if (trolley) host.busy.set(trolley, actor.id);
  // lying only on the trolley the walker pushes; otherwise upright beside them (the place's posture comes on arrival)
  host.transit = { by: actor.id, trolley, posture: trolley ? "lying" : "standing" };
  let walk: Walk;
  try {
    walk = await host.walk(actor, plan, signal, request);
  } finally {
    host.transit = null;
    host.busy.delete(patientId);
    if (trolley) host.busy.delete(trolley);
  }
  const base = { navigation: walk.record, elapsedSeconds: walk.travelSeconds };
  if (walk.interrupted) {
    const now = host.d.store.actor(actor.id)!;
    const stop = stopTarget(host, now.pose, trolley);
    const events = [...walk.events, ...commitPatient(host, stop, trolley, "keep", actor.id, walk.record.path, walk.walked)];
    return { status: "cancelled", errorCode: "MOVEMENT_INTERRUPTED", message: worldMessage("ok.interrupted", L, { distance: metres(walk.walked) }), events, ...base };
  }
  const events = [...walk.events, ...commitPatient(host, target, trolley, target.slot ? "set" : "keep", actor.id, plan.path, walk.walked)];
  return { status: "completed", message: worldMessage("ok.transported", L, { patient: name, place: target.name, distance: metres(walk.walked) }), events, ...base };
}

/** `WorldRuntime.relocatePatient` (see the module docs). */
export function relocatePatient(host: TransportHost, dest: PatientDestination): PatientRelocation {
  const { patient: body, backend, locale: L, locator, store } = host.d;
  const id = body.id;
  const st = body.state();
  if (!id || !st) return { ok: false, reason: "no-patient", message: worldMessage("spatial.no-patient", L) };
  const name = locator.name(id);
  const deps = targetDeps(host);
  let target = resolveTarget(deps, dest, st.trolley);
  if (!target) return { ok: false, reason: "no-destination", message: worldMessage("relocate.none", L, { patient: name, destination: body.describe(dest), place: body.placeName() }) };
  if (sameTarget(st, target)) {
    // where the team takes the patient is where they now belong
    const home = { slot: target.slot, provider: target.slot ? null : target.provider };
    if (body.moved() && (st.home.slot !== home.slot || st.home.provider !== home.provider)) store.patchEntity(id, { patient: { ...st, home } });
    return { ok: true, moved: false, place: body.place()!, name: target.name, message: worldMessage("relocate.already", L, { patient: name, place: target.name }) };
  }
  const trolley = trolleyFor(host, st, target);
  if (trolley !== st.trolley) target = resolveTarget(deps, dest, trolley) ?? target;
  // the team's route from the patient (the record, the browser's animation) — carts and people by the bed are set
  // aside; no route: the patient is there all the same
  const p = body.place()!;
  const from: Pose = { x: p.x, y: p.y, z: p.z, yaw: 0, pitch: 0, level: p.level };
  const plan = backend.plan({ actorId: id, from, goal: target.stand, role: "nurse", accessibleOnly: true, ignoreObstacles: true });
  commitPatient(host, target, trolley, "set", null, plan.ok ? plan.path : [], plan.ok ? plan.length : 0);
  return { ok: true, moved: true, place: body.place()!, name: target.name, message: worldMessage("relocate.done", L, { patient: name, place: target.name }) };
}

/**
 * `WorldRuntime.refreshPatient`: the clinical posture changed the body? Re-stamp the grids and say so. A patient
 * walking with someone whom clinical state no longer lets walk stops where they are (`endEscortIfUnable`).
 */
export function refreshPatient(host: TransportHost): boolean {
  const body = host.d.patient;
  if (!body.id) return false;
  if (endEscortIfUnable(host)) return true;
  // a posture taken when asked lapses once clinical state positions the patient otherwise: forget it
  const st = body.state();
  if (st?.asked && st.asked.over !== body.clinicalPostureOf(st)) {
    const { asked: _asked, ...rest } = st;
    void _asked;
    host.d.store.patchEntity(body.id, { patient: rest });
  }
  const key = body.bodyKey();
  const stamp = host.patientStamp;
  if (key === stamp.key) return false;
  const now = body.body();
  for (const b of [stamp.body, now]) if (b) host.invalidate({ level: b.level, ...grow(b.area, 0.1) });
  const posture = body.posture();
  if (stamp.posture && stamp.posture !== posture) host.emit({ type: "patient.posture", entityId: body.id, from: stamp.posture, to: posture });
  host.patientStamp = { key, posture, body: now };
  return true;
}

/** Capabilities in words (the policy's transport messages). */
export function capsText(caps: readonly string[], locale: string): string {
  return listText(capabilityLabels(caps, locale), locale);
}
