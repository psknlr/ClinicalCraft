/**
 * Spatially grounded clinical operations (EMBODIED §6): the default policy
 * (`DefaultSpatialPolicy`, data) and the checker that evaluates a
 * requirement for an actor against the physical state (`SpatialChecker`).
 *
 * | clinical action | requirement |
 * |---|---|
 * | `ask_patient` (and the companion) | `near-patient` 3 m + line of sight |
 * | `examine` | `at-patient` 1.5 m; a finding needing capabilities beyond the personal kit: `bedside-provider` (those capabilities at the bedside + actor within 1.5 m of the patient) |
 * | `check_vitals` | `any-of`: `near-patient` 6 m + line of sight (monitor screen / bedside obs) · `at-provider` `records` (the chart) |
 * | `order_test`, `read_result` | no capability: anywhere · personal kit only: `at-patient` 1.5 m · only `BEDSIDE_CAPABILITIES`: `any-of` `bedside-provider` (device at the bedside + actor at the patient) · `at-provider` with `fixedOnly` (a fixed station or request terminal providing them: the radiology console for an ultrasound, the triage peak-flow station) · otherwise `at-provider` (a workstation/device/monitor providing every required capability, within its reach, line of sight) |
 * | `intervene` kind `consult` / `disposition` | anywhere (phone/pager) |
 * | `intervene` other kinds | no capability beyond the personal kit: `at-patient` 1.5 m · otherwise `bedside-provider` for them |
 * | `consult`, `delegate_task`, cognitive tools (`answer_decision`, `update_workup`, `wait`, `set_phase`, `finish_case`, `list_options`, `case_status`) | anywhere |
 * | unresolved items (a free-text query the tool will resolve or refuse) | `ask` / `examine`: as above without capabilities; order/read/intervene: anywhere |
 *
 * Measuring (shared with the action bus, `WorldLocator`): ranges from the
 * actor to the target's *current* footprint, same level, never below
 * `MIN_RANGE` (0.88 m); line of sight at eye height (no field of view —
 * the actor can turn). Providers of `at-provider`: equipment of interaction
 * kind workstation / device / monitor whose capabilities ⊇ the requirement
 * (stations.ts `providersOf`), in service, within their reach (moved carts
 * where they stand now; a carried item is in reach). `bedside-provider`:
 * each capability (personal kit excluded) provided by some in-service
 * placement of any kind at the bedside — within `BEDSIDE_RADIUS` (6 m) of
 * the slot point or in the slot's room (stations.ts `atBedside` /
 * `bedsideCaps`).
 *
 * Refusals (`SPATIAL_REQUIREMENT_UNMET`) carry a reason, a localised
 * message, details and a hint: an `interact` goal on the patient or the
 * nearest provider by walking distance (the flood of `Reachability`; on
 * another level or unreachable: by straight-line distance — navigating
 * then explains why); for a bedside capability that is elsewhere, the
 * nearest portable provider to fetch (`move_to` it to the patient), or null
 * when none can be brought; null when nothing in the facility provides it.
 * `any-of` reports the option whose hint is nearest, preferring hints a
 * single navigation fixes over fetching a cart.
 */
import { PERSONAL_KIT, type CaseDefinition } from "@clinicalcraft/core";
import { RANGES, type ActorState, type ClinicalIntent, type EncounterBinding, type EntityId, type NavGoal, type SpatialCheck, type SpatialErrorCode, type SpatialPolicy, type SpatialRequirement } from "./contracts.js";
import { listText, metres, worldMessage } from "./i18n.js";
import type { Placed, StateView, WorldLocator } from "./locate.js";
import { MIN_RANGE } from "./nav/backend.js";
import type { Reachability } from "./reach.js";

/**
 * Capabilities of tests done on the patient with a device at the bedside
 * (order_test / read_result → bedside-provider, or a fixed station).
 */
export const BEDSIDE_CAPABILITIES: readonly string[] = ["ecg-12lead", "point-of-care", "ultrasound", "echocardiography", "peak-flow", "scale", "cardiac-monitor", "capnography", "oxygen", "suction"];

/** Intervention kinds done by phone or pager, from anywhere. */
export const REMOTE_INTERVENTION_KINDS: readonly string[] = ["consult", "disposition"];

/** The chart: `check_vitals` at a station with this capability. */
export const CHART_CAPABILITY = "records";

/** Ranges of the default policy (m, from the target's footprint). */
export const POLICY_RANGES = { talk: RANGES.talk, contact: RANGES.contact, screen: RANGES.screen } as const;

/** Interaction kinds that can be an `at-provider` (stations.ts `providersOf`). */
export const PROVIDER_KINDS: readonly string[] = ["workstation", "device", "monitor"];

const kit = new Set<string>(PERSONAL_KIT);
const ANYWHERE: SpatialRequirement = { kind: "anywhere" };

/** The default policy (EMBODIED §6, module table). */
export class DefaultSpatialPolicy implements SpatialPolicy {
  readonly bedside: ReadonlySet<string>;

  constructor(opts: { bedsideCapabilities?: readonly string[] } = {}) {
    this.bedside = new Set(opts.bedsideCapabilities ?? BEDSIDE_CAPABILITIES);
  }

  requirementFor(intent: ClinicalIntent, binding: EncounterBinding): SpatialRequirement {
    const c: CaseDefinition = binding.caseDef;
    const atPatient: SpatialRequirement = { kind: "at-patient", range: POLICY_RANGES.contact };
    switch (intent.kind) {
      case "ask":
        return { kind: "near-patient", range: POLICY_RANGES.talk, lineOfSight: true };
      case "examine": {
        const f = intent.findingId ? c.exam.find((x) => x.id === intent.findingId) : undefined;
        const caps = (f?.requires ?? []).filter((r) => !kit.has(r));
        return caps.length ? { kind: "bedside-provider", capabilities: caps, patientRange: POLICY_RANGES.contact } : atPatient;
      }
      case "vitals":
        return { kind: "any-of", options: [{ kind: "near-patient", range: POLICY_RANGES.screen, lineOfSight: true }, { kind: "at-provider", capabilities: [CHART_CAPABILITY] }] };
      case "order":
      case "read": {
        const inv = intent.investigationId ? c.investigations.find((x) => x.id === intent.investigationId) : undefined;
        if (!inv || inv.requires.length === 0) return ANYWHERE;
        const caps = inv.requires.filter((r) => !kit.has(r));
        if (!caps.length) return atPatient;
        if (caps.every((r) => this.bedside.has(r))) {
          return { kind: "any-of", options: [{ kind: "bedside-provider", capabilities: caps, patientRange: POLICY_RANGES.contact }, { kind: "at-provider", capabilities: caps, fixedOnly: true }] };
        }
        return { kind: "at-provider", capabilities: caps };
      }
      case "intervene": {
        const iv = intent.interventionId ? c.interventions.find((x) => x.id === intent.interventionId) : undefined;
        if (!iv || REMOTE_INTERVENTION_KINDS.includes(iv.kind)) return ANYWHERE;
        const caps = iv.requires.filter((r) => !kit.has(r));
        return caps.length ? { kind: "bedside-provider", capabilities: caps, patientRange: POLICY_RANGES.contact } : atPatient;
      }
      default:
        return ANYWHERE;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Evaluation                                                          */
/* ------------------------------------------------------------------ */

/** A place that fixes a failure: go there (`interact`), or fetch it (a cart to wheel to the patient). */
interface Candidate {
  goal: NavGoal;
  target: Placed;
  fetch: boolean;
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
}

const round2 = (v: number) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : null);

/** Evaluates spatial requirements for actors (see module docs). */
export class SpatialChecker {
  constructor(private readonly d: SpatialCheckerDeps) {}

  /** `checkSpatial` of the runtime: the policy's requirement for the intent, evaluated for the actor. */
  check(actorId: string, intent: ClinicalIntent, opts: { recheck?: boolean } = {}): SpatialCheck {
    const requirement = this.d.policy.requirementFor(intent, this.d.binding);
    const code: SpatialErrorCode = opts.recheck ? "SPATIAL_PRECONDITION_CHANGED" : "SPATIAL_REQUIREMENT_UNMET";
    const actor = this.d.state.actor(actorId);
    if (!actor) return { ok: false, code, requirement, reason: "unknown-actor", message: worldMessage("UNKNOWN_ACTOR", this.d.locale, { actor: actorId }), hint: null };
    return this.evaluate(actor, requirement, code);
  }

  /** Evaluate a requirement for an actor. */
  evaluate(actor: ActorState, requirement: SpatialRequirement, code: SpatialErrorCode = "SPATIAL_REQUIREMENT_UNMET"): SpatialCheck {
    const outcome = this.outcome(actor, requirement);
    if (outcome.ok) return { ok: true, requirement, satisfiedBy: outcome.satisfiedBy };
    const { failure, chosen } = this.choose(actor, outcome.failures);
    const L = this.d.locale;
    const hint = chosen ? { goal: chosen.goal, label: chosen.fetch ? worldMessage("hint.fetch", L, { provider: this.d.locator.name(chosen.target.id), patient: this.patientName() }) : chosen.target.kind === "patient" ? worldMessage("hint.patient", L, { patient: this.patientName() }) : worldMessage("hint.provider", L, { provider: this.d.locator.name(chosen.target.id) }) } : null;
    return { ok: false, code, requirement, reason: failure.reason, message: failure.message(chosen), hint, details: failure.details };
  }

  private patientName(): string {
    return this.d.locator.patientId ? this.d.locator.name(this.d.locator.patientId) : "—";
  }

  private outcome(actor: ActorState, r: SpatialRequirement): Outcome {
    switch (r.kind) {
      case "anywhere":
        return { ok: true, satisfiedBy: [] };
      case "near-patient":
        return this.patientOutcome(actor, r.range, r.lineOfSight, "not-near-patient");
      case "at-patient":
        return this.patientOutcome(actor, r.range, true, "not-at-patient");
      case "at-provider":
        return this.providerOutcome(actor, r.capabilities, r.range, !!r.fixedOnly);
      case "bedside-provider":
        return this.bedsideOutcome(actor, r.capabilities, r.patientRange);
      case "any-of": {
        const failures: Failure[] = [];
        for (const option of r.options) {
          const o = this.outcome(actor, option);
          if (o.ok) return o;
          failures.push(...o.failures);
        }
        return { ok: false, failures };
      }
    }
  }

  private noPatient(): Outcome {
    return { ok: false, failures: [{ reason: "no-patient", details: {}, candidates: [], message: () => worldMessage("spatial.no-patient", this.d.locale) }] };
  }

  private patientOutcome(actor: ActorState, range: number, lineOfSight: boolean, farReason: string): Outcome {
    const loc = this.d.locator;
    const patient = loc.patient();
    if (!patient) return this.noPatient();
    const needed = Math.max(range, MIN_RANGE);
    const distance = loc.distance(actor.pose, patient);
    if (distance <= needed + 1e-6 && (!lineOfSight || loc.lineOfSight(actor.pose, patient))) return { ok: true, satisfiedBy: [patient.id] };
    const reason = distance <= needed + 1e-6 ? "patient-not-visible" : farReason;
    const vars = { patient: this.patientName(), range: metres(needed), distance: metres(distance) };
    return { ok: false, failures: [{ reason, details: { distance: round2(distance), range: needed }, candidates: [{ goal: { kind: "interact", id: patient.id }, target: patient, fetch: false }], message: () => worldMessage(`spatial.${reason}`, this.d.locale, vars) }] };
  }

  /** In-service equipment providing every capability (provider kinds; fixed only when asked). */
  private providers(caps: readonly string[], fixedOnly: boolean): Placed[] {
    const loc = this.d.locator;
    const out: Placed[] = [];
    for (const e of loc.registry.ofKind("equipment")) {
      if (!PROVIDER_KINDS.includes(e.interaction) || (fixedOnly && e.portable)) continue;
      const have = loc.capabilities(e.id);
      if (!caps.every((c) => have.includes(c))) continue;
      const p = loc.place(e.id);
      if (p) out.push(p);
    }
    return out;
  }

  private providerOutcome(actor: ActorState, caps: readonly string[], range: number | undefined, fixedOnly: boolean): Outcome {
    const loc = this.d.locator;
    const L = this.d.locale;
    const capsText = listText(caps, L);
    const providers = this.providers(caps, fixedOnly);
    if (!providers.length) return { ok: false, failures: [{ reason: "no-provider-in-facility", details: { capabilities: [...caps], fixedOnly }, candidates: [], message: () => worldMessage("spatial.no-provider-in-facility", L, { caps: capsText }) }] };
    for (const p of providers) {
      const needed = range !== undefined ? Math.max(range, MIN_RANGE) : loc.reach(p);
      if (loc.distance(actor.pose, p) <= needed + 1e-6 && loc.lineOfSight(actor.pose, p)) return { ok: true, satisfiedBy: [p.id] };
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

  private bedsideOutcome(actor: ActorState, caps: readonly string[], patientRange: number): Outcome {
    const loc = this.d.locator;
    const L = this.d.locale;
    const patient = loc.patient();
    if (!patient) return this.noPatient();
    const required = caps.filter((c) => !kit.has(c));
    const equipment = loc.registry.ofKind("equipment");
    const nowhere: string[] = [];
    const missing: string[] = [];
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
      if (here.length) used.add(here[0].id);
      else missing.push(cap);
    }
    if (nowhere.length) return { ok: false, failures: [{ reason: "no-provider-in-facility", details: { capabilities: required, missing: nowhere }, candidates: [], message: () => worldMessage("spatial.no-provider-in-facility", L, { caps: listText(nowhere, L) }) }] };
    if (missing.length) {
      const fetchable = (cap: string) => {
        const portable = providersOf.get(cap)!.filter((p) => p.entity?.portable && (!p.heldBy || p.heldBy === actor.id));
        const free = portable.filter((p) => {
          const holder = this.d.state.entity(p.id)?.reservedBy;
          return !holder || holder === actor.id;
        });
        return free.length ? free : portable;
      };
      const details = { capabilities: required, missing, providers: providersOf.get(missing[0])!.map((p) => p.id) };
      const reason = "provider-not-at-bedside";
      if (missing.some((cap) => fetchable(cap).length === 0)) return { ok: false, failures: [{ reason, details, candidates: [], message: () => worldMessage("spatial.provider-not-at-bedside-fixed", L, { caps: listText(missing, L) }) }] };
      // an item the actor carries is at the bedside as soon as the actor is: go to the patient
      const carried = fetchable(missing[0]).find((p) => p.heldBy === actor.id);
      const candidates: Candidate[] = carried ? [{ goal: { kind: "interact", id: patient.id }, target: patient, fetch: false }] : fetchable(missing[0]).map((p) => ({ goal: { kind: "interact", id: p.id }, target: p, fetch: true }));
      return {
        ok: false,
        failures: [{ reason, details, candidates, message: (chosen) => worldMessage("spatial.provider-not-at-bedside", L, { caps: listText(missing, L), provider: chosen ? loc.name(chosen.target.id) : "—", patient: this.patientName() }) }],
      };
    }
    const at = this.patientOutcome(actor, patientRange, true, "not-at-patient");
    return at.ok ? { ok: true, satisfiedBy: [patient.id, ...used] } : at;
  }

  /**
   * Pick the failure to report and its hint: candidates a single navigation
   * fixes first, then carts to fetch; nearest by walking distance, then by
   * straight-line distance (another level, unreachable), then id.
   */
  private choose(actor: ActorState, failures: Failure[]): { failure: Failure; chosen: Candidate | null } {
    for (const fetch of [false, true]) {
      let best: { failure: Failure; c: Candidate; key: [number, number, string] } | null = null;
      for (const failure of failures) {
        for (const c of failure.candidates) {
          if (c.fetch !== fetch) continue;
          const key = this.rank(actor, c.target);
          if (!best || key[0] < best.key[0] || (key[0] === best.key[0] && (key[1] < best.key[1] || (key[1] === best.key[1] && key[2] < best.key[2])))) best = { failure, c, key };
        }
      }
      if (best) return { failure: best.failure, chosen: best.c };
    }
    const informative = failures.find((f) => f.reason !== "no-provider-in-facility") ?? failures[0];
    return { failure: informative, chosen: null };
  }

  /** [tier, metres, id]: tier 0 = reachable on this level (walking metres), 1 = another level, 2 = unreachable (straight-line metres). */
  private rank(actor: ActorState, p: Placed): [number, number, string] {
    const path = this.d.reach.pathDistance(actor, p);
    const straight = Math.hypot(p.position.x - actor.pose.x, p.position.z - actor.pose.z);
    if (path !== null && Number.isFinite(path)) return [0, path, p.id];
    return [path === null ? 1 : 2, straight, p.id];
  }
}
