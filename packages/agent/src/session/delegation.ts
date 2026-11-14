/**
 * Delegated tasks (docs/EMBODIED.md §8, `delegate_task`): a staff member
 * does the job with their own body — walks there through the action bus,
 * operates the devices, and carries out the clinical part through the
 * delegating agent's tool path (hooks, approval gate, deny rules; the
 * spatial gate measures from the staff member's body). Staff movement is
 * deterministic path following, no model per frame. The result is a
 * structured completion: status, the steps with their outcomes, the time
 * the body spent (travel + operation durations) and the simulated minutes.
 *
 * Tasks: `attach_monitor` (the patient's monitor), `record_ecg` (an ECG
 * cart — wheeled to the bedside if none is there — prepare, connect, record,
 * reset), `obtain_iv_access` (the case's IV-access procedure),
 * `fetch_equipment` (a cart, by id or capability, to the bedside),
 * `give_intervention` (`params.intervention`, fetching what must stand at
 * the bedside), `transport_patient` (the target or `params.destination` —
 * a device, a bed space or room, `home` — or `params.capability`: the staff
 * member walks to the patient and wheels them there; porters and nurses),
 * `hold_traction` (`params.port`: a colleague holding traction walks to the
 * operating table and takes the instrument in that port, keeping its traction —
 * PROCEDURE.md §3 `hand-over`), `release_traction` (lets go of every port
 * they hold and hands it back), `hold_camera` (`params.port`, else the plan's
 * camera port: the camera holder takes it by hand-over, or puts the laparoscope
 * into it when it is empty), `aim_camera` (`params.region`, `params.zoom`: the
 * camera holder — taking the camera port first — aims it there) and
 * `pass_instrument` (`params.instrument`, `params.to`: the scrub nurse passes it
 * into that hand, the operator's without `to`). Someone who holds a port lets
 * go before any other task (`letGo` in the result): the window closes, and the
 * operator sees it.
 *
 * The operating table's tasks go by control (docs/EMBODIED.md §8.3): the scope
 * check is the control each is worked with (`THEATRE_TASK_CONTROL`), and a
 * colleague asked for by role (`attending`, `nurse`) is chosen among those of
 * that role in the patient's room whose controls cover the task — never the
 * colleague standing by, never the surgeon for the camera — by position
 * (traction: the first assistant, the second, the surgeon; the camera: whoever
 * holds the camera port), then by distance; a position in words (`first
 * assistant`, `一助`, `扶镜手`) is whoever holds it in this encounter.
 */
import { lookupStaff } from "../tools/consult-target.js";
import { bodyControls, cameraPort, canonicalPosition, memberBody, monitorAttached, standingBy, type CaseDefinition, type FacilityDefinition, type SessionState, type StaffPosition, type SurgicalControl } from "@clinicalcraft/core";
import { bodyPosition, holdsControl, ivAccessIntervention, PRIMARY_ACTOR, type ActorId, type ActorState, type NavGoal, type WorldActionResult, type WorldRuntime } from "@clinicalcraft/world";
import type { SkillToolCall } from "../skills/interpreter.js";
import { resolveIntervention, resolveInvestigation, strArg } from "../tools/clinical.js";
import { checkTaskScope, THEATRE_TASK_CONTROL } from "../tools/scope.js";
import { scopeActorOf } from "../tools/scope-actor.js";
import { spatialCodeOf } from "../tools/spatial.js";
import type { WorldRequestInput } from "../tools/world.js";
import { DELEGATION_TASKS } from "../tools/world.js";
import { clinicalOperation, heldBy, operationPath, releaseHeld, releaseOperation } from "./device-ops.js";
import type { ClinicalCaller } from "./embodied-types.js";
import type { SessionTrace } from "./trace.js";

/** What delegation needs from the embodied session. */
export interface DelegationHost {
  readonly caseDef: CaseDefinition;
  /** The facility (a staff member's position, for their controls). */
  readonly facility: FacilityDefinition | null;
  locale(): string;
  state(): SessionState;
  world(): WorldRuntime;
  readonly trace: SessionTrace;
  act(caller: ClinicalCaller, request: WorldRequestInput): Promise<WorldActionResult>;
  runTool(caller: ClinicalCaller, tool: string, args: Record<string, unknown>, extra: { actorId: ActorId }): Promise<SkillToolCall>;
  patientId(): string | null;
  patientMonitorId(): string | null;
  atBedside(id: string): boolean;
  resolve(target: string, actorId: ActorId): string | null;
  /** The staff member the task went to (called once, before they act). */
  onStaff?(staffId: ActorId): void;
}

export type DelegationTask = (typeof DELEGATION_TASKS)[number];

export interface DelegationStep {
  operation: string;
  target?: string;
  status: "completed" | "failed" | "cancelled";
  code?: string;
  message: string;
}

export interface DelegationResult {
  staffId: ActorId | null;
  role: string;
  task: string;
  status: "completed" | "failed" | "cancelled";
  steps: DelegationStep[];
  /** Seconds the staff body spent (walking + operation durations). */
  elapsedSeconds: number;
  /** Simulated minutes the task took (clock delta; 0 on a static clock). */
  clockMinutes: number;
  /** Metres walked. */
  distance: number;
  /** Why the task could not start (unknown role, task, missing target, `not-authorized`). */
  message?: string;
  /** `not-authorized`: why, localised (the staff member's scope of practice — review S3). */
  refusal?: string;
  /** `target-not-intervention` / `unknown-intervention`: what was asked for (an entity id, or the text). */
  asked?: string;
  /** Equipment delivered (`fetch_equipment`): where it stands now and how far from the patient. */
  delivered?: { entityId: string; room: string | null; distance: number; x: number; z: number };
  /** Traction let go: the instruments this colleague held at the table, handed back before this task or as it. */
  letGo?: { port: string; instrument: string }[];
  /** `hold_traction`: the port taken and its instrument. */
  holding?: { port: string; instrument: string };
  /** `hold_camera` / `aim_camera`: the camera port held. */
  camera?: { port: string };
  /** `aim_camera`: where the camera looks now, and how close. */
  aimed?: { region: string; zoom: string };
  /** `pass_instrument`: what was passed, and to whom (absent: the operator). */
  passed?: { instrument: string; to?: string };
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * What choosing a colleague reads beyond the world: the case, the state and the facility (the team as it is: who stands
 * by, who holds which control) and, for a delegated task, the task.
 */
export interface StaffPick {
  caseDef: CaseDefinition;
  state: SessionState;
  facility: FacilityDefinition | null;
  task?: string;
}

/** The positions traction is asked of, in order: the first assistant, the second, the surgeon (anyone else after). */
const TRACTION_ORDER: readonly StaffPosition[] = ["first-assistant", "second-assistant", "surgeon"];

/** Distance from the patient where the patient is now (far away on another level or without a patient). */
function fromPatient(world: WorldRuntime, patientId: string | null): (a: ActorState) => number {
  const place = patientId ? world.patientPlace() : null;
  const entity = patientId && !place ? world.entity(patientId) : null;
  const at = place ? { level: place.level, x: place.x, z: place.z } : entity ? { level: entity.level, x: entity.position.x, z: entity.position.z } : null;
  return (a) => (at && a.pose.level === at.level ? Math.hypot(a.pose.x - at.x, a.pose.z - at.z) : 1e9);
}

/**
 * Among colleagues of a role, the one for an operating table's task (null: none covers it): in the patient's room,
 * holding the task's control (`bodyControls` for the field), never the colleague standing by, never the surgeon for
 * the camera; by position — release: whoever holds a port; traction: the first assistant, the second, the surgeon;
 * the camera: whoever holds the camera port — then by distance.
 */
function theatreChoice(world: WorldRuntime, pick: StaffPick, control: SurgicalControl, pool: readonly ActorState[], patientId: string | null): ActorId | null {
  const c = pick.caseDef;
  const s = pick.state;
  const room = patientId ? world.roomOf(patientId) : null;
  const standing = standingBy(c, s);
  const surgeon = memberBody(c, s, "surgeon");
  const eligible = pool.filter(
    (a) => a.id !== standing && (room === null || world.roomOf(a.id) === room) && holdsControl(bodyControls(c, s, pick.facility, a.id, "field"), control) && !(control === "camera" && a.id === surgeon),
  );
  if (!eligible.length) return null;
  const ports = s.procedure?.ports ?? [];
  const ref = (a: ActorState) => a.id.slice("staff:".length);
  const camera = s.procedure ? cameraPort(s.procedure)?.holder : undefined;
  const rank = (a: ActorState): number => {
    if (pick.task === "release_traction") return ports.some((p) => p.holder === ref(a) && p.instrument) ? 0 : 1;
    if (control === "camera") return camera === ref(a) ? 0 : 1;
    if (control !== "retract") return 0;
    const p = bodyPosition(c, s, pick.facility, a.id);
    const i = p ? TRACTION_ORDER.indexOf(canonicalPosition(p)) : -1;
    return i < 0 ? TRACTION_ORDER.length : i;
  };
  const dist = fromPatient(world, patientId);
  return [...eligible].sort((a, b) => rank(a) - rank(b) || dist(a) - dist(b) || (a.id < b.id ? -1 : 1))[0]!.id;
}

/**
 * The staff member for a role (or a staff id): `staff:<id>` is that body; an operating table's task (`pick`: the case,
 * the state, the task) asked of a role goes to the one of that role whose controls cover it (`theatreChoice`) — before a
 * bare staff id that happens to spell the role (general-hospital's `attending`); then a bare staff id; else the one of
 * the role nearest to the patient where the patient is now, whose scope then says what they cannot do. With `pick`, the
 * colleague standing by while the learner holds their place is passed over (when the role has anyone else: named
 * alone, their scope says why). A role nobody holds is looked up as a name, a position in this encounter's team (`first
 * assistant`, `一助`, `扶镜手`) or a title (`lookupStaff`).
 */
export function pickStaff(world: WorldRuntime, role: string, patientId: string | null, pick?: StaffPick): ActorId | null {
  if (role.startsWith("staff:")) {
    const named = world.actor(role);
    if (named) return named.id;
  }
  const ofRole = world.actors().filter((a) => a.id.startsWith("staff:") && a.role === role);
  const standing = pick ? standingBy(pick.caseDef, pick.state) : null;
  const working = ofRole.filter((a) => a.id !== standing);
  const candidates = working.length ? working : ofRole;
  const control = pick?.task ? THEATRE_TASK_CONTROL[pick.task] : undefined;
  const chosen = pick && control && candidates.length ? theatreChoice(world, pick, control, candidates, patientId) : null;
  if (chosen) return chosen;
  const bare = role.startsWith("staff:") ? null : world.actor(`staff:${role}`);
  if (bare && bare.id.startsWith("staff:")) return bare.id;
  if (!candidates.length) {
    // a colleague by name, a position in the team or a title ("Nurse Lim", "first assistant", "一助", "洗手护士"): the
    // one room-aware resolver, in the patient's room
    const named = lookupStaff(world.facility, role, patientId ? world.roomOf(patientId) : null, pick ? { caseDef: pick.caseDef, state: pick.state } : undefined);
    return named.kind === "one" && world.actor(`staff:${named.staff.id}`) ? `staff:${named.staff.id}` : null;
  }
  const dist = fromPatient(world, patientId);
  return [...candidates].sort((a, b) => dist(a) - dist(b) || (a.id < b.id ? -1 : 1))[0]!.id;
}

/** Where a `transport_patient` task takes the patient (world parameters), or null when it names nowhere. */
function transportParameters(h: Pick<DelegationHost, "resolve">, staff: ActorId, params: Record<string, unknown>, target: string): Record<string, unknown> | null {
  const destination = strArg(params, "destination") || target;
  const capability = strArg(params, "capability");
  if (destination === "home" || destination === "back") return { destination: "home" };
  if (destination) return { destination: h.resolve(destination, staff) ?? destination };
  return capability ? { capability } : null;
}

/** The case's IV-access procedure (the world's rule: id `iv-access`, else a procedure requiring `iv-access`, else a cannulation). */
export { ivAccessIntervention };

/** The intervention a `give_intervention` names (`params.intervention` or the target; an id, else a query). */
function interventionOf(h: Pick<DelegationHost, "caseDef" | "locale">, params: Record<string, unknown>, target: string): string | null {
  const wanted = strArg(params, "intervention") || target;
  if (!wanted) return null;
  const byId = resolveIntervention(h.caseDef, { intervention_id: wanted }, h.locale());
  const res = byId.kind === "id" ? byId : resolveIntervention(h.caseDef, { query: wanted }, h.locale());
  return res.kind === "id" ? res.id : null;
}

/** Run a delegated task (see the module docs). */
export async function runDelegation(h: DelegationHost, caller: ClinicalCaller, args: Record<string, unknown>): Promise<DelegationResult> {
  const role = strArg(args, "role");
  const task = strArg(args, "task");
  const params = (args.params && typeof args.params === "object" && !Array.isArray(args.params) ? args.params : {}) as Record<string, unknown>;
  const target = strArg(args, "target");
  const world = h.world();
  const patient = h.patientId();
  const clockStart = h.state().clock;
  const result: DelegationResult = { staffId: null, role, task, status: "failed", steps: [], elapsedSeconds: 0, clockMinutes: 0, distance: 0 };
  const finish = (status: DelegationResult["status"], message?: string): DelegationResult => {
    // Stopped by its caller (the learner's interrupt, a cancelled external call): cancelled, not failed (review C17).
    result.status = status === "failed" && caller.signal?.aborted ? "cancelled" : status;
    if (message) result.message = message;
    return result;
  };
  /** The totals, once nothing more happens (the clean-up included). */
  const settle = (): DelegationResult => {
    result.clockMinutes = r2(h.state().clock - clockStart);
    result.elapsedSeconds = r2(result.elapsedSeconds);
    result.distance = r2(result.distance);
    return result;
  };
  if (!(DELEGATION_TASKS as readonly string[]).includes(task)) return finish("failed", "unknown-task");
  const staff = pickStaff(world, role, patient, { caseDef: h.caseDef, state: h.state(), facility: h.facility, task });
  if (!staff) return finish("failed", "unknown-role");
  result.staffId = staff;
  if (!patient) return finish("failed", "no-patient");
  // Only what the staff member's role — or for the operating table's tasks, their controls — allows: checked before
  // they take a step (review S3; EMBODIED §8.3).
  const L = h.locale();
  const who = scopeActorOf(h.caseDef, h.state(), h.facility, world, staff, L) ?? { role: world.actor(staff)?.role ?? role, name: staff };
  const scoped = checkTaskScope(who, task, h.caseDef, L, task === "give_intervention" ? interventionOf(h, params, target) : null);
  if (!scoped.ok) {
    result.refusal = scoped.message;
    result.steps.push({ operation: task, status: "failed", code: scoped.code, message: scoped.message });
    return finish("failed", "not-authorized");
  }
  h.onStaff?.(staff);
  // What the staff member holds already is not this task's to release.
  const heldBefore = new Set(heldBy(world, staff));
  const staffRef = staff.replace(/^staff:/u, "");
  /** The ports whose instruments this colleague holds at the operating table. */
  const holding = () => (h.state().procedure?.ports ?? []).filter((p) => p.holder === staffRef && p.instrument);

  const span = h.trace.start("plan", `delegate:${task}`, { actorId: staff, refs: { entities: [patient] }, data: { role, task, ...(target ? { target } : {}) } });
  let cancelled = false;
  const record = (operation: string, r: WorldActionResult, targetId?: string) => {
    result.steps.push({ operation, ...(targetId ? { target: targetId } : {}), status: r.status, ...(r.errorCode ? { code: r.errorCode } : {}), message: r.message });
    result.elapsedSeconds += r.elapsedSeconds ?? 0;
    result.distance += r.navigation?.length ?? 0;
    // A walk stopped short is the caller's cancellation when the caller stopped it (else an obstacle: a failure).
    if (r.status === "cancelled" && (r.errorCode !== "MOVEMENT_INTERRUPTED" || caller.signal?.aborted)) cancelled = true;
    return r;
  };
  // done for the delegating clinician: its observations report the staff member's actions (G13)
  const go = async (goal: NavGoal) => record("navigate", await h.act(caller, { actorId: staff, operation: "navigate", goal, onBehalfOf: PRIMARY_ACTOR }), "id" in goal ? goal.id : undefined);
  const operate = async (id: string, operation: string, parameters?: Record<string, unknown>, goal?: NavGoal): Promise<WorldActionResult> => {
    const request: WorldRequestInput = { actorId: staff, operation, targetId: id, onBehalfOf: PRIMARY_ACTOR, ...(parameters ? { parameters } : {}), ...(goal ? { goal } : {}) };
    let r = record(operation, await h.act(caller, request), id);
    // a reach hint: walk there; a fetch hint (`then`): walk to the cart and wheel it to the patient — then retry once
    const hint = r.status === "failed" ? r.hint : null;
    if (hint && (r.errorCode === "NOT_IN_RANGE" || r.errorCode === "NOT_VISIBLE" || hint.then)) {
      let ready = (await go(hint.goal)).status === "completed";
      if (ready && hint.then) {
        const then: WorldRequestInput = { actorId: staff, operation: hint.then.operation, targetId: hint.then.targetId, onBehalfOf: PRIMARY_ACTOR, ...(hint.then.goal ? { goal: hint.then.goal } : {}) };
        ready = record(hint.then.operation, await h.act(caller, then), hint.then.targetId).status === "completed";
      }
      if (ready) r = record(operation, await h.act(caller, request), id);
    }
    return r;
  };
  const toPatient = () => go({ kind: "interact", id: patient });
  /** A clinical tool as the delegating agent, acting with the staff body; follows a spatial hint once. */
  const clinical = async (tool: string, toolArgs: Record<string, unknown>): Promise<boolean> => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const call = await h.runTool(caller, tool, toolArgs, { actorId: staff });
      const d = call.output.data as { hint?: { goal: NavGoal } | null; reason?: string; rejected?: { code?: string } } | undefined;
      const code = spatialCodeOf(call.output) ?? d?.rejected?.code ?? (call.ok ? undefined : call.status.toUpperCase());
      result.steps.push({ operation: tool, target: String(Object.values(toolArgs)[0] ?? ""), status: call.ok ? "completed" : call.status === "cancelled" || call.status === "interrupted" ? "cancelled" : "failed", ...(code ? { code } : {}), message: call.output.output.split("\n")[0] ?? "" });
      if (call.ok) return true;
      if (call.status === "cancelled" || call.status === "interrupted") {
        cancelled = true;
        return false;
      }
      if (attempt > 0 || !spatialCodeOf(call.output) || !d?.hint) return false;
      // Fetch what must stand at the bedside, or walk where the hint says.
      if (d.reason === "provider-not-at-bedside" && d.hint.goal.kind === "interact") {
        const cart = d.hint.goal.id;
        if ((await go(d.hint.goal)).status !== "completed") return false;
        if ((await operate(cart, "move_to", undefined, { kind: "interact", id: patient })).status !== "completed") return false;
      } else if ((await go(d.hint.goal)).status !== "completed") return false;
    }
    return false;
  };
  /** Run a device's operations up to its clinical one, then release it. */
  const deviceTask = async (deviceId: string, tool: string, itemId: string): Promise<boolean> => {
    const route = clinicalOperation(world, deviceId, tool, itemId, h.caseDef, h.locale());
    if (!route) return false;
    const state = world.inspect(staff, deviceId)?.state ?? null;
    const path = operationPath(route.spec, state, route.op);
    if (!path) return false;
    for (const op of path) if ((await operate(deviceId, op)).status !== "completed") return false;
    const done = await operate(deviceId, route.op.id, route.parameters);
    if (done.status === "completed") {
      const release = releaseOperation(route.spec, world.inspect(staff, deviceId)?.state ?? null);
      if (release) await operate(deviceId, release.id);
    }
    return done.status === "completed";
  };
  /** The nearest cart providing a capability (at the bedside first). */
  const cartFor = (capability: string): string | null => {
    const list = world.find(staff, { kind: "equipment", capabilities: [capability], limit: 20 }).filter((e) => world.entity(e.id)?.portable && e.state !== "out-of-service");
    return list.find((e) => h.atBedside(e.id))?.id ?? list[0]?.id ?? null;
  };
  const fetch = async (cart: string): Promise<boolean> => {
    if (h.atBedside(cart)) return true;
    if ((await go({ kind: "interact", id: cart })).status !== "completed") return false;
    return (await operate(cart, "move_to", undefined, { kind: "interact", id: patient })).status === "completed";
  };

  const verify = (name: string, ok: boolean) => h.trace.start("verification", name, { actorId: staff, refs: { entities: [patient] } }).end({ ok, worldVersion: world.version });
  /** Let go of every port this colleague holds — traction first, the camera too — and hand the instruments back (their own steps, at the table). */
  const letGo = async (): Promise<boolean> => {
    for (const p of holding()) {
      const held = { port: p.site, instrument: p.instrument! };
      for (const [structure, r] of Object.entries(h.state().procedure?.retractions ?? {})) if (r.port === p.site && !(await clinical("operate", { op: "release", structure }))) return false;
      if (!(await clinical("operate", { op: "hand-over", port: p.site }))) return false;
      (result.letGo ??= []).push(held);
    }
    return true;
  };
  /** The plan's camera port: the one with the scope in it, else the first camera port (null: none, or no plan yet). */
  const cameraSite = (): string | null => {
    const ports = h.state().procedure?.ports ?? [];
    return (ports.find((p) => p.role === "camera" && p.instrument === "laparoscope") ?? ports.find((p) => p.role === "camera"))?.site ?? null;
  };
  /** Take the camera port: already theirs; handed over to them; or, empty, the laparoscope put into it (their own steps). */
  const takeCamera = async (port: string): Promise<boolean> => {
    const p = (h.state().procedure?.ports ?? []).find((x) => x.site === port);
    if (p?.holder === staffRef && p.instrument) return true;
    const ok = p && !p.instrument ? await clinical("operate", { op: "insert", port, instrument: "laparoscope" }) : await clinical("operate", { op: "hand-over", port, to: staffRef });
    if (ok) result.camera = { port };
    return ok && holding().some((x) => x.site === port);
  };
  const run = async (): Promise<DelegationResult> => {
    // traction is let go before anything else is done with these hands (the operating table's own tasks keep them)
    if (!THEATRE_TASK_CONTROL[task] && holding().length && !(await letGo())) return finish(cancelled ? "cancelled" : "failed");
    switch (task as DelegationTask) {
      case "hold_traction": {
        const port = strArg(params, "port") || target;
        if (!port) return finish("failed", "no-target");
        if ((await toPatient()).status !== "completed") return finish(cancelled ? "cancelled" : "failed");
        const ok = (await clinical("operate", { op: "hand-over", port, to: staffRef })) && holding().some((p) => p.site === port);
        const p = holding().find((x) => x.site === port);
        if (p) result.holding = { port, instrument: p.instrument! };
        verify(`holding port ${port}`, ok);
        return finish(ok ? "completed" : cancelled ? "cancelled" : "failed");
      }
      case "release_traction": {
        const ok = (await letGo()) && holding().length === 0;
        verify("traction let go", ok);
        return finish(ok ? "completed" : cancelled ? "cancelled" : "failed");
      }
      case "hold_camera": {
        const port = strArg(params, "port") || target || cameraSite();
        if (!port) return finish("failed", "no-target");
        if ((await toPatient()).status !== "completed") return finish(cancelled ? "cancelled" : "failed");
        const ok = await takeCamera(port);
        verify(`camera in port ${port}`, ok);
        return finish(ok ? "completed" : cancelled ? "cancelled" : "failed");
      }
      case "aim_camera": {
        const region = strArg(params, "region") || target;
        const zoom = strArg(params, "zoom");
        const port = strArg(params, "port") || cameraSite();
        if (!region || !port || (zoom && zoom !== "close" && zoom !== "wide")) return finish("failed", "no-target");
        if ((await toPatient()).status !== "completed") return finish(cancelled ? "cancelled" : "failed");
        let ok = (await takeCamera(port)) && (await clinical("operate", { op: "aim", port, at: region }));
        if (ok && zoom) ok = await clinical("operate", { op: "zoom", port, level: zoom });
        const camera = h.state().procedure?.camera;
        if (ok && camera) result.aimed = { region, zoom: camera.zoom };
        verify(`camera on ${region}`, ok);
        return finish(ok ? "completed" : cancelled ? "cancelled" : "failed");
      }
      case "pass_instrument": {
        const instrument = strArg(params, "instrument") || target;
        const to = strArg(params, "to").replace(/^staff:/u, "");
        if (!instrument) return finish("failed", "no-target");
        if ((await toPatient()).status !== "completed") return finish(cancelled ? "cancelled" : "failed");
        const ok = await clinical("operate", { op: "pass", instrument, ...(to ? { to } : {}) });
        if (ok) result.passed = { instrument, ...(to ? { to } : {}) };
        verify(`passed ${instrument}`, ok);
        return finish(ok ? "completed" : cancelled ? "cancelled" : "failed");
      }
      case "attach_monitor": {
        const monitor = h.patientMonitorId();
        if (!monitor) return finish("failed", "no-item");
        if (world.inspect(staff, monitor)?.state === "attached") {
          verify("monitor attached", true);
          return finish("completed");
        }
        if ((await toPatient()).status !== "completed") return finish(cancelled ? "cancelled" : "failed");
        const r = await operate(monitor, "attach");
        const ok = r.status === "completed" && monitorAttached(h.caseDef, h.state());
        verify("monitor attached", ok);
        return finish(ok ? "completed" : cancelled ? "cancelled" : "failed");
      }
      case "record_ecg": {
        const wanted = strArg(params, "investigation") || target;
        const inv = wanted ? resolveInvestigation(h.caseDef, { query: wanted, investigation_id: wanted }, h.locale()) : null;
        const itemId = inv?.kind === "id" ? inv.id : h.caseDef.investigations.find((i) => i.requires.length > 0 && i.requires.every((x) => x === "ecg-12lead"))?.id;
        if (!itemId) return finish("failed", "no-item");
        const cart = cartFor("ecg-12lead");
        if (!cart || !(await fetch(cart))) return finish(cancelled ? "cancelled" : "failed");
        if ((await toPatient()).status !== "completed") return finish(cancelled ? "cancelled" : "failed");
        const ok = (await deviceTask(cart, "order_test", itemId)) && h.state().orders.some((o) => o.investigationId === itemId);
        verify(`ordered ${itemId}`, ok);
        return finish(ok ? "completed" : cancelled ? "cancelled" : "failed");
      }
      case "obtain_iv_access": {
        const iv = ivAccessIntervention(h.caseDef);
        if (!iv) return finish("failed", "no-item");
        if ((await toPatient()).status !== "completed") return finish(cancelled ? "cancelled" : "failed");
        const ok = (await clinical("intervene", { intervention_id: iv })) && h.state().interventions.some((x) => x.interventionId === iv);
        verify(`intervened ${iv}`, ok);
        return finish(ok ? "completed" : cancelled ? "cancelled" : "failed");
      }
      case "fetch_equipment": {
        const capability = strArg(params, "capability");
        const resolved = target ? h.resolve(target, staff) : null;
        const cart = resolved && world.entity(resolved)?.portable ? resolved : cartFor(capability || target);
        if (!cart) return finish("failed", "no-target");
        const ok = await fetch(cart);
        // where it stands now (the final position, measured — not where it was asked to go)
        const e = world.entity(cart);
        const p = world.entity(patient);
        if (e && p) result.delivered = { entityId: cart, room: e.room, distance: r2(Math.hypot(e.position.x - p.position.x, e.position.z - p.position.z)), x: r2(e.position.x), z: r2(e.position.z) };
        verify(`at bedside ${cart}`, ok && h.atBedside(cart));
        return finish(ok && h.atBedside(cart) ? "completed" : cancelled ? "cancelled" : "failed");
      }
      case "transport_patient": {
        const parameters = transportParameters(h, staff, params, target);
        if (!parameters) return finish("failed", "no-target");
        if ((await toPatient()).status !== "completed") return finish(cancelled ? "cancelled" : "failed");
        const before = world.patientPlace();
        const r = await operate(patient, "transport_patient", parameters);
        const after = world.patientPlace();
        const ok = r.status === "completed" && !!after;
        verify(`patient at ${after?.provider ?? after?.slot ?? "—"}${before && after && before.x === after.x && before.z === after.z ? " (already there)" : ""}`, ok);
        return finish(ok ? "completed" : cancelled ? "cancelled" : "failed");
      }
      case "give_intervention": {
        const wanted = strArg(params, "intervention") || target;
        const id = interventionOf(h, params, target);
        if (!id) {
          // three different failures, said apart: nothing named; an entity named (equipment is not a treatment);
          // a name the case has no intervention for
          if (!wanted) return finish("failed", "no-target");
          result.asked = wanted;
          return finish("failed", h.resolve(wanted, staff) ? "target-not-intervention" : "unknown-intervention");
        }
        // an out-of-order checklist attempt is recorded as invalid: it is not the task done
        const given = () => h.state().interventions.filter((x) => x.interventionId === id && !x.invalid).length;
        const before = given();
        if ((await toPatient()).status !== "completed") return finish(cancelled ? "cancelled" : "failed");
        const ok = (await clinical("intervene", { intervention_id: id })) && given() > before;
        verify(`intervened ${id}`, ok);
        return finish(ok ? "completed" : cancelled ? "cancelled" : "failed");
      }
    }
  };
  /**
   * Whatever the outcome — done, failed, denied, cancelled — the staff member leaves no device reserved (review C3):
   * a cart prepared for a tracing the learner then refused is reset. Without the task's cancellation signal (an
   * interrupted task cleans up too).
   */
  const cleanUp = async () => {
    const { signal: _cancelled, ...detached } = caller;
    await releaseHeld(world, staff, heldBefore, async (id, operation) => {
      const request: WorldRequestInput = { actorId: staff, operation, targetId: id, onBehalfOf: PRIMARY_ACTOR };
      let r = record(operation, await h.act(detached, request), id);
      if (r.status === "failed" && r.hint && (r.errorCode === "NOT_IN_RANGE" || r.errorCode === "NOT_VISIBLE")) {
        const walk = record("navigate", await h.act(detached, { actorId: staff, operation: "navigate", goal: r.hint.goal, onBehalfOf: PRIMARY_ACTOR }));
        if (walk.status === "completed") r = record(operation, await h.act(detached, request), id);
      }
      return r;
    });
  };
  try {
    return await h.trace.within(span.id, async () => {
      try {
        return await run();
      } finally {
        await cleanUp();
        settle();
      }
    });
  } finally {
    span.end({ ok: result.status === "completed", worldVersion: world.version, data: { status: result.status, steps: result.steps.length, elapsedSeconds: r2(result.elapsedSeconds) } });
  }
}
