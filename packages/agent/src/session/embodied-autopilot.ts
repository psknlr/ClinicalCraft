/**
 * The embodied offline autopilot — the reference agent of embodied mode
 * (docs/EMBODIED.md §6, §10). It replays the case's reference solution like
 * the clinical-mode offline clinician (`offlineClinicianTurn`: same steps,
 * same skipping of satisfied steps, same waits), but every clinical step is
 * carried out by the body:
 *
 *   intent → requirement (`checkSpatial`) → if unmet: walk to `hint.goal`
 *   (wheel a portable provider to the bedside when the policy says the
 *   capability must stand there) → the clinical act — through a device
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
 * never done through the non-spatial path.
 */
import type { ClinicalAction, SessionState } from "@clinicalcraft/core";
import { PRIMARY_ACTOR, type NavGoal, type WorldActionResult, type WorldRuntime } from "@clinicalcraft/world";
import { clinicianOfflineSteps, minutesUntilReadable, stepAlreadySatisfied, stepForAction, type OfflineClinicianStep } from "../agents/offline.js";
import type { ToolCallStatus } from "../loop.js";
import { actionIntent } from "../tools/spatial.js";
import type { WorldRequestInput } from "../tools/world.js";
import { walkthroughEndText, type AgentOutcome, type AutopilotHost } from "./autopilot.js";
import { clinicalOperation, operationPath, releaseOperation, type DeviceRoute } from "./device-ops.js";
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

/** Operate a device up to its clinical operation (following a reach hint once per operation), then release it. */
async function runDevice(e: EmbodiedAutopilotHost, route: DeviceRoute, turnId: string, signal?: AbortSignal): Promise<StepRun | null> {
  const world = e.world();
  const operate = async (op: string, parameters?: Record<string, unknown>): Promise<WorldActionResult> => {
    const request: WorldRequestInput = { operation: op, targetId: route.entityId, ...(parameters ? { parameters } : {}) };
    let r = await e.act(request, turnId, signal);
    if (r.status === "failed" && r.hint && (r.errorCode === "NOT_IN_RANGE" || r.errorCode === "NOT_VISIBLE")) {
      const nav = await e.act({ operation: "navigate", goal: r.hint.goal }, turnId, signal);
      if (nav.status === "completed") r = await e.act(request, turnId, signal);
    }
    return r;
  };
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
            if (check.reason === "provider-not-at-bedside" && goal.kind === "interact" && patient) {
              if ((await e.act({ operation: "navigate", goal }, turnId, signal)).status !== "completed") break;
              if ((await e.act({ operation: "move_to", targetId: goal.id, goal: { kind: "interact", id: patient } }, turnId, signal)).status !== "completed") break;
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
    if (stepAlreadySatisfied(step, host.state())) {
      host.cursor.value++;
      continue;
    }
    if (step.kind === "action") {
      host.cursor.value++;
      host.dispatch({ ...step.action, by: "agent" } as ClinicalAction);
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
    const clockBefore = host.state().clock;
    last = run.narration;
    host.narrate(turnId, run.narration);
    const outcome = await runEmbodiedStep(host, e, run, turnId, signal);
    executed++;
    if (outcome.status === "interrupted" || signal?.aborted) return { status: "interrupted", text: last, grounded: [], toolCalls: executed };
    if (outcome.status === "cancelled") return { status: "denied", text: last, grounded: [], toolCalls: executed };
    if (run === step && !outcome.ok) host.cursor.missed.push(step);
    if (run === step || host.state().clock === clockBefore) host.cursor.value++;
  }
  return { status: "end_turn", text: last, grounded: [], done: host.state().finished, toolCalls: executed };
}
