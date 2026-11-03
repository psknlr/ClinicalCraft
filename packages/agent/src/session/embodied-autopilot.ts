/**
 * The embodied offline autopilot — the reference agent of embodied mode
 * (docs/EMBODIED.md §6, §10). It replays the case's reference solution like
 * the clinical-mode offline clinician (`offlineClinicianTurn`: same steps,
 * same skipping of satisfied steps, same waits), but every clinical step is
 * carried out by the body:
 *
 *   intent → requirement (`checkSpatial`) → if unmet: walk to `hint.goal`
 *   (wheel a portable provider to the bedside when the policy says the
 *   capability must stand there; take the patient to the device a study is
 *   done at — `hint.then: transport_patient` — by a porter when the facility
 *   has one, else wheeling them yourself) → the clinical act — through a device
 *   operation when a satisfying device offers one (an ECG cart's prepare →
 *   connect → record → reset, the patient's monitor `attach`, a
 *   workstation's `order` / `read`, a device's `use`), else the clinical
 *   tool itself → verify the postcondition in engine state
 *   (asked / examined / ordered / read / intervened / decided…).
 *
 * Every step records a `plan` span whose children are the observation, the
 * walks (`navigation`), the device operations (`interaction` →
 * `clinical_action` → `state_change`, recorded by the world) or the direct
 * clinical act (`clinical_action` → `state_change`) and a `verification`.
 * A step the policy makes impossible is narrated and listed as missed —
 * never done through the non-spatial path. After a study the patient was
 * taken to, they are taken back to their bed space unless the next step
 * needs them at a device too (EMBODIED §8). In a case that keeps a surgical count, closure waits for the count:
 * before `operate close` on a count that is not settled, the closing count is made at the count board in the
 * patient's room (docs/TEAM.md §4.3) — the autopilot never closes on a count it did not take.
 */
import { countSettled, countStatus, type ClinicalAction, type SessionState } from "@clinicalcraft/core";
import { behaviorOf, PRIMARY_ACTOR, roleName, type ActionHint, type NavGoal, type SpatialRequirement, type WorldActionResult, type WorldRuntime } from "@clinicalcraft/world";
import { clinicianOfflineSteps, minutesUntilReadable, stepAlreadySatisfied, stepForAction, type OfflineClinicianStep } from "../agents/offline.js";
import type { ToolCallStatus } from "../loop.js";
import { actionIntent } from "../tools/spatial.js";
import type { WorldRequestInput } from "../tools/world.js";
import { nameOf } from "../tools/world-format.js";
import { lostTraction, walkthroughEndText, type AgentOutcome, type AutopilotHost } from "./autopilot.js";
import { clinicalOperation, heldBy, operationPath, releaseHeld, releaseOperation, type DeviceRoute } from "./device-ops.js";
import { rt } from "./i18n.js";
import type { SessionTrace } from "./trace.js";

/** What the embodied autopilot needs beyond the autopilot host. */
export interface EmbodiedAutopilotHost {
  world(): WorldRuntime;
  readonly trace: SessionTrace;
  /** A world action of the clinician's body (its clinical effect runs through the clinician's tool path in `turnId`). */
  act(request: WorldRequestInput, turnId: string, signal?: AbortSignal): Promise<WorldActionResult>;
  patientId(): string | null;
  patientMonitorId(): string | null;
}

/** Longest single `wait` tool call (its input schema's maximum). */
const MAX_WAIT_MINUTES = 240;

/** Walks / fetches tried to satisfy one step's requirement. */
const MAX_APPROACHES = 4;

type StepRun = { status: ToolCallStatus; ok: boolean };

function fromWorld(r: WorldActionResult, signal?: AbortSignal): StepRun {
  if (r.status === "completed") return { status: "ok", ok: true };
  if (r.errorCode === "APPROVAL_DENIED") return { status: "denied", ok: false };
  if (r.status === "cancelled" || r.errorCode === "CANCELLED") return { status: signal?.aborted ? "interrupted" : "cancelled", ok: false };
  return { status: "error", ok: false };
}

/** The phase a read step reads (as `read_result` resolves it, for the workstation's `read`). */
function readPhase(step: OfflineClinicianStep): string | undefined {
  return step.action.type === "read" ? step.action.phase : undefined;
}

/** Devices that could carry out a step: the patient's monitor for a monitoring intervention, then what satisfied the requirement. */
function deviceRoute(host: AutopilotHost, e: EmbodiedAutopilotHost, step: OfflineClinicianStep, satisfiedBy: readonly string[]): DeviceRoute | null {
  if (step.kind !== "tool") return null;
  const a = step.action;
  const item = a.type === "order" || a.type === "read" ? a.investigationId : a.type === "intervene" ? a.interventionId : null;
  if (!item) return null;
  const patient = e.patientId();
  const candidates = [...satisfiedBy.filter((id) => id !== patient)];
  if (a.type === "intervene" && host.caseDef.interventions.find((i) => i.id === item)?.kind === "monitoring") {
    const monitor = e.patientMonitorId();
    if (monitor) candidates.unshift(monitor);
  }
  for (const id of [...new Set(candidates)]) {
    const route = clinicalOperation(e.world(), id, step.tool, item, host.caseDef, host.locale, readPhase(step));
    if (route) return route;
  }
  return null;
}

/**
 * Operate a device up to its clinical operation (following a reach hint once per operation), then release it.
 * Whatever happens on the way — a refused approval, a busy or broken device, an interrupt — the body leaves no
 * device reserved that it took on this route (review C3: the cart is reset, without the turn's signal).
 */
async function runDevice(e: EmbodiedAutopilotHost, route: DeviceRoute, turnId: string, signal?: AbortSignal): Promise<StepRun | null> {
  const world = e.world();
  const operate = async (op: string, parameters?: Record<string, unknown>, sig: AbortSignal | undefined = signal, target = route.entityId): Promise<WorldActionResult> => {
    const request: WorldRequestInput = { operation: op, targetId: target, ...(parameters ? { parameters } : {}) };
    let r = await e.act(request, turnId, sig);
    if (r.status === "failed" && r.hint && (r.errorCode === "NOT_IN_RANGE" || r.errorCode === "NOT_VISIBLE")) {
      const nav = await e.act({ operation: "navigate", goal: r.hint.goal }, turnId, sig);
      if (nav.status === "completed") r = await e.act(request, turnId, sig);
    }
    return r;
  };
  const before = new Set(heldBy(world, PRIMARY_ACTOR));
  try {
    const state = world.inspect(PRIMARY_ACTOR, route.entityId)?.state ?? null;
    const path = operationPath(route.spec, state, route.op);
    if (!path) return null;
    for (const op of path) {
      const r = await operate(op);
      // A device that cannot be prepared (busy, out of service…): the clinical tool instead.
      if (r.status !== "completed") return r.status === "cancelled" ? fromWorld(r, signal) : null;
    }
    const done = await operate(route.op.id, route.parameters);
    if (done.status === "completed") {
      const release = releaseOperation(route.spec, world.inspect(PRIMARY_ACTOR, route.entityId)?.state ?? null);
      if (release) await operate(release.id);
    }
    // The clinical effect ran (or a person / the engine refused it): that is the step's outcome. A device that
    // cannot be used from where the patient can be treated (out of reach, busy…) leaves the clinical tool.
    return FINAL_DEVICE_OUTCOMES.has(done.status === "completed" ? "completed" : (done.errorCode ?? "")) ? fromWorld(done, signal) : null;
  } finally {
    await releaseHeld(world, PRIMARY_ACTOR, before, (id, op) => operate(op, undefined, undefined, id));
  }
}

/** Does a requirement need the patient at a device (a study done on them there: `patient-at-provider`)? */
function needsPatientAtProvider(r: SpatialRequirement): boolean {
  if (r.kind === "patient-at-provider") return true;
  return (r.kind === "any-of" || r.kind === "all-of") && r.options.some(needsPatientAtProvider);
}

/**
 * Take the patient where a hint's `then` says (`transport_patient`, EMBODIED §8): a porter does it when the
 * facility has one (delegated, through the clinician's tool path), else the clinician walks to the patient's side
 * and wheels them there. True when the patient got there.
 */
async function transportPatient(host: AutopilotHost, e: EmbodiedAutopilotHost, then: NonNullable<ActionHint["then"]>, turnId: string, signal?: AbortSignal): Promise<boolean> {
  const world = e.world();
  const L = host.locale;
  const parameters = { ...(then.parameters ?? {}) };
  const destination = typeof parameters.destination === "string" ? parameters.destination : "";
  const target = destination === "home" ? rt(L, "world.transport.home") : destination ? nameOf(world, destination, L) : String(parameters.capability ?? "—");
  if (world.actors().some((a) => a.role === "porter" && a.id.startsWith("staff:"))) {
    host.narrate(turnId, rt(L, "clinician.narrate.transportBy", { role: roleName("porter", L), target }));
    const o = await host.executeTool(turnId, "delegate_task", { role: "porter", task: "transport_patient", params: parameters }, signal);
    if (o.status === "ok" && o.output.ok) return true;
    if (signal?.aborted) return false;
  }
  host.narrate(turnId, rt(L, "clinician.narrate.transport", { target }));
  if ((await e.act({ operation: "navigate", goal: { kind: "interact", id: then.targetId } }, turnId, signal)).status !== "completed") return false;
  return (await e.act({ operation: "transport_patient", targetId: then.targetId, parameters }, turnId, signal)).status === "completed";
}

/**
 * After a step, a patient who was taken to a device for a study goes back to their bed space — unless the next
 * step that acts on the patient needs them at a device too (then `satisfy` takes them on from there).
 */
async function returnPatient(host: AutopilotHost, e: EmbodiedAutopilotHost, steps: readonly OfflineClinicianStep[], turnId: string, signal?: AbortSignal): Promise<void> {
  const world = e.world();
  const place = world.patientPlace();
  const patient = e.patientId();
  if (!place || !patient || signal?.aborted) return;
  const home = place.home.slot ? place.slot === place.home.slot : !place.slot && place.provider === place.home.provider;
  if (home) return;
  for (let i = host.cursor.value; i < steps.length; i++) {
    const step = steps[i]!;
    if (step.kind !== "tool" || stepAlreadySatisfied(step, host.state(), host.cursor.extraOps)) continue;
    const intent = actionIntent(step.action as ClinicalAction);
    if (!intent) continue;
    if (needsPatientAtProvider(world.checkSpatial(PRIMARY_ACTOR, intent).requirement)) return;
    break;
  }
  // its own plan span: the walk (or the porter's task) and the verification that the patient is home
  const plan = e.trace.start("plan", "transport_patient home", { actorId: PRIMARY_ACTOR, refs: { entities: [patient] }, data: { tool: "transport_patient", args: { destination: "home" } } });
  let ok = false;
  try {
    ok = await e.trace.within(plan.id, async () => {
      await transportPatient(host, e, { operation: "transport_patient", targetId: patient, parameters: { destination: "home" } }, turnId, signal);
      const now = world.patientPlace();
      const back = !!now && (now.home.slot ? now.slot === now.home.slot : !now.slot && now.provider === now.home.provider);
      e.trace.start("verification", "patient home", { actorId: PRIMARY_ACTOR }).end({ ok: back, worldVersion: world.version, data: { place: now ? { slot: now.slot, provider: now.provider } : null } });
      return back;
    });
  } finally {
    plan.end({ ok, worldVersion: world.version });
  }
}

/** Device outcomes that end a step (anything else falls back to the clinical tool at the patient's side). */
const FINAL_DEVICE_OUTCOMES: ReadonlySet<string> = new Set(["completed", "APPROVAL_DENIED", "CANCELLED", "CLINICAL_REJECTED"]);

/**
 * The postcondition of a step after it ran: its effect is in the engine state —
 * for a wait the walkthrough inserted (no reference clock to reach), the clock
 * advanced by its minutes.
 */
function stepVerified(step: OfflineClinicianStep, state: SessionState, clockBefore: number): boolean {
  if (step.action.type === "advance-time" && step.refClockAfter === undefined) return state.clock >= clockBefore + step.action.minutes - 1e-9;
  return stepAlreadySatisfied(step, state);
}

/** Carry out one tool step with the body (see the module docs). */
/** The world request a hint's `then` names. */
function thenRequest(then: NonNullable<ActionHint["then"]>) {
  return { operation: then.operation, targetId: then.targetId, ...(then.goal ? { goal: then.goal } : {}), ...(then.parameters ? { parameters: then.parameters } : {}) };
}

/** Prerequisite chains followed by `achieve` (the count board's final count → the RF wand's scan → picking it up). */
const MAX_PREREQUISITE_DEPTH = 4;

/**
 * Do a world operation, following its refusals: walk to the hint's goal, do the hint's `then` first (recursively),
 * then try again — a few attempts, a few levels deep. True when it was done.
 */
async function achieve(e: EmbodiedAutopilotHost, request: Parameters<EmbodiedAutopilotHost["act"]>[0], turnId: string, signal?: AbortSignal, depth = 0): Promise<boolean> {
  for (let attempt = 0; attempt < 3 && !signal?.aborted; attempt++) {
    const r = await e.act(request, turnId, signal);
    if (r.status === "completed") return true;
    if (r.status === "cancelled" || !r.hint || depth >= MAX_PREREQUISITE_DEPTH) return false;
    if ((await e.act({ operation: "navigate", goal: r.hint.goal }, turnId, signal)).status !== "completed") return false;
    if (r.hint.then && !(await achieve(e, thenRequest(r.hint.then), turnId, signal, depth + 1))) return false;
  }
  return false;
}

/**
 * A record-backed count device (`surgical_count` operations) in the patient's room — the count board, or (`handheld`)
 * the RF wand — with its operations by step.
 */
function countDevice(world: WorldRuntime, patientId: string | null, handheld: boolean): { id: string; ops: Map<string, string> } | null {
  const room = patientId ? world.entity(patientId)?.room : null;
  for (const e of world.entities()) {
    if (e.kind !== "equipment" || (e.portable === "handheld") !== handheld || (room && e.room !== room)) continue;
    const spec = behaviorOf(e);
    const ops = spec.derived === "case-record" ? spec.operations.filter((o) => o.clinical?.tool === "surgical_count" && o.clinical.item) : [];
    if (ops.length) return { id: e.id, ops: new Map(ops.map((o) => [o.clinical!.item!, o.id])) };
  }
  return null;
}

/**
 * Before closure on a count that is not settled (docs/TEAM.md §4.3): the closing count (or a recount) at the count
 * board; still open — the discrepancy escalated on the board (unless it was), then the patient scanned with the RF
 * wand: a retained swab found is searched out of the wound and the count taken again; a clear scan excludes one.
 */
async function countBeforeClosure(host: AutopilotHost, e: EmbodiedAutopilotHost, step: OfflineClinicianStep, turnId: string, signal?: AbortSignal): Promise<void> {
  const a = step.action;
  if (a.type !== "operate" || a.op.op !== "close" || !host.state().count) return;
  const settled = () => countSettled(host.state().count);
  const board = countDevice(e.world(), e.patientId(), false);
  if (settled() || !board) return;
  const on = async (device: { id: string; ops: Map<string, string> }, stepId: string) => {
    const op = device.ops.get(stepId);
    return !!op && (await achieve(e, { operation: op, targetId: device.id }, turnId, signal));
  };
  for (const stage of ["closing", "recount"]) if ((await on(board, stage)) && countStatus(host.state().count) !== "baseline") break;
  if (settled() || signal?.aborted) return;
  if (countStatus(host.state().count) === "discrepancy") await on(board, "escalate");
  const wand = countDevice(e.world(), e.patientId(), true);
  if (!wand || !(await on(wand, "scan"))) return;
  const patient = e.patientId();
  const found = host.state().count?.entries.findLast((x) => x.op === "scan");
  if (found?.op === "scan" && found.detected.length && patient) {
    // a retained swab: out of the wound, then counted again
    await e.act({ operation: "search", targetId: patient }, turnId, signal);
    await on(board, "recount");
  }
  await e.act({ operation: "put_down", targetId: wand.id }, turnId, signal);
}

async function runEmbodiedStep(host: AutopilotHost, e: EmbodiedAutopilotHost, step: Extract<OfflineClinicianStep, { kind: "tool" }>, turnId: string, signal?: AbortSignal): Promise<StepRun> {
  const intent = actionIntent(step.action as ClinicalAction);
  const actor = PRIMARY_ACTOR;
  const item = intent?.itemId;
  const plan = e.trace.start("plan", `${step.tool}${item ? ` ${item}` : ""}`, { actorId: actor, ...(e.patientId() ? { refs: { entities: [e.patientId()!] } } : {}), data: { tool: step.tool, args: step.args, ...(intent ? { intent } : {}) } });
  let run: StepRun = { status: "error", ok: false };
  let verified = false;
  const clockBefore = host.state().clock;
  try {
    run = await e.trace.within(plan.id, async () => {
      let outcome: StepRun;
      if (intent) {
        const world = e.world();
        world.observe(actor);
        const patient = e.patientId();
        // Walk (and fetch) until the requirement holds.
        const satisfy = async () => {
          let check = world.checkSpatial(actor, intent);
          for (let i = 0; i < MAX_APPROACHES && !check.ok && check.hint && !signal?.aborted; i++) {
            const goal: NavGoal = check.hint.goal;
            const then = check.hint.then;
            if (then?.operation === "transport_patient") {
              // the patient to the device the study is done at (or back to their bed space, where fixed kit stands)
              if (!(await transportPatient(host, e, then, turnId, signal))) break;
            } else if (check.reason === "provider-not-at-bedside" && goal.kind === "interact" && patient) {
              if ((await e.act({ operation: "navigate", goal }, turnId, signal)).status !== "completed") break;
              if ((await e.act({ operation: "move_to", targetId: goal.id, goal: { kind: "interact", id: patient } }, turnId, signal)).status !== "completed") break;
            } else if (then) {
              // walk there, then do what the hint names — a checklist step's prerequisite (the count board's counts,
              // the RF wand's scan first), following each refusal's own hint a few levels deep
              if ((await e.act({ operation: "navigate", goal }, turnId, signal)).status !== "completed") break;
              if (!(await achieve(e, thenRequest(then), turnId, signal))) break;
            } else if ((await e.act({ operation: "navigate", goal }, turnId, signal)).status !== "completed") break;
            check = world.checkSpatial(actor, intent);
          }
          return check;
        };
        let check = await satisfy();
        const cannot = (message: string): StepRun => {
          host.narrate(turnId, rt(host.locale, "clinician.narrate.cannot", { message }));
          return { status: "error", ok: false };
        };
        if (signal?.aborted) return { status: "interrupted", ok: false };
        if (!check.ok) return cannot(check.message);
        const route = deviceRoute(host, e, step, check.satisfiedBy);
        const viaDevice = route ? await runDevice(e, route, turnId, signal) : null;
        if (!viaDevice && route) {
          // The device detour may have moved the body: back to where the act can be done.
          check = await satisfy();
          if (signal?.aborted) return { status: "interrupted", ok: false };
          if (!check.ok) return cannot(check.message);
        }
        if (viaDevice) outcome = viaDevice;
        else {
          const o = await host.executeTool(turnId, step.tool, step.args, signal);
          outcome = { status: o.status, ok: o.status === "ok" && o.output.ok };
        }
      } else {
        const o = await host.executeTool(turnId, step.tool, step.args, signal);
        outcome = { status: o.status, ok: o.status === "ok" && o.output.ok };
      }
      verified = stepVerified(step, host.state(), clockBefore);
      e.trace.start("verification", step.action.type, { actorId: actor }).end({ ok: verified, worldVersion: e.world().version, data: { postcondition: step.action } });
      return outcome;
    });
  } finally {
    plan.end({ ok: verified, worldVersion: e.world().version, data: { status: run.status } });
  }
  return run;
}

/**
 * One embodied offline clinician turn: up to `maxSteps` reference steps (see
 * `offlineClinicianTurn` for the walkthrough rules; only the execution of a
 * tool step differs).
 */
export async function embodiedOfflineTurn(host: AutopilotHost, e: EmbodiedAutopilotHost, turnId: string, maxSteps: number, signal?: AbortSignal): Promise<AgentOutcome> {
  const steps = clinicianOfflineSteps(host.caseDef, host.locale);
  let executed = 0;
  let last = "";
  const regrasped = new Set<number>();
  host.ensureStarted();
  while (executed < Math.max(1, maxSteps)) {
    if (signal?.aborted) return { status: "interrupted", text: last, grounded: [], toolCalls: executed };
    if (host.state().finished) return { status: "end_turn", text: last, grounded: [], done: true, toolCalls: executed };
    if (host.cursor.value >= steps.length) {
      last = walkthroughEndText(host.caseDef, host.state(), host.cursor.missed, host.locale);
      host.narrate(turnId, last);
      return { status: "end_turn", text: last, grounded: [], done: true, toolCalls: executed };
    }
    const step = steps[host.cursor.value]!;
    if (stepAlreadySatisfied(step, host.state(), host.cursor.extraOps)) {
      host.cursor.value++;
      continue;
    }
    if (step.kind === "action") {
      host.cursor.value++;
      host.dispatch({ ...step.action, by: "agent" } as ClinicalAction);
      await host.afterStep?.(signal);
      continue;
    }
    const pending =
      step.action.type === "advance-time" && step.refClockAfter !== undefined
        ? step.refClockAfter - host.state().clock
        : step.action.type === "advance-time"
          ? step.action.minutes
          : minutesUntilReadable(host.caseDef, host.state(), step.action);
    let run: OfflineClinicianStep = step;
    if (pending > 0 && (step.action.type !== "advance-time" || pending !== step.action.minutes)) {
      const minutes = Math.min(MAX_WAIT_MINUTES, Math.max(0.01, Math.round(pending * 100) / 100));
      run = stepForAction(host.caseDef, { type: "advance-time", minutes }, host.locale);
    }
    if (run.kind !== "tool") {
      host.cursor.value++;
      continue;
    }
    // a traction the reference set up and never let go has gone (a colleague left the table): re-grasp first, once
    const regrasp = run === step && !regrasped.has(host.cursor.value) ? lostTraction(host.state(), steps, host.cursor.value) : null;
    if (regrasp) {
      regrasped.add(host.cursor.value);
      const again = stepForAction(host.caseDef, regrasp.action, host.locale);
      if (again.kind === "tool") {
        last = rt(host.locale, "clinician.narrate.regrasp", { structure: regrasp.structure });
        host.narrate(turnId, last);
        const stepsBefore = host.state().procedure?.counters.steps ?? 0;
        const o = await runEmbodiedStep(host, e, again, turnId, signal);
        executed++;
        if ((host.state().procedure?.counters.steps ?? 0) > stepsBefore) host.cursor.extraOps = (host.cursor.extraOps ?? 0) + 1;
        if (o.status === "interrupted" || signal?.aborted) return { status: "interrupted", text: last, grounded: [], toolCalls: executed };
        if (o.status === "cancelled") return { status: "denied", text: last, grounded: [], toolCalls: executed };
        continue;
      }
    }
    const clockBefore = host.state().clock;
    if (run === step) {
      await countBeforeClosure(host, e, run, turnId, signal);
      await host.afterStep?.(signal);
    }
    last = run.narration;
    host.narrate(turnId, run.narration);
    const outcome = await runEmbodiedStep(host, e, run, turnId, signal);
    executed++;
    if (outcome.status === "interrupted" || signal?.aborted) return { status: "interrupted", text: last, grounded: [], toolCalls: executed };
    if (outcome.status === "cancelled") return { status: "denied", text: last, grounded: [], toolCalls: executed };
    if (run === step && !outcome.ok) host.cursor.missed.push(step);
    if (run === step || host.state().clock === clockBefore) host.cursor.value++;
    // a study done at a device: the patient goes back to their bed space (unless the next step needs a device too)
    await returnPatient(host, e, steps, turnId, signal);
    // the care team's turn (its assigned scenario runs alongside: a hold, a search, a request)
    await host.afterStep?.(signal);
  }
  return { status: "end_turn", text: last, grounded: [], done: host.state().finished, toolCalls: executed };
}
