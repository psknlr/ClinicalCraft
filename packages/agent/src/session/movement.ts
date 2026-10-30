/**
 * Requests in the learner's words, carried out by the world (docs/EMBODIED.md §8.4) — embodied mode only. The
 * words are recognised deterministically (`movement-intents.ts`, `staff-intents.ts`); what happens is a world
 * action on the learner's tool path (validation, PreToolUse hooks, the approval gate, the world's own rules), and
 * what the learner reads is what the world did — never a model's claim:
 *
 * | request (to the patient or the companion) | world action (by the learner's body) |
 * |-------------------------------------------|---------------------------------------|
 * | "follow me"                               | `escort_patient`: the patient walks with you |
 * | "wait here"                               | `release_patient`: they stay where they are |
 * | "come with me to CT" / "back to bed"      | `transport_patient {capability \| destination \| home}` — a step to the patient's side first when only the distance refuses it; a place no patient is taken to (a corridor, the pharmacy): `escort_patient`, then `navigate_to` it |
 * | "lie down" / "sit up" / "stand up"        | the case's positioning treatment for that posture when it has one (`intervene`: a clinical, scored act through the approval gate); a posture an applied positioning imposes is kept; else `reposition_patient {posture}` |
 *
 * The patient's side is narrated (a narrator's line in the patient's conversation, nothing credited). Requests to a
 * colleague — a task, come here, go back, show me the way, where is … — are `staff-requests.ts`.
 */
import { capabilityLabels, t } from "@clinicalcraft/core";
import { PATIENT_AT_PROVIDER_CAPABILITIES, PATIENT_PERFORMED_CAPABILITIES, PRIMARY_ACTOR, type NavGoal, type WorldActionResult } from "@clinicalcraft/world";
import { agentKind } from "../agents/prompts.js";
import type { ToolOutput } from "../tools/types.js";
import { rt } from "./i18n.js";
import type { SessionKernel } from "./kernel.js";
import { destinationCapability, meansHome, movementIntent, type MovementIntent } from "./movement-intents.js";
import { StaffRequests } from "./staff-requests.js";
import { staffIntent } from "./staff-intents.js";
import type { StaffVoice } from "./staff-voice.js";

/** Runs a learner tool (the learner's tool path: hooks, approval gate, the tool). */
export type LearnerToolRunner = (id: string, name: string, args: Record<string, unknown>, signal?: AbortSignal) => Promise<{ output: ToolOutput; status: string }>;

/** Where a destination phrase leads: a transport destination, a place to walk to with the patient, or nowhere known. */
export type Where = { kind: "transport"; params: Record<string, unknown>; label: string } | { kind: "walk"; target: string; label: string } | { kind: "unknown"; label: string };

/** Agents with colleagues' bodies in the world behind them (`@nurse`: the nearest nurse acts). */
const STAFF_KINDS: ReadonlySet<string> = new Set(["nurse", "attending", "radiologist", "pathologist"]);

const resultOf = (out: ToolOutput): WorldActionResult | null => ((out.data as { result?: WorldActionResult } | undefined)?.result ?? null);

/** The movement requests of one session (see the module docs). */
export class MovementRequests {
  /** A colleague's requests (every role). */
  private readonly staff: StaffRequests;

  constructor(
    private readonly k: SessionKernel,
    private readonly runTool: LearnerToolRunner,
  ) {
    this.staff = new StaffRequests(k, runTool, (phrase) => this.whereTo(phrase));
  }

  /**
   * Handle `body` said to `target` when it is a movement request (embodied mode). True: handled — the agent does
   * not answer it as talk; false: it is talk (or this is clinical mode).
   */
  async request(id: string, target: string, body: string, voice: StaffVoice | null, signal: AbortSignal): Promise<boolean> {
    const k = this.k;
    if (!k.embodied) return false;
    const profile = k.profiles.get(target);
    const kind = profile ? agentKind(profile) : null;
    const c = k.caseDef;
    const names = [t(c.patient.displayName, "en"), t(c.patient.displayName, "zh-CN")];
    if (kind === "patient" || kind === "companion") {
      const intent = movementIntent(body, "patient", names);
      if (!intent || intent.kind === "take") return false;
      k.ensureStarted(id);
      k.conversations.addDialogue({ who: "learner", speaker: "learner", text: body });
      await this.patientRequest(id, kind, intent, signal);
      return true;
    }
    // a colleague: by name (any role), or one of the roles with a body in the world addressed as such (never the
    // examiner, the clinician…); anything that is no request — or names nothing the world or the case knows — is talk
    if (!voice && !STAFF_KINDS.has(kind ?? "")) return false;
    const intent = staffIntent(body, names);
    return intent ? this.staff.request(id, target, voice, intent, body, signal) : false;
  }

  /* ---------------------------------------------------------------- */
  /* Said to the patient (or the companion at their side)              */
  /* ---------------------------------------------------------------- */

  private async patientRequest(id: string, agent: "patient" | "companion", intent: MovementIntent, signal: AbortSignal): Promise<void> {
    const name = this.patientName();
    switch (intent.kind) {
      case "wait":
        return this.narrateResult(id, agent, await this.operate(id, "release_patient", signal));
      case "home":
        return this.narrateResult(id, agent, await this.transport(id, { destination: "home" }, signal));
      case "take":
        return; // a colleague's request (said to the patient: talk was never routed here)
      case "posture":
        return this.posture(id, agent, intent.posture, signal);
      case "follow": {
        if (!intent.destination) return this.narrateResult(id, agent, await this.operate(id, "escort_patient", signal));
        const where = this.whereTo(intent.destination);
        if (where.kind === "transport") return this.narrateResult(id, agent, await this.transport(id, where.params, signal));
        // a place no patient is taken to, or none known: they walk with you — to it, when it is known
        const escort = await this.escort(id, signal);
        if (!escort.ok) return this.narrateResult(id, agent, escort);
        if (where.kind === "unknown") return this.narrate(id, agent, rt(this.k.locale, "move.unknownPlace", { place: where.label, patient: name }));
        const walk = await this.runTool(id, "navigate_to", { target: where.target }, signal);
        return walk.output.ok ? this.narrate(id, agent, rt(this.k.locale, "move.walkedWith", { patient: name, place: where.label })) : this.narrateResult(id, agent, walk.output);
      }
    }
  }

  /** `escort_patient`, already walking with you counting as done. */
  private async escort(id: string, signal: AbortSignal): Promise<ToolOutput> {
    const place = this.k.embodied!.world().patientPlace();
    if (place?.escort === PRIMARY_ACTOR) return { ok: true, output: "" };
    return this.operate(id, "escort_patient", signal);
  }

  /** An operation on the patient by the learner's body (`interact_object`). */
  private async operate(id: string, operation: string, signal: AbortSignal): Promise<ToolOutput> {
    return (await this.runTool(id, "interact_object", { target: "patient", operation }, signal)).output;
  }

  /** `transport_patient` by the learner's body (a short step to the patient's side first when needed: `stepped`). */
  private transport(id: string, params: Record<string, unknown>, signal: AbortSignal): Promise<ToolOutput> {
    return this.stepped(id, "transport_patient", params, signal);
  }

  /**
   * A learner tool refused only for the distance — the learner stands within earshot, not yet at the patient's side,
   * or the patient lay down on a couch a step away: a short walk there (the world's or the spatial gate's hint),
   * then once more. Any other refusal stands.
   */
  private async stepped(id: string, tool: string, args: Record<string, unknown>, signal: AbortSignal): Promise<ToolOutput> {
    const first = (await this.runTool(id, tool, args, signal)).output;
    if (first.ok) return first;
    const r = resultOf(first);
    const data = first.data as { code?: string; reason?: string; hint?: { goal?: NavGoal } } | undefined;
    const range = r ? r.errorCode === "NOT_IN_RANGE" || r.errorCode === "NOT_VISIBLE" : data?.code === "SPATIAL_REQUIREMENT_UNMET" && /^not-(?:at|near)-patient$/.test(data.reason ?? "");
    const goal: NavGoal | undefined = r?.hint?.goal ?? data?.hint?.goal;
    if (!range || !goal) return first;
    const step = await this.runTool(id, "navigate_to", { goal }, signal);
    if (!step.output.ok) return first;
    return (await this.runTool(id, tool, args, signal)).output;
  }

  /**
   * "Lie down" / "sit up" / "stand up": the case's positioning treatment for that posture when it has one (a clinical,
   * scored act — through the approval gate); a posture an applied positioning treatment imposes is kept (the
   * narrator says so); otherwise the patient takes it if they can (`reposition_patient`).
   */
  private async posture(id: string, agent: "patient" | "companion", posture: "lying" | "sitting" | "standing", signal: AbortSignal): Promise<void> {
    const k = this.k;
    const L = k.locale;
    const c = k.caseDef;
    const given = new Set(k.state.interventions.map((r) => r.interventionId));
    const positioning = c.interventions.filter((i) => i.kind === "positioning" && i.posture === posture && !given.has(i.id));
    if (positioning.length === 1) {
      const item = positioning[0]!;
      const out = await this.stepped(id, "intervene", { intervention_id: item.id }, signal);
      if (out.ok) return this.narrate(id, agent, rt(L, "move.positioned", { patient: this.patientName(), item: t(item.name, L) }));
      return this.narrateResult(id, agent, out);
    }
    // the posture a positioning treatment imposes (the latest given) stays unless another treatment changes it
    const imposed = [...k.state.interventions].reverse().map((r) => c.interventions.find((i) => i.id === r.interventionId)).find((i) => i?.kind === "positioning" && i.posture);
    if (imposed && imposed.posture !== posture) return this.narrate(id, agent, rt(L, "move.keepPosture", { patient: this.patientName(), item: t(imposed.name, L) }));
    const out = await this.stepped(id, "interact_object", { target: "patient", operation: "reposition_patient", parameters: { posture } }, signal);
    return this.narrateResult(id, agent, out);
  }

  /** The world's words for what happened (learner-facing: the result's message, never the model-facing tool lines). */
  private narrateResult(id: string, agent: "patient" | "companion", out: ToolOutput): void {
    const r = resultOf(out);
    const data = out.data as { message?: unknown } | undefined;
    const text = r?.message ?? (typeof data?.message === "string" ? data.message : out.output.split("\n")[0] ?? "");
    if (text.trim()) this.narrate(id, agent, text);
  }

  /** A narrator's line in the patient's conversation (nobody's words; nothing credited). */
  private narrate(id: string, agent: "patient" | "companion", text: string): void {
    const k = this.k;
    const speaker = rt(k.locale, "speaker.narrator");
    k.speakLine(id, { agent, speaker, text, grounded: [], grounding: "narrated", nonverbal: null });
    k.conversations.addDialogue({ who: agent, speaker, text });
  }

  /* ---------------------------------------------------------------- */
  /* Where a destination phrase leads                                  */
  /* ---------------------------------------------------------------- */

  /**
   * Where the words lead in this world: back to bed (`home`); a study's capability ("the CT scanner" → the nearest
   * device providing `ct`); a place by name (`find`, either language) — a bed space's room or a device a patient is
   * brought to is a transport, any other room or thing a place to walk to; else unknown.
   */
  whereTo(phrase: string): Where {
    const k = this.k;
    const L = k.locale;
    if (meansHome(phrase)) return { kind: "transport", params: { destination: "home" }, label: phrase };
    const capability = destinationCapability(phrase);
    if (capability) return { kind: "transport", params: { capability }, label: capabilityLabels([capability], L)[0] ?? phrase };
    const world = k.embodied!.world();
    const hit = world.find(PRIMARY_ACTOR, { name: phrase, limit: 1 })[0];
    if (!hit || (hit.kind !== "room" && hit.kind !== "equipment")) return { kind: "unknown", label: phrase };
    const label = hit.name;
    if (hit.kind === "room") {
      const room = hit.id.replace(/^room:/, "");
      return k.facility?.patientSlots.some((s) => s.room === room) ? { kind: "transport", params: { destination: hit.id }, label } : { kind: "walk", target: hit.id, label };
    }
    // a device a patient is brought to: a study done on them there, or a test they perform at the station
    const caps = world.entity(hit.id)?.capabilities ?? [];
    const study = caps.some((cap) => PATIENT_AT_PROVIDER_CAPABILITIES.includes(cap) || PATIENT_PERFORMED_CAPABILITIES.includes(cap));
    return study ? { kind: "transport", params: { destination: hit.id }, label } : { kind: "walk", target: hit.id, label };
  }

  private patientName(): string {
    return t(this.k.caseDef.patient.displayName, this.k.locale);
  }
}
