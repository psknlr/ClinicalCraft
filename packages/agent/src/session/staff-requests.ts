/**
 * What a colleague does when the learner asks (docs/EMBODIED.md §8.4) — every staff role, with their own body and
 * within their own role. The request is recognised in words (`staff-intents.ts`); the colleague who acts is the one
 * addressed by name (`user_message.staff`), else the one of the addressed role the world would send (nearest the
 * patient); what happens is world actions on the learner's tool path, and what the learner hears is that person:
 *
 * | request                            | what happens |
 * |------------------------------------|--------------|
 * | a task (monitor, ECG, IV access, fetch, give, take the patient) | the role's scope of practice first (`checkTaskScope`): outside it, a refusal in their own voice that says what they can do and who can; else an acknowledgement, `delegate_task` with their own body (hooks, approvals — a high-risk drug still asks the learner), and the outcome in their own voice (plus the `/delegate` report) |
 * | pass me … (a handheld item)        | they pick it up where it lies (unless it is already in their hands), come to the learner and `hand_over` it — the learner's hands full, or the item in someone else's hands, said in their voice; a fetch naming a handheld item is passed the same way |
 * | come here / to the bedside         | they walk to the learner (a `follow` goal) or to the patient |
 * | go back                            | they walk back to their post |
 * | show me the way to …               | they say where it is and walk there (the learner follows) |
 * | where is …?                        | an answer from the hospital's public directory as they know it (a room, its distance) — never a case fact |
 *
 * A thing, a treatment or a place the world (or the case) does not know leaves the words as talk for the colleague's
 * own agent to answer.
 */
import { t } from "@clinicalcraft/core";
import { MAX_HELD, PRIMARY_ACTOR, roleName, type ActorId, type ActorState, type NavGoal, type ObservedEntity, type WorldActionResult } from "@clinicalcraft/world";
import { npcDisplayName } from "../agents/prompts.js";
import { resolveIntervention } from "../tools/clinical.js";
import type { WorldRequestInput } from "../tools/world.js";
import { checkTaskScope, scopeOf } from "../tools/scope.js";
import { rt, type RuntimeKey } from "./i18n.js";
import { pickStaff, type DelegationResult } from "./delegation.js";
import type { SessionKernel } from "./kernel.js";
import type { LearnerToolRunner, Where } from "./movement.js";
import { destinationCapability, meansHome } from "./movement-intents.js";
import { conversationKey, type StaffVoice } from "./staff-voice.js";
import type { StaffIntent } from "./staff-intents.js";

/** Facility staff roles an agent stands for when addressed by role (`@nurse`): the nearest of these acts. */
const AGENT_ROLES: Readonly<Record<string, readonly string[]>> = {
  nurse: ["nurse", "paramedic"],
  attending: ["attending"],
  radiologist: ["radiologist"],
  pathologist: ["pathologist", "lab-tech"],
};

/** Kit a fetch request may name by what it does (either language), when no equipment is called that. */
const KIT_WORDS: readonly (readonly [string, RegExp])[] = [
  ["defibrillator", /defib|除颤/iu],
  ["ecg-12lead", /\becg\b|\bekg\b|electrocardio|心电图/iu],
  ["cardiac-monitor", /monitor|监护/iu],
  ["ultrasound", /ultrasound|\becho\b|scanner|超声|B超/iu],
  ["oxygen", /oxygen|\bo2\b|氧/iu],
  ["suction", /suction|吸引/iu],
  ["airway", /airway|intubat|气道|插管/iu],
];

/** The colleague who acts: their body, role and name. */
export interface Colleague {
  actor: ActorState;
  staffId: string;
  name: string;
}

/** The colleague addressed: by name, else the nearest of the agent's roles to the patient (none, or clinical mode: null). */
export function colleagueOf(k: SessionKernel, agent: string, voice: StaffVoice | null): Colleague | null {
  const e = k.embodied;
  if (!e) return null;
  const world = e.world();
  let actorId: ActorId | null = voice ? `staff:${voice.staffId}` : null;
  if (!actorId) for (const role of AGENT_ROLES[agent] ?? []) if ((actorId = pickStaff(world, role, e.patientId()))) break;
  const actor = actorId ? world.actor(actorId) : null;
  if (!actor) return null;
  const ent = world.entity(actor.id);
  return { actor, staffId: actor.id.slice("staff:".length), name: voice?.name ?? (ent ? t(ent.name, k.locale) : npcDisplayName(k.caseDef, k.facility, agent, k.locale)) };
}

/** A line in the colleague's voice (the first one also records the learner's request). */
type Say = (text: string) => void;

/** Colleagues' requests of one session (see the module docs). */
export class StaffRequests {
  constructor(
    private readonly k: SessionKernel,
    private readonly runTool: LearnerToolRunner,
    /** Where a destination phrase leads (`MovementRequests.whereTo`, shared with the patient's requests). */
    private readonly whereTo: (phrase: string) => Where,
  ) {}

  /** Carry out `intent` said to `agent` (`voice`: the colleague by name). True: handled; false: talk for the agent. */
  async request(id: string, agent: string, voice: StaffVoice | null, intent: StaffIntent, body: string, signal: AbortSignal): Promise<boolean> {
    const who = this.colleague(agent, voice);
    if (!who) return false;
    const say = this.voiceOf(id, agent, voice, who, body);
    const L = this.k.locale;
    switch (intent.kind) {
      case "task":
        return this.task(id, say, who, intent.task, {}, null, signal);
      case "take": {
        const patient = this.patientName();
        if (!intent.destination) {
          say(rt(L, "move.staffWhere", { patient }));
          return true;
        }
        const where = intent.destination === "home" || meansHome(intent.destination) ? ({ kind: "transport", params: { destination: "home" }, label: "" } as const) : this.whereTo(intent.destination);
        if (where.kind !== "transport") {
          say(rt(L, "move.staffCannot", { place: where.label }));
          return true;
        }
        const { capability, destination } = where.params as { capability?: string; destination?: string };
        const ack = destination === "home" ? rt(L, "move.staffHome", { patient }) : rt(L, "move.staffAck", { patient, place: where.label });
        return this.task(id, say, who, "transport_patient", { ...(destination ? { target: destination } : {}), ...(capability ? { params: { capability } } : {}) }, ack, signal);
      }
      case "hand": {
        const item = this.handheld(who, intent.what);
        if (!item) return false;
        await this.hand(id, say, who, item, signal);
        return true;
      }
      case "fetch": {
        const item = this.handheld(who, intent.what);
        if (item) {
          await this.hand(id, say, who, item, signal);
          return true;
        }
        const thing = this.equipment(who, intent.what);
        if (!thing) {
          say(rt(L, "req.unknownThing", { thing: intent.what }));
          return true;
        }
        return this.task(id, say, who, "fetch_equipment", thing.args, rt(L, "req.ackFetch", { thing: thing.label }), signal);
      }
      case "give": {
        const r = resolveIntervention(this.k.caseDef, { query: intent.what }, L);
        if (r.kind !== "id") return false;
        const item = this.k.caseDef.interventions.find((i) => i.id === r.id)!;
        return this.task(id, say, who, "give_intervention", { params: { intervention: r.id } }, rt(L, "req.ackGive", { item: t(item.name, L) }), signal, r.id);
      }
      case "come": {
        const patient = this.k.embodied!.patientId();
        const goal: NavGoal = intent.to === "patient" && patient ? { kind: "interact", id: patient } : { kind: "follow", id: PRIMARY_ACTOR, range: 1.5 };
        say(rt(L, intent.to === "patient" ? "req.comingBed" : "req.coming"));
        await this.walk(id, say, who, goal, signal);
        return true;
      }
      case "back": {
        const post = this.k.embodied!.world().entity(who.actor.id);
        if (!post) return false;
        say(rt(L, "req.back", { post: this.k.embodied!.world().regionName({ level: post.level, x: post.position.x, z: post.position.z }) }));
        await this.walk(id, say, who, { kind: "point", x: post.position.x, z: post.position.z, level: post.level }, signal);
        return true;
      }
      case "guide": {
        const place = this.find(who, intent.place);
        if (!place) return false;
        say(rt(L, "req.guide", { place: place.name, room: this.roomOf(place) }));
        const goal: NavGoal = place.kind === "room" ? { kind: "room", id: place.id.replace(/^room:/, "") } : { kind: "interact", id: place.id };
        await this.walk(id, say, who, goal, signal);
        return true;
      }
      case "where": {
        const answer = this.where(who, intent.place);
        if (!answer) return false;
        say(answer);
        return true;
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* Tasks                                                             */
  /* ---------------------------------------------------------------- */

  /**
   * A delegation task by this colleague: their scope first (a refusal in their voice), then the acknowledgement,
   * the task with their own body, the `/delegate` report and the outcome in their voice.
   */
  private async task(id: string, say: Say, who: Colleague, task: string, args: Record<string, unknown>, ack: string | null, signal: AbortSignal, interventionId: string | null = null): Promise<boolean> {
    const k = this.k;
    const L = k.locale;
    const label = rt(L, `delegate.task.${task}` as RuntimeKey);
    const scoped = checkTaskScope({ role: who.actor.role, name: who.name }, task, k.caseDef, L, interventionId);
    if (!scoped.ok) {
      say(this.cannot(who, task, label, scoped.reason));
      return true;
    }
    say(ack ?? rt(L, "req.ack", { task: label }));
    const out = (await this.runTool(id, "delegate_task", { role: who.actor.id, task, ...args }, signal)).output;
    // reported as `/delegate` reports it (the conversation's outcome line, the HUD's toast)
    k.emit(id, { type: "command_output", name: "delegate", text: out.output, data: { ok: out.ok, data: out.data ?? null } });
    const d = (out.data as { delegation?: DelegationResult } | undefined)?.delegation;
    if (d?.status === "completed") say(rt(L, "req.done", { task: label }));
    else if (d?.status === "cancelled") say(rt(L, "req.stopped", { task: label }));
    else say(rt(L, "req.failed", { task: label, reason: this.reasonOf(d, out.output) }));
    return true;
  }

  /** Why a delegation did not complete, in the learner's words (its refusal, the step that failed, else its first line). */
  private reasonOf(d: DelegationResult | undefined, output: string): string {
    const step = d?.steps.slice().reverse().find((s) => s.status !== "completed");
    const text = d?.refusal ?? step?.message ?? d?.message ?? output.split("\n")[0] ?? "";
    // a model-facing second line ("Go there first: navigate_to …") is not for the learner
    return text.split("\n")[0]!.replace(/[.。]\s*$/u, "");
  }

  /** "Sorry, I can't … — that's not something a porter does here. I can …" (a clinical task: a nurse can). */
  private cannot(who: Colleague, task: string, label: string, reason: string): string {
    const L = this.k.locale;
    // a role mid-sentence: "a receptionist's job" (English nouns in lower case; Chinese as is)
    const role = L.startsWith("zh") ? roleName(who.actor.role, L) : roleName(who.actor.role, L).toLowerCase();
    const tasks = scopeOf(who.actor.role).tasks.map((x) => rt(L, `delegate.task.${x}` as RuntimeKey));
    const can = tasks.join(L.startsWith("zh") ? "、" : ", ");
    const base = rt(L, can ? "req.cannot" : "req.cannotNone", { task: label, role, can });
    const nurse = ["attach_monitor", "record_ecg", "obtain_iv_access", "give_intervention"].includes(task) || reason !== "task";
    return nurse && who.actor.role !== "nurse" ? `${base} ${rt(L, "req.askNurse")}` : base;
  }

  /** The equipment a fetch names: portable equipment called that (either language), else the kit that does it. */
  private equipment(who: Colleague, what: string): { args: Record<string, unknown>; label: string } | null {
    const world = this.k.embodied!.world();
    const named = world.find(who.actor.id, { kind: "equipment", name: what, limit: 8 }).find((e) => world.entity(e.id)?.portable);
    if (named) return { args: { target: named.id }, label: named.name };
    for (const [cap, re] of KIT_WORDS) {
      if (!re.test(what)) continue;
      const kit = world.find(who.actor.id, { kind: "equipment", capabilities: [cap], limit: 8 }).find((e) => world.entity(e.id)?.portable);
      if (kit) return { args: { params: { capability: cap } }, label: kit.name };
    }
    return null;
  }

  /* ---------------------------------------------------------------- */
  /* Passing things                                                    */
  /* ---------------------------------------------------------------- */

  /** A handheld item called that (either language) the colleague knows of, nearest first: the one in their own hands, else a free one. */
  private handheld(who: Colleague, what: string): ObservedEntity | null {
    const world = this.k.embodied!.world();
    const hits = world.find(who.actor.id, { kind: "equipment", name: what, limit: 12 }).filter((e) => world.entity(e.id)?.portable === "handheld");
    return hits.find((e) => who.actor.holding.includes(e.id)) ?? hits.find((e) => !this.holderOf(e.id)) ?? hits[0] ?? null;
  }

  /** Who carries an item now (null: it lies somewhere). */
  private holderOf(itemId: string): ActorState | null {
    return this.k.embodied!.world().actors().find((a) => a.holding.includes(itemId)) ?? null;
  }

  /**
   * "Pass me the …": the colleague picks the item up (unless it is in their hands), comes to the learner and hands it
   * over with their own body (`hand_over`), saying so; what stops them — the learner's hands full, the item with
   * someone else, a step that fails — in their own voice.
   */
  private async hand(id: string, say: Say, who: Colleague, item: ObservedEntity, signal: AbortSignal): Promise<void> {
    const L = this.k.locale;
    const world = this.k.embodied!.world();
    const me = world.actor(PRIMARY_ACTOR);
    const holder = this.holderOf(item.id);
    if (!me) return;
    if (holder?.id === me.id) return say(rt(L, "req.handHave", { thing: item.name }));
    if (holder && holder.id !== who.actor.id) return say(rt(L, "req.handWith", { thing: item.name, holder: this.nameOf(holder.id) }));
    const inHand = me.holding.filter((h) => world.inspect(PRIMARY_ACTOR, h)?.state !== "equipped");
    if (inHand.length >= MAX_HELD) return say(rt(L, "req.handsFull", { thing: item.name }));
    say(rt(L, "req.ackHand", { thing: item.name }));
    const steps: WorldRequestInput[] = [
      ...(holder ? [] : [{ actorId: who.actor.id, operation: "approach", targetId: item.id, onBehalfOf: PRIMARY_ACTOR }, { actorId: who.actor.id, operation: "pick_up", targetId: item.id, onBehalfOf: PRIMARY_ACTOR }]),
      { actorId: who.actor.id, operation: "navigate", goal: { kind: "follow", id: PRIMARY_ACTOR, range: 1 }, onBehalfOf: PRIMARY_ACTOR },
      { actorId: who.actor.id, operation: "hand_over", targetId: item.id, parameters: { to: PRIMARY_ACTOR }, onBehalfOf: PRIMARY_ACTOR },
    ];
    for (const step of steps) {
      const r = await this.step(id, step, signal);
      if (r.status === "completed") continue;
      if (r.status === "failed") say(rt(L, "req.cantHand", { thing: item.name, reason: r.message.split("\n")[0]!.replace(/[.。]\s*$/u, "") }));
      return;
    }
    say(rt(L, "req.handed", { thing: item.name }));
  }

  /** One act of the colleague's, following a reach hint once (the learner moved while they walked). */
  private async step(id: string, request: WorldRequestInput, signal: AbortSignal): Promise<WorldActionResult> {
    const caller = { agent: "learner", submission: id, signal } as const;
    const r = await this.k.embodied!.act(caller, request, signal);
    if (r.status !== "failed" || !r.hint || (r.errorCode !== "NOT_IN_RANGE" && r.errorCode !== "NOT_VISIBLE")) return r;
    const moved = await this.k.embodied!.act(caller, { actorId: request.actorId, operation: "navigate", goal: r.hint.goal, onBehalfOf: PRIMARY_ACTOR }, signal);
    return moved.status === "completed" ? this.k.embodied!.act(caller, request, signal) : r;
  }

  /** A person's name as the world shows it. */
  private nameOf(actorId: string): string {
    const ent = this.k.embodied!.world().entity(actorId);
    return ent ? t(ent.name, this.k.locale) : actorId;
  }

  /* ---------------------------------------------------------------- */
  /* Walking and directions                                            */
  /* ---------------------------------------------------------------- */

  /** The colleague walks to a goal on the learner's behalf; a walk that fails is said in their voice. */
  private async walk(id: string, say: Say, who: Colleague, goal: NavGoal, signal: AbortSignal): Promise<void> {
    const r = await this.k.embodied!.act({ agent: "learner", submission: id, signal }, { actorId: who.actor.id, operation: "navigate", goal, onBehalfOf: PRIMARY_ACTOR }, signal);
    if (r.status === "failed") say(rt(this.k.locale, "req.cantGo", { reason: r.message.split("\n")[0]!.replace(/[.。]\s*$/u, "") }));
  }

  /**
   * A place or thing the colleague knows by that name: a room, then equipment called that, then — a study named by
   * what it does ("the CT scanner") — the device doing it (before a console that orders it), nearest first.
   */
  private find(who: Colleague, phrase: string): ObservedEntity | null {
    const world = this.k.embodied!.world();
    const cap = destinationCapability(phrase);
    const byCap = cap ? world.find(who.actor.id, { kind: "equipment", capabilities: [cap], limit: 6 }) : [];
    const devices = byCap.filter((e) => world.entity(e.id)?.interaction === "device");
    const hits = [...world.find(who.actor.id, { kind: "room", name: phrase, limit: 3 }), ...world.find(who.actor.id, { kind: "equipment", name: phrase, limit: 3 }), ...devices, ...byCap];
    return hits[0] ?? null;
  }

  /** The room a found entity is in (its own name for a room), as the world names places. */
  private roomOf(e: ObservedEntity): string {
    const world = this.k.embodied!.world();
    const ent = world.entity(e.id);
    if (e.kind === "room" || !ent) return e.name;
    return world.regionName({ level: ent.level, x: ent.position.x, z: ent.position.z });
  }

  /** "Where is …?": the patient where they are now; else a place from the directory with its distance from the learner. */
  private where(who: Colleague, phrase: string): string | null {
    const k = this.k;
    const L = k.locale;
    const world = k.embodied!.world();
    const c = k.caseDef;
    const patientWords = [t(c.patient.displayName, "en"), t(c.patient.displayName, "zh-CN"), "the patient", "patient", "my patient", "患者", "病人", "他", "她"].map((x) => x.toLowerCase());
    if (patientWords.includes(phrase.trim().toLowerCase())) {
      const p = world.patientPlace();
      return p ? rt(L, "req.wherePatient", { patient: this.patientName(), room: world.regionName(p) }) : null;
    }
    const place = this.find(who, phrase);
    if (!place) return null;
    const ent = world.entity(place.id);
    const me = world.actor(PRIMARY_ACTOR);
    const room = this.roomOf(place);
    if (me && ent && me.room && me.room === ent.room) return rt(L, "req.whereHere", { place: place.name, room });
    const goal: NavGoal = place.kind === "room" ? { kind: "room", id: place.id.replace(/^room:/, "") } : { kind: "interact", id: place.id };
    const plan = world.plan(PRIMARY_ACTOR, goal);
    const metres = plan.ok ? Math.max(1, Math.round(plan.length)) : null;
    return metres === null ? rt(L, "req.whereFar", { place: place.name, room }) : rt(L, "req.where", { place: place.name, room, metres });
  }

  /* ---------------------------------------------------------------- */
  /* Who                                                               */
  /* ---------------------------------------------------------------- */

  private colleague(agent: string, voice: StaffVoice | null): Colleague | null {
    return colleagueOf(this.k, agent, voice);
  }

  /**
   * Lines in the colleague's own voice (their name, their staff id for the world's figure), kept in their conversation
   * so they remember what they were asked and said; the first one records the learner's request (examiner's dialogue
   * and conversation) — a request left as talk records nothing here.
   */
  private voiceOf(id: string, agent: string, voice: StaffVoice | null, who: Colleague, request: string): Say {
    const k = this.k;
    const key = conversationKey(agent, voice);
    let first = true;
    return (text) => {
      if (first) {
        k.ensureStarted(id);
        k.conversations.addDialogue({ who: "learner", speaker: "learner", text: `@${who.name} ${request}` });
        k.conversations.append(key, [{ role: "user", content: [{ type: "text", text: request }] }]);
        first = false;
      }
      k.speakLine(id, { agent, speaker: who.name, text, grounded: [], staffId: who.staffId });
      k.conversations.append(key, [{ role: "assistant", content: [{ type: "text", text }] }]);
      k.conversations.addDialogue({ who: agent, speaker: who.name, text });
    };
  }

  private patientName(): string {
    return t(this.k.caseDef.patient.displayName, this.k.locale);
  }
}

