/**
 * Spatially grounded clinical operations (EMBODIED §6): the default policy
 * (`DefaultSpatialPolicy`, data) and the checker that evaluates a
 * requirement for an actor against the physical and clinical state
 * (`SpatialChecker`).
 *
 * | clinical action | requirement |
 * |---|---|
 * | `ask_patient` (and the companion) | `near-patient` 3 m + line of sight |
 * | `examine` | `at-patient` 1.5 m; a finding needing capabilities beyond the personal kit: `bedside-provider` (those capabilities at the bedside + actor within 1.5 m of the patient) |
 * | `check_vitals` | `any-of`: `monitor-screen` (the patient's attached monitor, 6 m, line of sight from its own room — never through a window) · `at-patient` 1.5 m (observations by hand) · `at-provider` `records` (the chart) |
 * | `order_test` | no capability: anywhere · personal kit only: `at-patient` · a study done on the patient at a fixed device (`PATIENT_AT_PROVIDER_CAPABILITIES`: CT, MRI, a fixed X-ray machine, fluoroscopy, PET-CT, endoscopy — unless authored `performedAt: "bedside"`): `all-of` `patient-at-provider` · `at-provider` (the scanner or a console) · a patient-performed test (`PATIENT_PERFORMED_CAPABILITIES`: peak flow, weight): `all-of` `patient-at-provider` · `any-of` `at-patient` · `at-provider` · other `BEDSIDE_CAPABILITIES`: `any-of` `bedside-provider` · `all-of` [`patient-at-provider`, `at-provider` with `fixedOnly`] (a fixed station counts only with the patient within its reach, G8) · only `LAB_CAPABILITIES`: the sample at the patient — `at-patient` (ordered there, sent by pneumatic tube), or, once the case's IV-access procedure drew the bloods (`clinical`), order entry at a `records` terminal or a laboratory station · otherwise `at-provider` |
 * | `read_result` | bedside capabilities: `at-patient` · a `records` terminal · a fixed station providing them — never the device · laboratory capabilities: a `records` terminal · `at-patient` · a laboratory station · otherwise `at-provider` (the report at a console — never the patient) |
 * | `intervene` kind `consult` / `disposition` | anywhere (phone/pager) |
 * | `intervene` other kinds | its capabilities (empty `requires`: the kind's defaults, `KIND_DEFAULT_CAPABILITIES`) beyond the personal kit at the bedside (`bedside-provider`; nothing: `at-patient`); delivered capabilities (`DELIVERED_CAPABILITIES`) only need an in-service provider in the facility; `iv-access` is patient state — the case's IV-access procedure done first (`clinical`), unless the patient has a line in situ — except for that procedure itself, which needs the cannulation kit at the bedside |
 * | `consult`, `delegate_task`, cognitive tools | anywhere |
 * | unresolved items (a free-text query the tool will resolve or refuse) | `ask` / `examine`: as above without capabilities; order/read/intervene: anywhere |
 *
 * Measuring (shared with the action bus, `WorldLocator`): ranges from the
 * actor to the target's *current* footprint, same level, never below
 * `MIN_RANGE` (0.88 m); line of sight at eye height (no field of view —
 * the actor can turn). Providers: in service and not reserved by someone
 * else (a busy device is not a provider). `at-provider`: equipment of
 * interaction kind workstation / device / monitor whose capabilities ⊇ the
 * requirement, within its reach (moved carts where they stand now; a
 * carried item is in reach). `bedside-provider`: each capability (personal
 * kit excluded) provided by some placement at the bedside — THE bedside rule
 * (`bedside.ts`, `WorldRuntime.atBedside`). A `delivered` capability counts
 * when some in-service placement of the facility provides it.
 *
 * Refusals (`SPATIAL_REQUIREMENT_UNMET`) carry a reason, a localised
 * message (capabilities by their display labels), details and a hint: an
 * `interact` goal on the patient, the patient's monitor or the nearest
 * provider by walking distance (the flood of `Reachability`, across levels
 * through the connectors); for a bedside capability that is elsewhere, the
 * nearest free portable provider to fetch (`move_to` it to the patient), or
 * null when none can be brought; null when nothing in the facility provides
 * it, and null for a clinical prerequisite (`details.prerequisite` names the
 * tool call that establishes it); the patient away from a device a study
 * needs: go to the patient, then take them there (`hint.then`:
 * `transport_patient {destination}`). `any-of` reports the option whose hint
 * is nearest, preferring hints a single navigation fixes over fetching a
 * cart, and both over moving the patient; an `all-of` with a part no walk can
 * fix — or the patient to bring — reports only that part. A satisfied `all-of`
 * lists in `satisfiedBy` what the actor acts through where they stand before
 * the device the patient is at (at the console, the scanner's patient on its
 * table: the console first).
 *
 * Failures are ranked lazily (extra review item 4): `reason`, `message`,
 * `hint` and `details` of a failed check are resolved — the walking-distance
 * ranking of its candidates — the first time one of them is read, with the
 * actor where it stood when checked; `ok`, `code` and `requirement` are
 * eager. A UI that only asks whether an act can be done here pays no flood.
 */
import { capabilityLabels, evaluate, monitorAttached, PERSONAL_KIT, t, type CaseDefinition, type Condition } from "@clinicalcraft/core";
import { RANGES, type ActionHint, type ActorId, type ActorState, type ClinicalIntent, type ClinicalView, type EncounterBinding, type EntityId, type InteractionKind, type NavGoal, type SpatialCheck, type SpatialErrorCode, type SpatialPolicy, type SpatialRequirement } from "./contracts.js";
import { BEDSIDE_CAPABILITIES, BLOOD_SAMPLE_CAPABILITIES, CHART_CAPABILITY, DELIVERED_CAPABILITIES, IV_ACCESS_CAPABILITY, KIND_DEFAULT_CAPABILITIES, LAB_CAPABILITIES, PATIENT_AT_PROVIDER_CAPABILITIES, PATIENT_PERFORMED_CAPABILITIES } from "./capabilities.js";
import { ivAccessIntervention, ivAccessInSitu } from "./clinical.js";
import { listText, metres, worldMessage } from "./i18n.js";
import type { Placed, StateView, WorldLocator } from "./locate.js";
import { MIN_RANGE } from "./nav/backend.js";
import { areaGap, rankedPatientProviders, type TargetDeps } from "./patient.js";
import type { Reachability } from "./reach.js";

/** Intervention kinds done by phone or pager, from anywhere. */
export const REMOTE_INTERVENTION_KINDS: readonly string[] = ["consult", "disposition"];

/** Ranges of the default policy (m, from the target's footprint). */
export const POLICY_RANGES = { talk: RANGES.talk, contact: RANGES.contact, screen: RANGES.screen } as const;

/** Interaction kinds that can be an `at-provider` (stations.ts `providersOf`). */
export const PROVIDER_KINDS: readonly InteractionKind[] = ["workstation", "device", "monitor"];

const kit = new Set<string>(PERSONAL_KIT);
const ANYWHERE: SpatialRequirement = { kind: "anywhere" };

export interface DefaultSpatialPolicyOptions {
  bedsideCapabilities?: readonly string[];
  deliveredCapabilities?: readonly string[];
  labCapabilities?: readonly string[];
  bloodSampleCapabilities?: readonly string[];
  kindDefaults?: Readonly<Record<string, readonly string[]>>;
  /** Studies done on the patient at a fixed device (default `PATIENT_AT_PROVIDER_CAPABILITIES`). */
  patientAtProviderCapabilities?: readonly string[];
  /** Patient-performed tests at a fixed station (default `PATIENT_PERFORMED_CAPABILITIES`). */
  patientPerformedCapabilities?: readonly string[];
}

/** The default policy (EMBODIED §6, module table). */
export class DefaultSpatialPolicy implements SpatialPolicy {
  readonly bedside: ReadonlySet<string>;
  readonly delivered: ReadonlySet<string>;
  readonly lab: ReadonlySet<string>;
  readonly blood: ReadonlySet<string>;
  readonly kindDefaults: Readonly<Record<string, readonly string[]>>;
  readonly onDevice: ReadonlySet<string>;
  readonly performed: ReadonlySet<string>;

  constructor(opts: DefaultSpatialPolicyOptions = {}) {
    this.bedside = new Set(opts.bedsideCapabilities ?? BEDSIDE_CAPABILITIES);
    this.delivered = new Set(opts.deliveredCapabilities ?? DELIVERED_CAPABILITIES);
    this.lab = new Set(opts.labCapabilities ?? LAB_CAPABILITIES);
    this.blood = new Set(opts.bloodSampleCapabilities ?? BLOOD_SAMPLE_CAPABILITIES);
    this.kindDefaults = opts.kindDefaults ?? KIND_DEFAULT_CAPABILITIES;
    this.onDevice = new Set(opts.patientAtProviderCapabilities ?? PATIENT_AT_PROVIDER_CAPABILITIES);
    this.performed = new Set(opts.patientPerformedCapabilities ?? PATIENT_PERFORMED_CAPABILITIES);
  }

  requirementFor(intent: ClinicalIntent, binding: EncounterBinding): SpatialRequirement {
    const c: CaseDefinition = binding.caseDef;
    const atPatient: SpatialRequirement = { kind: "at-patient", range: POLICY_RANGES.contact };
    const chart: SpatialRequirement = { kind: "at-provider", capabilities: [CHART_CAPABILITY] };
    switch (intent.kind) {
      case "ask":
        return { kind: "near-patient", range: POLICY_RANGES.talk, lineOfSight: true };
      case "examine": {
        const f = intent.findingId ? c.exam.find((x) => x.id === intent.findingId) : undefined;
        const caps = (f?.requires ?? []).filter((r) => !kit.has(r));
        return caps.length ? { kind: "bedside-provider", capabilities: caps, patientRange: POLICY_RANGES.contact } : atPatient;
      }
      case "vitals":
        return { kind: "any-of", options: [{ kind: "monitor-screen", range: POLICY_RANGES.screen }, { kind: "at-patient", range: POLICY_RANGES.contact, why: "observations" }, chart] };
      case "order":
      case "read": {
        const inv = intent.investigationId ? c.investigations.find((x) => x.id === intent.investigationId) : undefined;
        if (!inv || inv.requires.length === 0) return ANYWHERE;
        const caps = inv.requires.filter((r) => !kit.has(r));
        if (!caps.length) return atPatient;
        // a study done on the patient at a fixed device, or a test the patient performs at a station: the patient is
        // brought there (G8) — then ordered at the device or its console, the patient-performed one with them
        const onPatient = inv.performedAt === "bedside" ? [] : caps.filter((r) => this.onDevice.has(r) || this.performed.has(r));
        if (intent.kind === "order" && onPatient.length) {
          const there: SpatialRequirement = { kind: "patient-at-provider", capabilities: onPatient };
          const by: SpatialRequirement = onPatient.every((r) => this.performed.has(r)) ? { kind: "any-of", options: [atPatient, { kind: "at-provider", capabilities: caps }] } : { kind: "at-provider", capabilities: caps };
          return { kind: "all-of", options: [there, by] };
        }
        if (caps.every((r) => this.bedside.has(r))) {
          if (intent.kind === "read") return { kind: "any-of", options: [atPatient, chart, { kind: "at-provider", capabilities: caps, fixedOnly: true, providerKinds: ["workstation"] }] };
          // the device at the bedside — or a fixed station of it, which counts only with the patient within its reach (G8)
          return { kind: "any-of", options: [{ kind: "bedside-provider", capabilities: caps, patientRange: POLICY_RANGES.contact }, { kind: "all-of", options: [{ kind: "patient-at-provider", capabilities: caps }, { kind: "at-provider", capabilities: caps, fixedOnly: true }] }] };
        }
        if (caps.every((r) => this.lab.has(r))) {
          const station: SpatialRequirement = { kind: "at-provider", capabilities: caps };
          if (intent.kind === "read") return { kind: "any-of", options: [chart, atPatient, station] };
          const sample: SpatialRequirement = { kind: "at-patient", range: POLICY_RANGES.contact, why: "sample" };
          const iv = caps.every((r) => this.blood.has(r)) ? ivAccessIntervention(c) : null;
          if (!iv) return sample;
          return { kind: "any-of", options: [sample, { kind: "all-of", options: [{ kind: "clinical", condition: { intervened: iv }, need: "sample", interventionId: iv }, { kind: "any-of", options: [chart, station] }] }] };
        }
        return { kind: "at-provider", capabilities: caps };
      }
      case "intervene": {
        const iv = intent.interventionId ? c.interventions.find((x) => x.id === intent.interventionId) : undefined;
        if (!iv || REMOTE_INTERVENTION_KINDS.includes(iv.kind)) return ANYWHERE;
        const requires = iv.requires.length ? iv.requires : (this.kindDefaults[iv.kind] ?? []);
        let caps = requires.filter((r) => !kit.has(r));
        // IV access is patient state: the case's IV-access procedure done first (a line in situ needs none) —
        // except for that procedure itself, which needs the cannulation kit at the bedside.
        const line = ivAccessIntervention(c);
        let prerequisite: SpatialRequirement | null = null;
        if (caps.includes(IV_ACCESS_CAPABILITY) && iv.id !== line) {
          caps = caps.filter((r) => r !== IV_ACCESS_CAPABILITY);
          if (line && !ivAccessInSitu(c)) prerequisite = { kind: "clinical", condition: { intervened: line }, need: "iv-access", interventionId: line };
        }
        const delivered = caps.filter((r) => this.delivered.has(r));
        const bedside = caps.filter((r) => !this.delivered.has(r));
        const base: SpatialRequirement = caps.length ? { kind: "bedside-provider", capabilities: bedside, patientRange: POLICY_RANGES.contact, ...(delivered.length ? { delivered } : {}) } : atPatient;
        return prerequisite ? { kind: "all-of", options: [prerequisite, base] } : base;
      }
      default:
        return ANYWHERE;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Evaluation                                                          */
/* ------------------------------------------------------------------ */

/** A place that fixes a failure: go there (`interact`), or fetch it (a cart to wheel to the patient), or go to the patient and take them to `transport`. */
interface Candidate {
  goal: NavGoal;
  target: Placed;
  fetch: boolean;
  /** Where to take the patient (`transport_patient`): a provider, or `home` (back to their bed space). */
  transport?: EntityId | "home";
}

interface Failure {
  reason: string;
  details: Record<string, unknown>;
  candidates: Candidate[];
  /** Localised message, given the chosen candidate (if any). */
  message(chosen: Candidate | null): string;
}

type Outcome = { ok: true; satisfiedBy: EntityId[] } | { ok: false; failures: Failure[] };

export interface SpatialCheckerDeps {
  locator: WorldLocator;
  state: StateView;
  reach: Reachability;
  policy: SpatialPolicy;
  binding: EncounterBinding;
  locale: string;
  /** The clinical side (engine state for `clinical` requirements, the monitor's attachment). */
  clinical: ClinicalView;
  /** In-flight device locks of the action bus (a device running someone's operation is busy). */
  busy?: (id: EntityId) => ActorId | null;
}

const round2 = (v: number) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : null);

/** Evaluates spatial requirements for actors (see module docs). */
export class SpatialChecker {
  constructor(private readonly d: SpatialCheckerDeps) {}

  /** The policy's requirement for an intent. */
  requirement(intent: ClinicalIntent): SpatialRequirement {
    return this.d.policy.requirementFor(intent, this.d.binding);
  }

  /** `checkSpatial` of the runtime: the policy's requirement for the intent, evaluated for the actor. */
  check(actorId: string, intent: ClinicalIntent, opts: { recheck?: boolean } = {}): SpatialCheck {
    const requirement = this.requirement(intent);
    const code: SpatialErrorCode = opts.recheck ? "SPATIAL_PRECONDITION_CHANGED" : "SPATIAL_REQUIREMENT_UNMET";
    const actor = this.d.state.actor(actorId);
    if (!actor) return { ok: false, code, requirement, reason: "unknown-actor", message: worldMessage("UNKNOWN_ACTOR", this.d.locale, { actor: actorId }), hint: null };
    return this.evaluate(actor, requirement, code);
  }

  /**
   * Evaluate a requirement for an actor (any pose: the action bus evaluates hypothetical spots too). A
   * failure's `reason`, `message`, `hint` and `details` are resolved lazily (see the module docs).
   */
  evaluate(actor: ActorState, requirement: SpatialRequirement, code: SpatialErrorCode = "SPATIAL_REQUIREMENT_UNMET"): SpatialCheck {
    const outcome = this.outcome(actor, requirement);
    if (outcome.ok) return { ok: true, requirement, satisfiedBy: outcome.satisfiedBy };
    // ranked with the actor where it stands now, whenever the failure is first read
    const at: ActorState = { ...actor, pose: { ...actor.pose } };
    let resolved: { reason: string; message: string; hint: ActionHint | null; details: Record<string, unknown> } | null = null;
    const resolve = () => (resolved ??= this.resolveFailure(at, outcome.failures));
    const check = { ok: false, code, requirement } as Extract<SpatialCheck, { ok: false }>;
    for (const key of ["reason", "message", "hint", "details"] as const) Object.defineProperty(check, key, { get: () => resolve()[key], enumerable: true, configurable: true });
    return check;
  }

  /** The failure to report and its hint (the ranking). */
  private resolveFailure(actor: ActorState, failures: Failure[]): { reason: string; message: string; hint: ActionHint | null; details: Record<string, unknown> } {
    const { failure, chosen } = this.choose(actor, failures);
    const L = this.d.locale;
    const loc = this.d.locator;
    const patient = loc.patientId;
    let hint: ActionHint | null = null;
    if (chosen?.transport && patient) {
      // go to the patient, then take them to the device (or back to their bed space)
      const label = chosen.transport === "home" ? worldMessage("hint.transportHome", L, { patient: this.patientName(), place: this.homeName() }) : worldMessage("hint.transport", L, { patient: this.patientName(), provider: loc.name(chosen.transport) });
      hint = { goal: chosen.goal, label, then: { operation: "transport_patient", targetId: patient, parameters: { destination: chosen.transport } } };
    } else if (chosen) {
      hint = {
        goal: chosen.goal,
        label: chosen.fetch ? worldMessage("hint.fetch", L, { provider: loc.name(chosen.target.id), patient: this.patientName() }) : chosen.target.kind === "patient" ? worldMessage("hint.patient", L, { patient: this.patientName() }) : worldMessage("hint.provider", L, { provider: loc.name(chosen.target.id) }),
        // a fetch: once at the cart, wheel it to the patient
        ...(chosen.fetch && patient ? { then: { operation: "move_to", targetId: chosen.target.id, goal: { kind: "interact", id: patient } as NavGoal } } : {}),
      };
    }
    return { reason: failure.reason, message: failure.message(chosen), hint, details: failure.details };
  }

  private patientName(): string {
    return this.d.locator.patientId ? this.d.locator.name(this.d.locator.patientId) : "—";
  }

  /** The name of the patient's own place (their bed space, else the provider they belong at). */
  private homeName(): string {
    const body = this.d.locator.patientBody;
    const st = body?.state();
    if (!body || !st) return "—";
    const slot = body.slot(st.home.slot);
    if (slot) return body.slotName(slot);
    return st.home.provider ? this.d.locator.name(st.home.provider) : "—";
  }

  /**
   * Away from their own place (at a device for a study), the kit an act needs may stand back there — fixed
   * equipment that cannot be brought (the bay's infusion pumps): then take the patient back (null when the
   * patient is home, or home lacks it too). Every capability must be provided in the home room.
   */
  private kitAtHome(caps: readonly string[]): boolean {
    const loc = this.d.locator;
    const body = loc.patientBody;
    const st = body?.state();
    if (!body || !st) return false;
    const atHome = st.home.slot ? st.slot === st.home.slot : !st.slot && st.provider === st.home.provider;
    if (atHome) return false;
    const homeSlot = body.slot(st.home.slot);
    const homeRoom = homeSlot ? homeSlot.room : st.home.provider ? (loc.place(st.home.provider)?.room ?? null) : null;
    if (!homeRoom) return false;
    const equipment = loc.registry.ofKind("equipment");
    return caps.every((cap) => equipment.some((e) => loc.capabilities(e.id).includes(cap) && loc.place(e.id)?.room === homeRoom));
  }

  private caps(caps: readonly string[]): string {
    return listText(capabilityLabels(caps, this.d.locale), this.d.locale);
  }

  /** Who else holds the device (a reservation, or an operation running on it), or null. */
  busyBy(actor: Pick<ActorState, "id">, id: EntityId): ActorId | null {
    const reserved = this.d.state.entity(id)?.reservedBy;
    if (reserved && reserved !== actor.id) return reserved;
    const running = this.d.busy?.(id) ?? null;
    return running && running !== actor.id ? running : null;
  }

  private outcome(actor: ActorState, r: SpatialRequirement): Outcome {
    switch (r.kind) {
      case "anywhere":
        return { ok: true, satisfiedBy: [] };
      case "near-patient":
        return this.patientOutcome(actor, r.range, r.lineOfSight, "not-near-patient");
      case "at-patient":
        return this.patientOutcome(actor, r.range, true, "not-at-patient", r.why);
      case "at-provider":
        return this.providerOutcome(actor, r.capabilities, r.range, !!r.fixedOnly, r.providerKinds ?? PROVIDER_KINDS);
      case "bedside-provider":
        return this.bedsideOutcome(actor, r.capabilities, r.patientRange, r.delivered ?? []);
      case "monitor-screen":
        return this.screenOutcome(actor, r.range);
      case "clinical":
        return this.clinicalOutcome(r);
      case "patient-at-provider":
        return this.patientAtProviderOutcome(actor, r.capabilities);
      case "any-of": {
        const failures: Failure[] = [];
        for (const option of r.options) {
          const o = this.outcome(actor, option);
          if (o.ok) return o;
          failures.push(...o.failures);
        }
        return { ok: false, failures };
      }
      case "all-of": {
        const used: EntityId[] = [];
        // the device the patient is at comes after what the actor acts through where they stand (a console
        // they are at is where they order; the scanner is where the patient lies)
        const patientAt: EntityId[] = [];
        const failing: Failure[][] = [];
        for (const option of r.options) {
          const o = this.outcome(actor, option);
          if (o.ok) (option.kind === "patient-at-provider" ? patientAt : used).push(...o.satisfiedBy);
          else failing.push(o.failures);
        }
        if (!failing.length) return { ok: true, satisfiedBy: [...new Set([...used, ...patientAt])] };
        // a part no walk can fix (a clinical prerequisite, nothing in the facility): report it alone, without hints;
        // the patient to bring to a device comes first too (a walk to the console would be wasted)
        const stuck = failing.find((fs) => fs.every((f) => !f.candidates.length)) ?? failing.find((fs) => fs.some((f) => f.reason === "patient-not-at-provider"));
        return { ok: false, failures: stuck ?? failing.flat() };
      }
    }
  }

  private noPatient(): Outcome {
    return { ok: false, failures: [{ reason: "no-patient", details: {}, candidates: [], message: () => worldMessage("spatial.no-patient", this.d.locale) }] };
  }

  private patientOutcome(actor: ActorState, range: number, lineOfSight: boolean, farReason: string, why?: string): Outcome {
    const loc = this.d.locator;
    const patient = loc.patient();
    if (!patient) return this.noPatient();
    const needed = Math.max(range, MIN_RANGE);
    const distance = loc.distance(actor.pose, patient);
    if (distance <= needed + 1e-6 && (!lineOfSight || loc.lineOfSight(actor.pose, patient))) return { ok: true, satisfiedBy: [patient.id] };
    const reason = distance <= needed + 1e-6 ? "patient-not-visible" : farReason;
    const vars = { patient: this.patientName(), range: metres(needed), distance: metres(distance) };
    const key = why && reason === "not-at-patient" ? `spatial.not-at-patient.${why}` : `spatial.${reason}`;
    return { ok: false, failures: [{ reason, details: { distance: round2(distance), range: needed, ...(why ? { why } : {}) }, candidates: [{ goal: { kind: "interact", id: patient.id }, target: patient, fetch: false }], message: () => worldMessage(key, this.d.locale, vars) }] };
  }

  /** In-service equipment providing every capability (provider kinds; fixed only when asked). */
  private providers(caps: readonly string[], fixedOnly: boolean, kinds: readonly InteractionKind[] = PROVIDER_KINDS): Placed[] {
    const loc = this.d.locator;
    const out: Placed[] = [];
    for (const e of loc.registry.ofKind("equipment")) {
      if (!kinds.includes(e.interaction) || (fixedOnly && e.portable)) continue;
      const have = loc.capabilities(e.id);
      if (!caps.every((c) => have.includes(c))) continue;
      const p = loc.place(e.id);
      if (p) out.push(p);
    }
    return out;
  }

  private providerOutcome(actor: ActorState, caps: readonly string[], range: number | undefined, fixedOnly: boolean, kinds: readonly InteractionKind[]): Outcome {
    const loc = this.d.locator;
    const L = this.d.locale;
    const capsText = this.caps(caps);
    const all = this.providers(caps, fixedOnly, kinds);
    if (!all.length) return { ok: false, failures: [{ reason: "no-provider-in-facility", details: { capabilities: [...caps], fixedOnly }, candidates: [], message: () => worldMessage("spatial.no-provider-in-facility", L, { caps: capsText }) }] };
    // a device reserved by someone else is not a provider
    const providers = all.filter((p) => !this.busyBy(actor, p.id));
    for (const p of providers) {
      const needed = range !== undefined ? Math.max(range, MIN_RANGE) : loc.reach(p);
      if (loc.distance(actor.pose, p) <= needed + 1e-6 && loc.lineOfSight(actor.pose, p)) return { ok: true, satisfiedBy: [p.id] };
    }
    if (!providers.length) {
      const holder = this.busyBy(actor, all[0]!.id)!;
      return { ok: false, failures: [{ reason: "provider-busy", details: { capabilities: [...caps], providers: all.map((p) => p.id), busy: all.map((p) => p.id) }, candidates: [], message: () => worldMessage("spatial.provider-busy-none", L, { caps: capsText, provider: loc.name(all[0]!.id), holder: loc.name(holder) }) }] };
    }
    const candidates = providers.map((p) => ({ goal: { kind: "interact", id: p.id } as NavGoal, target: p, fetch: false }));
    return {
      ok: false,
      failures: [
        {
          reason: "no-provider-in-reach",
          details: { capabilities: [...caps], providers: providers.map((p) => p.id), fixedOnly },
          candidates,
          message: (chosen) => (chosen ? worldMessage("spatial.no-provider-in-reach", L, { caps: capsText, provider: loc.name(chosen.target.id) }) : worldMessage("spatial.no-provider-in-reach-none", L, { caps: capsText })),
        },
      ],
    };
  }

  private bedsideOutcome(actor: ActorState, caps: readonly string[], patientRange: number, delivered: readonly string[] = []): Outcome {
    const loc = this.d.locator;
    const L = this.d.locale;
    const patient = loc.patient();
    if (!patient) return this.noPatient();
    const required = caps.filter((c) => !kit.has(c));
    const equipment = loc.registry.ofKind("equipment");
    // Delivered to the bedside (drugs, blood products): an in-service provider anywhere in the facility.
    const undeliverable = delivered.filter((cap) => !kit.has(cap) && !equipment.some((e) => loc.capabilities(e.id).includes(cap)));
    if (undeliverable.length) {
      return { ok: false, failures: [{ reason: "no-provider-in-facility", details: { capabilities: [...required, ...delivered], missing: undeliverable, delivered: [...delivered] }, candidates: [], message: () => worldMessage("spatial.no-provider-in-facility", L, { caps: this.caps(undeliverable) }) }] };
    }
    const nowhere: string[] = [];
    const missing: string[] = [];
    const busy: string[] = [];
    const used = new Set<EntityId>();
    const providersOf = new Map<string, Placed[]>();
    for (const cap of required) {
      const all = equipment.filter((e) => loc.capabilities(e.id).includes(cap)).map((e) => loc.place(e.id)!);
      providersOf.set(cap, all);
      if (!all.length) {
        nowhere.push(cap);
        continue;
      }
      const here = all.filter((p) => loc.atBedside(p));
      // a device reserved by someone else is not a provider (EMBODIED §6: DEVICE_BUSY)
      const free = here.filter((p) => !this.busyBy(actor, p.id));
      if (free.length) used.add(free[0]!.id);
      else if (here.length) busy.push(cap);
      else missing.push(cap);
    }
    if (nowhere.length) return { ok: false, failures: [{ reason: "no-provider-in-facility", details: { capabilities: required, missing: nowhere }, candidates: [], message: () => worldMessage("spatial.no-provider-in-facility", L, { caps: this.caps(nowhere) }) }] };
    const lacking = [...missing, ...busy];
    if (lacking.length) {
      // portable providers of a capability that are not at the bedside (or free there) and that this actor may move
      const fetchable = (cap: string) =>
        providersOf
          .get(cap)!
          .filter((p) => p.entity?.portable && (!p.heldBy || p.heldBy === actor.id) && !this.busyBy(actor, p.id) && !(loc.atBedside(p) && !p.heldBy));
      const first = lacking[0]!;
      const reason = missing.length ? "provider-not-at-bedside" : "provider-busy";
      const details: Record<string, unknown> = { capabilities: required, missing: lacking, providers: providersOf.get(first)!.map((p) => p.id), ...(busy.length ? { busy } : {}) };
      if (lacking.some((cap) => fetchable(cap).length === 0)) {
        const stuck = lacking.find((cap) => fetchable(cap).length === 0)!;
        if (busy.includes(stuck)) {
          const held = providersOf.get(stuck)!.find((p) => loc.atBedside(p))!;
          return { ok: false, failures: [{ reason: "provider-busy", details, candidates: [], message: () => worldMessage("spatial.provider-busy-none", L, { caps: this.caps([stuck]), provider: loc.name(held.id), holder: loc.name(this.busyBy(actor, held.id) ?? "—") }) }] };
        }
        // fixed kit back in the patient's own bed space (the patient was taken to a device): take them back
        const needed = missing.length ? missing : lacking;
        if (this.kitAtHome(needed)) {
          return { ok: false, failures: [{ reason, details: { ...details, home: true }, candidates: [{ goal: { kind: "interact", id: patient.id }, target: patient, fetch: false, transport: "home" }], message: () => worldMessage("spatial.kit-at-home", L, { caps: this.caps(needed), patient: this.patientName(), place: this.homeName() }) }] };
        }
        return { ok: false, failures: [{ reason, details, candidates: [], message: () => worldMessage("spatial.provider-not-at-bedside-fixed", L, { caps: this.caps(missing.length ? missing : lacking) }) }] };
      }
      // an item the actor carries is at the bedside as soon as the actor is: go to the patient
      const carried = fetchable(first).find((p) => p.heldBy === actor.id);
      const candidates: Candidate[] = carried ? [{ goal: { kind: "interact", id: patient.id }, target: patient, fetch: false }] : fetchable(first).map((p) => ({ goal: { kind: "interact", id: p.id }, target: p, fetch: true }));
      const busyHere = busy.length ? providersOf.get(busy[0]!)!.find((p) => loc.atBedside(p)) : undefined;
      return {
        ok: false,
        failures: [
          {
            reason,
            details,
            candidates,
            message: (chosen) =>
              reason === "provider-busy" && busyHere
                ? worldMessage("spatial.provider-busy", L, { caps: this.caps(busy), provider: loc.name(busyHere.id), holder: loc.name(this.busyBy(actor, busyHere.id) ?? "—"), alternative: chosen ? loc.name(chosen.target.id) : "—", patient: this.patientName() })
                : worldMessage("spatial.provider-not-at-bedside", L, { caps: this.caps(lacking), provider: chosen ? loc.name(chosen.target.id) : "—", patient: this.patientName() }),
          },
        ],
      };
    }
    const at = this.patientOutcome(actor, patientRange, true, "not-at-patient");
    return at.ok ? { ok: true, satisfiedBy: [patient.id, ...used] } : at;
  }

  /** The resolution context of providers for the patient (ranking only: no spots needed). */
  private targetDeps(): TargetDeps | null {
    const loc = this.d.locator;
    if (!loc.patientBody) return null;
    return {
      body: loc.patientBody,
      registry: loc.registry,
      capabilities: (id) => loc.capabilities(id),
      reach: (id) => {
        const p = loc.place(id);
        return p ? loc.reach(p) : 0;
      },
      grids: null,
      visibility: loc.visibility,
      sight: (id) => {
        const p = loc.place(id);
        return p ? loc.sight(p) : null;
      },
      locale: this.d.locale,
    };
  }

  /** Is the patient within reach of a provider (where both are now), with a line of sight? */
  patientWithin(patient: Placed, p: Placed): boolean {
    const loc = this.d.locator;
    if (patient.level !== p.level) return false;
    if (areaGap(patient.area, p.area) > Math.max(loc.reach(p), MIN_RANGE) + 1e-6) return false;
    return loc.visibility.visibleFrom(p.level, { x: patient.position.x, z: patient.position.z }, loc.sight(p));
  }

  /**
   * The patient within reach of an in-service device providing every capability (G8): a scanner, a C-arm,
   * a station — terminals only where no device provides them (`patientProviders`). Away: go to the patient,
   * then take them to the nearest one (`transport_patient`).
   */
  private patientAtProviderOutcome(actor: ActorState, caps: readonly string[]): Outcome {
    const loc = this.d.locator;
    const L = this.d.locale;
    const patient = loc.patient();
    const deps = this.targetDeps();
    if (!patient || !deps) return this.noPatient();
    const capsText = this.caps(caps);
    const all = rankedPatientProviders(deps, caps);
    if (!all.length) return { ok: false, failures: [{ reason: "no-provider-in-facility", details: { capabilities: [...caps] }, candidates: [], message: () => worldMessage("spatial.no-provider-in-facility", L, { caps: capsText }) }] };
    const free = all.filter((id) => !this.busyBy(actor, id));
    for (const id of free) {
      const p = loc.place(id);
      if (p && this.patientWithin(patient, p)) return { ok: true, satisfiedBy: [id] };
    }
    if (!free.length) {
      const holder = this.busyBy(actor, all[0]!)!;
      return { ok: false, failures: [{ reason: "provider-busy", details: { capabilities: [...caps], providers: all, busy: all }, candidates: [], message: () => worldMessage("spatial.provider-busy-none", L, { caps: capsText, provider: loc.name(all[0]!), holder: loc.name(holder) }) }] };
    }
    const destination = free[0]!;
    return {
      ok: false,
      failures: [
        {
          reason: "patient-not-at-provider",
          details: { capabilities: [...caps], providers: free, destination },
          candidates: [{ goal: { kind: "interact", id: patient.id }, target: patient, fetch: false, transport: destination }],
          message: () => worldMessage("spatial.patient-not-at-provider", L, { patient: this.patientName(), caps: capsText, provider: loc.name(destination) }),
        },
      ],
    };
  }

  /** The patient's attached monitor, read from its screen: within range, line of sight, from the monitor's own room. */
  private screenOutcome(actor: ActorState, range: number): Outcome {
    const loc = this.d.locator;
    const L = this.d.locale;
    const view = this.d.clinical;
    const monitors = loc.registry
      .ofKind("equipment")
      .filter((e) => e.interaction === "monitor" && loc.isPatientMonitor(e.id) && this.d.state.available(e.id))
      .map((e) => loc.place(e.id)!);
    if (!monitors.length || !monitorAttached(view.caseDef, view.state())) {
      return { ok: false, failures: [{ reason: "no-monitor-attached", details: { monitors: monitors.map((m) => m.id) }, candidates: [], message: () => worldMessage("spatial.no-monitor-attached", L, { patient: this.patientName() }) }] };
    }
    const needed = Math.max(range, MIN_RANGE);
    // THE screen rule (`WorldLocator.screenInView`): the monitor's `read`, perception's screen cue and the web use it too
    for (const m of monitors) if (loc.screenInView(actor, m, range)) return { ok: true, satisfiedBy: [m.id] };
    const m = monitors[0]!;
    return {
      ok: false,
      failures: [
        {
          reason: "monitor-not-in-view",
          details: { monitors: monitors.map((x) => x.id), range: needed, distance: round2(loc.distance(actor.pose, m)) },
          candidates: monitors.map((x) => ({ goal: { kind: "interact", id: x.id } as NavGoal, target: x, fetch: false })),
          message: (chosen) => worldMessage("spatial.monitor-not-in-view", L, { monitor: loc.name((chosen?.target ?? m).id), range: metres(needed) }),
        },
      ],
    };
  }

  /** A fact of the clinical state the engine must hold (no walk fixes it: no hint; `details.prerequisite` names the act). */
  private clinicalOutcome(r: Extract<SpatialRequirement, { kind: "clinical" }>): Outcome {
    const view = this.d.clinical;
    if (evaluate(view.caseDef, view.state(), r.condition as Condition)) return { ok: true, satisfiedBy: [] };
    const L = this.d.locale;
    const iv = r.interventionId ? view.caseDef.interventions.find((x) => x.id === r.interventionId) : undefined;
    const name = iv ? t(iv.name, L) : (r.interventionId ?? "—");
    const details: Record<string, unknown> = { need: r.need, condition: r.condition, ...(r.interventionId ? { prerequisite: { tool: "intervene", intervention_id: r.interventionId } } : {}) };
    const key = `spatial.clinical.${r.need}`;
    return { ok: false, failures: [{ reason: "clinical-prerequisite", details, candidates: [], message: () => worldMessage(key in CLINICAL_KEYS ? key : "spatial.clinical", L, { intervention: name, patient: this.patientName() }) }] };
  }

  /**
   * Pick the failure to report and its hint: candidates a single navigation
   * fixes first, then carts to fetch; nearest by walking distance, then by
   * straight-line distance (another level, unreachable), then id.
   */
  private choose(actor: ActorState, failures: Failure[]): { failure: Failure; chosen: Candidate | null } {
    // a walk, then a cart to fetch, then the patient to take somewhere
    const tier = (c: Candidate) => (c.transport ? 2 : c.fetch ? 1 : 0);
    for (const want of [0, 1, 2]) {
      let best: { failure: Failure; c: Candidate; key: [number, number, string] } | null = null;
      for (const failure of failures) {
        for (const c of failure.candidates) {
          if (tier(c) !== want) continue;
          const key = this.rank(actor, c.target);
          if (!best || key[0] < best.key[0] || (key[0] === best.key[0] && (key[1] < best.key[1] || (key[1] === best.key[1] && key[2] < best.key[2])))) best = { failure, c, key };
        }
      }
      if (best) return { failure: best.failure, chosen: best.c };
    }
    const informative = failures.find((f) => f.reason === "clinical-prerequisite") ?? failures.find((f) => f.reason !== "no-provider-in-facility") ?? failures[0]!;
    return { failure: informative, chosen: null };
  }

  /** [tier, metres, id]: tier 0 = reachable (walking metres, other levels through the connectors), 1 = not computed, 2 = unreachable (straight-line metres). */
  private rank(actor: ActorState, p: Placed): [number, number, string] {
    const path = this.d.reach.pathDistance(actor, p);
    const straight = Math.hypot(p.position.x - actor.pose.x, p.position.z - actor.pose.z);
    if (path !== null && Number.isFinite(path)) return [0, path, p.id];
    return [path === null ? 1 : 2, straight, p.id];
  }
}

/** Message keys of `clinical` requirements by `need` (others: the generic one). */
const CLINICAL_KEYS: Record<string, true> = { "spatial.clinical.iv-access": true, "spatial.clinical.sample": true };
