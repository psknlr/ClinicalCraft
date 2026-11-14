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
import { PATIENT_AT_PROVIDER_CAPABILITIES, PATIENT_PERFORMED_CAPABILITIES, TRAVEL_MONITOR_CAPABILITY } from "./capabilities.js";
import type { ActorState, BodyPosture, EntityId, PatientDestination, PatientLeg, PatientPlace, PatientPlaceState, PathPoint, PatientRelocation, Pose, TravelMode, WorldActionRequest, WorldEvent, WorldJourney } from "./contracts.js";
import { failed, type EffectsHost, type Outcome, type Walk } from "./effects.js";
import { endEscortIfUnable } from "./escort.js";
import { closeStretch, legEnd, placeEnd, receiverAt, travelMode, withLeg, type JourneyHost } from "./journey.js";
import { listText, metres, worldMessage } from "./i18n.js";
import { levelElevation } from "./levels.js";
import { freeCellNear, patientProviders, resolveTarget, sameTarget, trolleySpot, type PatientTarget, type TargetDeps, type WalkProblem } from "./patient.js";
import { footprintArea, type Area } from "./raster.js";

/** The bus side transports need: the patient's body as last stamped on the grids, the transport in progress. */
export interface TransportHost extends JourneyHost {
  /** What the grids hold of the patient's body (`refreshPatient` compares the body now with it). */
  patientStamp: { key: string; posture: BodyPosture | null; body: { level: string; area: Area } | null };
  /** The transport walking now (`PatientPlace.transit`), or null. */
  transit: NonNullable<PatientPlace["transit"]> | null;
  /** The same transport as a snapshot keeps it (who, whom, where to), or null. */
  journey: WorldJourney | null;
  /**
   * Stop the transport walking now because the patient can no longer walk (`why`: the mobility assessment's
   * reason) — set only while a patient walks with the transporter (no trolley); `refreshPatient` calls it.
   */
  transitStop: ((why: WalkProblem) => void) | null;
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
 * One mobility assessment decides, the same as for a walk together (`walkProblem`, `escortProblem`): a patient who
 * cannot walk — lying by clinical state, unable to respond, too unwell — travels only lying on a trolley at hand
 * (`transportPatient` refuses without one: never upright). A patient who can walk and whom clinical state has
 * standing (an outpatient, `walks()`) gets up from a scanner table or a couch and walks there upright, lying down
 * only on arrival; anyone else travels lying on their own trolley when they lie now or will lie there, and walks
 * when there is no trolley free to lie on (a couch is no trolley): a body is never carried lying through the air.
 */
function trolleyFor(host: EffectsHost, st: PatientPlaceState, target: PatientTarget): EntityId | null {
  const body = host.d.patient;
  // a trolley carries the patient only when it is free and in service (one marked out of service never moves them)
  const usable = (id: EntityId | null): id is EntityId => !!id && !host.busy.get(id) && host.d.store.available(id);
  // cannot walk: a usable trolley at hand, or nothing (the transport waits for one)
  if (body.walkProblem(st)) return trolleyAtHand(host, st) && usable(st.trolley) ? st.trolley : null;
  if (body.walks(st) || !trolleyAtHand(host, st)) return null;
  // lying now, or lying where they go (a bed space: the clinical posture there)
  const lying = body.posture(st) === "lying" || (target.posture ? target.posture === "lying" : body.clinicalPostureOf(st) === "lying");
  return lying && usable(st.trolley) ? st.trolley : null;
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

/** Park a portable device beside the patient's body (a free spot near it; none: back where it is kept), re-stamping the grids. */
function placeBeside(host: TransportHost, id: EntityId, near: { level: string; area: Area }): void {
  const { store, mover, facility, registry } = host.d;
  const e = registry.entity(id);
  const at = host.d.patient.equipmentAt(id);
  if (!e || !at) return;
  const before = equipmentArea(host, id);
  const spot = trolleySpot(targetDeps(host), id, near.level, near.area);
  const position = spot ? { x: spot.x, y: levelElevation(facility, near.level), z: spot.z, level: near.level, rot: at.rot } : undefined;
  store.patchEntity(id, { position });
  const after = equipmentArea(host, id);
  for (const a of [before, after]) if (a) host.invalidate({ level: a.level, ...grow(a.area, 0.6) });
  mover.placeEntity?.(id, position ?? { x: e.position.x, y: e.position.y, z: e.position.z, level: e.level, rot: e.rot });
}

/** How many legs of the patient's journey the world keeps (`PatientPlaceState.legs`, oldest dropped). */
export { MAX_PATIENT_LEGS } from "./journey.js";

/** How a leg of the patient's journey began (`commitPatient` records the leg when it ends). */
export interface Departure {
  /** Simulated minute of departure. */
  at: number;
  /** The role of the body that took them (null: the team, a transfer). */
  role: string | null;
  /** The monitor that travels with them, or null. */
  monitor: EntityId | null;
  status: PatientLeg["status"];
  /** A transport (a body took them) or a relocation (a phase or an intervention: no journey). */
  kind: "transport" | "relocation";
  /** How they travelled (a relocation: null) and on what (`PatientLeg.mode`, `vehicle`). */
  mode: TravelMode | null;
  vehicle: EntityId | null;
  /** A relocation's cause, when given. */
  cause?: PatientLeg["cause"];
}

/**
 * The monitor that travels with the patient on this transport (`parameters.monitor`, EMBODIED §8.7): `true` — a
 * portable device providing cardiac monitoring at the patient's bedside now, in service and free (a defibrillator's
 * monitor on its cart, put on the bed for the journey); an id or alias — that device, under the same conditions. Null
 * when none is asked for; an error message when one was asked for and none can come.
 */
function travellingMonitor(host: TransportHost, request: WorldActionRequest, actor: ActorState): { id: EntityId | null } | { error: string } {
  const asked = request.parameters?.monitor;
  if (asked === undefined || asked === false || asked === null) return { id: null };
  const { registry, locator, store, locale: L } = host.d;
  const free = (id: EntityId) => {
    const rt = store.entity(id);
    const holder = rt?.reservedBy ?? rt?.heldBy ?? host.busy.get(id) ?? null;
    return !holder || holder === actor.id;
  };
  const usable = (id: EntityId) => {
    const e = registry.entity(id);
    const p = locator.place(id);
    return !!e && e.kind === "equipment" && !!e.portable && locator.capabilities(id).includes(TRAVEL_MONITOR_CAPABILITY) && !!p && locator.atBedside(p) && free(id);
  };
  const patient = locator.patientId ? locator.name(locator.patientId) : "—";
  if (typeof asked === "string" && asked.trim()) {
    const id = registry.resolveId(asked.trim()) ?? asked.trim();
    return usable(id) ? { id } : { error: worldMessage("pre.monitorUnusable", L, { monitor: registry.entity(id) ? locator.name(id) : asked.trim(), patient }) };
  }
  const id = registry.ofKind("equipment").find((e) => usable(e.id))?.id ?? null;
  return id ? { id } : { error: worldMessage("pre.noTravelMonitor", L, { patient }) };
}

/**
 * Commit the patient's new place: the trolley (parked beside a provider, carrying the patient at a spot,
 * or home again with the patient in a bed space), the monitor that travelled with them (beside them now), home, the
 * grids where bodies and beds were and are, the leg of the journey (`PatientPlaceState.legs`), the event. Returns the
 * events.
 */
export function commitPatient(host: TransportHost, target: PatientTarget, trolley: EntityId | null, home: "set" | "keep", by: string | null, path: PathPoint[], distance: number, departure: Departure): WorldEvent[] {
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
  // the leg of the journey, recorded on arrival (or where it stopped): who took them, from where, when, with what monitor
  // — how (P2-11: on their bed, a trolley, on foot; a relocation: no journey) and who took over on arrival (below)
  const relocation = departure.kind === "relocation";
  const leg: PatientLeg = {
    by,
    role: departure.role,
    from: { slot: from.slot, provider: from.provider, room: from.room },
    to: legEnd(host, target.slot ? { slot: target.slot, provider: target.provider, spot: null } : next),
    departedAt: departure.at,
    arrivedAt: host.d.clinical.clock(),
    monitor: departure.monitor,
    status: departure.status,
    kind: departure.kind,
    mode: departure.mode,
    vehicle: departure.vehicle,
    distance: relocation ? 0 : Math.round(distance * 100) / 100,
    receivedBy: null,
    receivedRole: null,
    ...(departure.cause ? { cause: { ...departure.cause } } : {}),
  };
  next.legs = withLeg(st, leg);
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
  // the monitor that travelled with them waits beside them where they are now (back where it is kept if no room)
  const now = body.place();
  if (departure.monitor && now) placeBeside(host, departure.monitor, { level: now.level, area: footprintArea({ position: { x: now.x, z: now.z }, footprint: { w: now.footprint.w, d: now.footprint.d } }) });
  host.patientStamp = { key: body.bodyKey(), posture: body.posture(), body: newBody };
  // the handover (P2-11): a transport that arrived is taken over by a colleague at the bedside there, if one is — the
  // leg is completed before the commit's events go out (it is the object just stored)
  const receiver = !relocation && departure.status === "arrived" ? receiverAt(host, by) : null;
  if (receiver) Object.assign(leg, { receivedBy: receiver.id, receivedRole: receiver.role });
  // whoever wheeled them knows where the bed and the monitor that came along are now (audit P1-8)
  host.learnWhere(by, [...moves.map((m) => m.id), ...(departure.monitor ? [departure.monitor] : [])]);
  const to = body.place()!;
  const events = [host.emit({ type: "patient.moved", entityId: id, from, to, by, distance: Math.round(distance * 100) / 100, path: path.map((p) => ({ ...p })) })];
  if (escorted) events.push(host.emit({ type: "patient.escort", entityId: id, escort: null, actorId: null }));
  events.push(host.emit({ type: "patient.arrived", entityId: id, leg: { ...leg, from: { ...leg.from }, to: { ...leg.to } } }));
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
  // the same mobility assessment as a walk together: a patient who cannot walk goes lying on a trolley, or not at all
  const unable = body.walkProblem(st);
  if (unable && !trolley) {
    // their own trolley is here but out of service: say so — they wait for a usable one, never ride on it
    const broken = st.trolley && trolleyAtHand(host, st) && !host.d.store.available(st.trolley) ? locator.name(st.trolley) : null;
    const why = broken ? worldMessage("pre.trolleyOutOfService", L, { trolley: broken, patient: name }) : worldMessage("pre.needsTrolley", L, { patient: name });
    return failed("PRECONDITION_FAILED", `${worldMessage(`pre.cannotWalk.${unable}`, L, { patient: name })} ${why}`, { hint: null });
  }
  if (trolley !== st.trolley) target = resolveTarget(deps, dest, trolley) ?? target;
  // a monitor asked to travel with them (high acuity): one at their bedside, or the transport does not set off
  const monitor = travellingMonitor(host, request, actor);
  if ("error" in monitor) return failed("PRECONDITION_FAILED", monitor.error, { hint: null });
  const plan = backend.plan({ actorId: actor.id, from: actor.pose, goal: target.stand, role: actor.role, accessibleOnly: true });
  if (!plan.ok) return failed(plan.code, plan.message, { hint: null });
  // walking with someone until now: that walk ends here, where this transport picks them up (its own leg)
  const walkedWith = closeStretch(host, "arrived", "end");
  const departedAt = host.d.clinical.clock();
  const mode = travelMode(host, trolley);
  const departure = (status: Departure["status"]): Departure => ({ at: departedAt, role: actor.role, monitor: monitor.id, status, kind: "transport", mode, vehicle: trolley });
  // the journey sets off (P2-11): who holds them in transit, how, with which monitor, from where to where
  const setOff = host.emit({ type: "patient.departed", entityId: patientId, kind: "transport", by: actor.id, role: actor.role, mode, vehicle: trolley, monitor: monitor.id, from: placeEnd(host), to: legEnd(host, target.slot ? { slot: target.slot, provider: target.provider, spot: null } : { slot: null, provider: target.provider, spot: target.spot }), at: departedAt });
  host.busy.set(patientId, actor.id);
  if (trolley) host.busy.set(trolley, actor.id);
  if (monitor.id) host.busy.set(monitor.id, actor.id);
  // lying only on the trolley the walker pushes; otherwise upright beside them (the place's posture comes on arrival)
  host.transit = { by: actor.id, trolley, posture: trolley ? "lying" : "standing" };
  host.journey = { by: actor.id, patient: patientId, actionId: request.actionId, parameters: structuredClone(request.parameters ?? {}) };
  // walking beside the transporter, the patient is reassessed on the way: one who can no longer walk stops the walk
  let collapsed: WalkProblem | null = null;
  const own = new AbortController();
  const follow = () => own.abort();
  if (signal.aborted) own.abort();
  else signal.addEventListener("abort", follow, { once: true });
  if (!trolley)
    host.transitStop = (why) => {
      collapsed ??= why;
      // nobody walks them from this moment: not "standing beside the walker" while the walk winds down
      host.transit = null;
      own.abort();
    };
  let walk: Walk;
  try {
    walk = await host.walk(actor, plan, own.signal, request);
  } finally {
    signal.removeEventListener("abort", follow);
    host.transit = null;
    host.journey = null;
    host.transitStop = null;
    host.busy.delete(patientId);
    if (trolley) host.busy.delete(trolley);
    if (monitor.id) host.busy.delete(monitor.id);
  }
  const base = { navigation: walk.record, elapsedSeconds: walk.travelSeconds };
  if (collapsed) {
    // the last safe position: laid down where the walk stopped (their clinical posture), no trolley, no bed; going
    // on needs a trolley (the same assessment a new transport makes before it starts)
    const now = host.d.store.actor(actor.id)!;
    const stop = stopTarget(host, now.pose, null);
    // unresponsive or to be kept lying: lying; too unwell to walk on: sat down
    const posture = collapsed === "unwell" && body.clinicalPostureOf(body.state()!) !== "lying" ? "sitting" : "lying";
    const events = [...walkedWith, setOff, ...walk.events, ...commitPatient(host, { ...stop, posture }, null, "keep", actor.id, walk.record.path, walk.walked, departure("stopped"))];
    const message = `${worldMessage(`pre.cannotWalk.${collapsed}`, L, { patient: name })} ${worldMessage("pre.stoppedEnRoute", L, { patient: name, place: stop.name })} ${worldMessage("pre.needsTrolley", L, { patient: name })}`;
    return { status: "failed", errorCode: "PRECONDITION_FAILED", message, events, hint: null, ...base };
  }
  if (walk.interrupted) {
    const now = host.d.store.actor(actor.id)!;
    const stop = stopTarget(host, now.pose, trolley);
    const events = [...walkedWith, setOff, ...walk.events, ...commitPatient(host, stop, trolley, "keep", actor.id, walk.record.path, walk.walked, departure("stopped"))];
    return { status: "cancelled", errorCode: "MOVEMENT_INTERRUPTED", message: worldMessage("ok.interrupted", L, { distance: metres(walk.walked) }), events, ...base };
  }
  const events = [...walkedWith, setOff, ...walk.events, ...commitPatient(host, target, trolley, target.slot ? "set" : "keep", actor.id, plan.path, walk.walked, departure("arrived"))];
  const transported = worldMessage("ok.transported", L, { patient: name, place: target.name, distance: metres(walk.walked) });
  // the monitor parked beside them — or, with no room there, back where it is kept: said so (re-review P2-11)
  const besideThem = monitor.id ? !!host.d.store.entity(monitor.id)?.position : false;
  const monitored = monitor.id ? ` ${worldMessage(besideThem ? "ok.monitorTravelled" : "ok.monitorReturned", L, { monitor: locator.name(monitor.id) })}` : "";
  // the handover, in words (P2-11): who took over where they arrived
  const leg = body.state()?.legs?.at(-1);
  const handed = leg?.receivedBy ? ` ${worldMessage("ok.receivedBy", L, { patient: name, receiver: locator.name(leg.receivedBy) })}` : "";
  return { status: "completed", message: `${transported}${monitored}${handed}`, events, ...base };
}

/** `WorldRuntime.relocatePatient` (see the module docs). */
export function relocatePatient(host: TransportHost, dest: PatientDestination, cause?: PatientLeg["cause"]): PatientRelocation {
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
  const now = host.d.clinical.clock();
  // a walk with someone ends where the team takes over (its own leg)
  closeStretch(host, "arrived", "end");
  commitPatient(host, target, trolley, "set", null, plan.ok ? plan.path : [], plan.ok ? plan.length : 0, { at: now, role: null, monitor: null, status: "arrived", kind: "relocation", mode: null, vehicle: null, ...(cause ? { cause } : {}) });
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
  // walking to a place with someone and no longer able to: the transport stops at once (it lays them down)
  const walking = body.state();
  const why = host.transitStop && walking ? body.walkProblem(walking) : null;
  if (why) host.transitStop!(why);
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
