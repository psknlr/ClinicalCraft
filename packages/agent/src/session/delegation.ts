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
 * the bedside).
 */
import { monitorAttached, type CaseDefinition, type SessionState } from "@clinicalcraft/core";
import { ivAccessIntervention, PRIMARY_ACTOR, type ActorId, type NavGoal, type WorldActionResult, type WorldRuntime } from "@clinicalcraft/world";
import type { SkillToolCall } from "../skills/interpreter.js";
import { resolveIntervention, resolveInvestigation, strArg } from "../tools/clinical.js";
import { spatialCodeOf } from "../tools/spatial.js";
import type { WorldRequestInput } from "../tools/world.js";
import { DELEGATION_TASKS } from "../tools/world.js";
import { clinicalOperation, operationPath, releaseOperation } from "./device-ops.js";
import type { ClinicalCaller } from "./embodied-types.js";
import type { SessionTrace } from "./trace.js";

/** What delegation needs from the embodied session. */
export interface DelegationHost {
  readonly caseDef: CaseDefinition;
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
  /** Why the task could not start (unknown role, task, missing target). */
  message?: string;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/** The staff member for a role (or a staff id): the one nearest to the patient. */
export function pickStaff(world: WorldRuntime, role: string, patientId: string | null): ActorId | null {
  const direct = role.startsWith("staff:") ? world.actor(role) : world.actor(`staff:${role}`);
  if (direct && direct.id.startsWith("staff:")) return direct.id;
  const candidates = world.actors().filter((a) => a.id.startsWith("staff:") && a.role === role);
  if (!candidates.length) return null;
  const patient = patientId ? world.entity(patientId) : null;
  const dist = (a: (typeof candidates)[number]) => (patient && a.pose.level === patient.level ? Math.hypot(a.pose.x - patient.position.x, a.pose.z - patient.position.z) : 1e9);
  return [...candidates].sort((a, b) => dist(a) - dist(b) || (a.id < b.id ? -1 : 1))[0]!.id;
}

/** The case's IV-access procedure (the world's rule: id `iv-access`, else a procedure requiring `iv-access`, else a cannulation). */
export { ivAccessIntervention };

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
    result.status = status;
    if (message) result.message = message;
    result.clockMinutes = r2(h.state().clock - clockStart);
    result.elapsedSeconds = r2(result.elapsedSeconds);
    result.distance = r2(result.distance);
    return result;
  };
  if (!(DELEGATION_TASKS as readonly string[]).includes(task)) return finish("failed", "unknown-task");
  const staff = pickStaff(world, role, patient);
  if (!staff) return finish("failed", "unknown-role");
  result.staffId = staff;
  if (!patient) return finish("failed", "no-patient");

  const span = h.trace.start("plan", `delegate:${task}`, { actorId: staff, refs: { entities: [patient] }, data: { role, task, ...(target ? { target } : {}) } });
  let cancelled = false;
  const record = (operation: string, r: WorldActionResult, targetId?: string) => {
    result.steps.push({ operation, ...(targetId ? { target: targetId } : {}), status: r.status, ...(r.errorCode ? { code: r.errorCode } : {}), message: r.message });
    result.elapsedSeconds += r.elapsedSeconds ?? 0;
    result.distance += r.navigation?.length ?? 0;
    if (r.status === "cancelled" && r.errorCode !== "MOVEMENT_INTERRUPTED") cancelled = true;
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
  const run = async (): Promise<DelegationResult> => {
    switch (task as DelegationTask) {
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
        verify(`at bedside ${cart}`, ok && h.atBedside(cart));
        return finish(ok && h.atBedside(cart) ? "completed" : cancelled ? "cancelled" : "failed");
      }
      case "give_intervention": {
        const wanted = strArg(params, "intervention") || target;
        const byId = wanted ? resolveIntervention(h.caseDef, { intervention_id: wanted }, h.locale()) : null;
        const res = byId?.kind === "id" ? byId : wanted ? resolveIntervention(h.caseDef, { query: wanted }, h.locale()) : null;
        const id = res?.kind === "id" ? res.id : null;
        if (!id) return finish("failed", "no-target");
        const before = h.state().interventions.filter((x) => x.interventionId === id).length;
        if ((await toPatient()).status !== "completed") return finish(cancelled ? "cancelled" : "failed");
        const ok = (await clinical("intervene", { intervention_id: id })) && h.state().interventions.filter((x) => x.interventionId === id).length > before;
        verify(`intervened ${id}`, ok);
        return finish(ok ? "completed" : cancelled ? "cancelled" : "failed");
      }
    }
  };
  try {
    return await h.trace.within(span.id, run);
  } finally {
    span.end({ ok: result.status === "completed", worldVersion: world.version, data: { status: result.status, steps: result.steps.length, elapsedSeconds: r2(result.elapsedSeconds) } });
  }
}
