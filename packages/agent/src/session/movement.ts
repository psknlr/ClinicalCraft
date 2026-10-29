/**
 * Movement requests in the learner's words, carried out by the world (docs/EMBODIED.md §8.4) — embodied mode only.
 * The words are recognised deterministically (`movement-intents.ts`); what happens is a world action on the
 * learner's tool path (validation, PreToolUse hooks, the approval gate, the world's own rules), and what the
 * learner reads is what the world did — never a model's claim:
 *
 * | request                                 | world action (by)                                                   |
 * |-----------------------------------------|---------------------------------------------------------------------|
 * | "follow me" (to the patient)            | `escort_patient` (the learner's body): the patient walks with you    |
 * | "wait here"                             | `release_patient`: they stay where they are                          |
 * | "come with me to CT" / "back to bed"    | `transport_patient {capability \| destination \| home}` — a short step to the patient's side first when needed; a place no patient is taken to (a corridor, the pharmacy): `escort_patient`, then `navigate_to` it |
 * | "please take the patient to CT" (to a colleague) | `delegate_task transport_patient` by the colleague addressed (`user_message.staff`), else the role |
 *
 * The patient's side of it is narrated (a narrator's line in the patient's conversation, nothing credited); a
 * colleague acknowledges in their own voice, and the delegation's outcome is reported as `/delegate`'s is.
 */
import { capabilityLabels, t } from "@clinicalcraft/core";
import { PATIENT_AT_PROVIDER_CAPABILITIES, PATIENT_PERFORMED_CAPABILITIES, PRIMARY_ACTOR, type NavGoal, type WorldActionResult } from "@clinicalcraft/world";
import { agentKind, npcDisplayName } from "../agents/prompts.js";
import type { ToolOutput } from "../tools/types.js";
import { rt } from "./i18n.js";
import type { SessionKernel } from "./kernel.js";
import { destinationCapability, meansHome, movementIntent, type MovementIntent } from "./movement-intents.js";
import { conversationKey, type StaffVoice } from "./staff-voice.js";

/** Runs a learner tool (the learner's tool path: hooks, approval gate, the tool). */
export type LearnerToolRunner = (id: string, name: string, args: Record<string, unknown>, signal?: AbortSignal) => Promise<{ output: ToolOutput; status: string }>;

/** Where a destination phrase leads: a transport destination, a place to walk to with the patient, or nowhere known. */
type Where = { kind: "transport"; params: Record<string, unknown>; label: string } | { kind: "walk"; target: string; label: string } | { kind: "unknown"; label: string };

/** Staff roles who take a patient somewhere when asked (their delegation scope has `transport_patient`). */
const TAKERS: ReadonlySet<string> = new Set(["nurse", "paramedic", "porter", "attending"]);

const resultOf = (out: ToolOutput): WorldActionResult | null => ((out.data as { result?: WorldActionResult } | undefined)?.result ?? null);

/** The movement requests of one session (see the module docs). */
export class MovementRequests {
  constructor(
    private readonly k: SessionKernel,
    private readonly runTool: LearnerToolRunner,
  ) {}

  /**
   * Handle `body` said to `target` when it is a movement request (embodied mode). True: handled — the agent does
   * not answer it as talk; false: it is talk (or this is clinical mode).
   */
  async request(id: string, target: string, body: string, voice: StaffVoice | null, signal: AbortSignal): Promise<boolean> {
    const k = this.k;
    if (!k.embodied) return false;
    const profile = k.profiles.get(target);
    const kind = profile ? agentKind(profile) : null;
    const toPatient = kind === "patient" || kind === "companion";
    // a colleague who takes patients places — by name, or the nurse / the attending by role (never the examiner, a
    // consultant on the phone…); anyone else hears talk
    const toStaff = !toPatient && (voice ? TAKERS.has(voice.role) : kind === "nurse" || kind === "attending");
    if (!toPatient && !toStaff) return false;
    const c = k.caseDef;
    const names = [t(c.patient.displayName, "en"), t(c.patient.displayName, "zh-CN")];
    const intent = movementIntent(body, toPatient ? "patient" : "staff", names);
    if (!intent) return false;
    k.ensureStarted(id);
    k.conversations.addDialogue({ who: "learner", speaker: "learner", text: toPatient ? body : `@${voice?.name ?? target} ${body}` });
    if (toPatient) await this.patientRequest(id, kind === "companion" ? "companion" : "patient", intent, signal);
    else await this.staffRequest(id, target, voice, intent, body, signal);
    return true;
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

  /**
   * `transport_patient` by the learner's body; refused only for the distance (the learner stands within earshot,
   * not yet at the patient's side): a short step there (the world's hint), then once more.
   */
  private async transport(id: string, params: Record<string, unknown>, signal: AbortSignal): Promise<ToolOutput> {
    const first = (await this.runTool(id, "transport_patient", params, signal)).output;
    const r = resultOf(first);
    const goal: NavGoal | undefined = r?.hint?.goal;
    if (first.ok || !r || !goal || (r.errorCode !== "NOT_IN_RANGE" && r.errorCode !== "NOT_VISIBLE")) return first;
    const step = await this.runTool(id, "navigate_to", { goal }, signal);
    if (!step.output.ok) return first;
    return (await this.runTool(id, "transport_patient", params, signal)).output;
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
  /* Said to a colleague                                               */
  /* ---------------------------------------------------------------- */

  private async staffRequest(id: string, agent: string, voice: StaffVoice | null, intent: MovementIntent, body: string, signal: AbortSignal): Promise<void> {
    if (intent.kind !== "take") return;
    const k = this.k;
    const L = k.locale;
    const patient = this.patientName();
    const say = (text: string) => this.staffLine(id, agent, voice, body, text);
    if (!intent.destination) return say(rt(L, "move.staffWhere", { patient }));
    const where = intent.destination === "home" ? ({ kind: "transport", params: { destination: "home" }, label: "" } as const) : this.whereTo(intent.destination);
    if (where.kind !== "transport") return say(rt(L, "move.staffCannot", { place: where.label }));
    say(where.params.destination === "home" ? rt(L, "move.staffHome", { patient }) : rt(L, "move.staffAck", { patient, place: where.label }));
    const role = voice ? `staff:${voice.staffId}` : agent;
    const { capability, destination } = where.params as { capability?: string; destination?: string };
    const args = { role, task: "transport_patient", ...(destination ? { target: destination } : {}), ...(capability ? { params: { capability } } : {}) };
    const out = (await this.runTool(id, "delegate_task", args, signal)).output;
    // reported as `/delegate` reports it (the conversation's outcome line, the HUD's toast)
    k.emit(id, { type: "command_output", name: "delegate", text: out.output, data: { ok: out.ok, data: out.data ?? null } });
  }

  /**
   * A colleague's answer to the learner's request in their own voice (the one addressed: their name, and their staff
   * id for the world's figure) — kept in their conversation, so they remember what they were asked and said.
   */
  private staffLine(id: string, agent: string, voice: StaffVoice | null, request: string, text: string): void {
    const k = this.k;
    const speaker = voice?.name ?? npcDisplayName(k.caseDef, k.facility, agent, k.locale);
    k.speakLine(id, { agent, speaker, text, grounded: [], ...(voice ? { staffId: voice.staffId } : {}) });
    k.conversations.append(conversationKey(agent, voice), [
      { role: "user", content: [{ type: "text", text: request }] },
      { role: "assistant", content: [{ type: "text", text }] },
    ]);
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
  private whereTo(phrase: string): Where {
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
