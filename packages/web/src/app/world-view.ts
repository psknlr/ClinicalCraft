/**
 * What the panels and the HUD may show in embodied mode, asked of the world
 * model (docs/EMBODIED.md §6) — never a rule of the web's own:
 *
 *   patientMonitor  the world's patient monitor (the slot's linked one, else one at the bedside)
 *   bedsideCaps     the personal kit + the world's bedside providers + delivered capabilities
 *   screen          can the learner read that monitor's screen (the vitals check holds THROUGH it)?
 *   screenKey       the same for the HUD, cheap while the body walks
 *   verdict         an act from where the body stands: done here, a short step, or refused (reason, way)
 *
 * The world sees the avatar where the browser last reported it: `syncPose` is called first.
 */
import { actionIntent } from "@clinicalcraft/agent";
import { monitorAttached, PERSONAL_KIT, t, type CaseDefinition, type ClinicalAction, type FacilityDefinition, type SessionState } from "@clinicalcraft/core";
import { DELIVERED_CAPABILITIES, metres, POLICY_RANGES, PRIMARY_ACTOR, worldMessage, type ActionHint, type NavGoal, type NavPlan, type SpatialCheck, type WorldRuntime } from "@clinicalcraft/world";
import { approachDecision, checkIsRange, entitySpot, learnerText, screenState, type ScreenState } from "./spatial.js";

/**
 * What the world says about a learner's clinical act from where the body stands now (EMBODIED §6): done
 * here; done after a short step the UI takes by itself (≤ the 5.5 m aim reach); or refused — the world's
 * reason and words, the way there (`hint`, null when no walk fixes it) and, for a clinical prerequisite,
 * the intervention to do first.
 */
export type Verdict =
  | { kind: "ok" }
  | { kind: "step"; goal: NavGoal }
  | { kind: "refused"; reason: string; message: string; hint: ActionHint | null; prerequisite: string | null };

/** The patient's monitor screen for a panel: the world's verdict, and when it is out of view the world's words and a way there. */
export type ScreenView = ScreenState & { message: string | null; hint: ActionHint | null };

/** Beyond the screen range by more than this (m, from the monitor's centre: its footprint is smaller) the screen cannot be read. */
const SCREEN_MARGIN = 1.5;

/** The intervention a clinical prerequisite names (`details.prerequisite`), e.g. the IV access before an IV drug. */
export function prerequisiteOf(check: SpatialCheck): string | null {
  if (check.ok || check.reason !== "clinical-prerequisite") return null;
  const p = (check.details as { prerequisite?: { tool?: unknown; intervention_id?: unknown } } | undefined)?.prerequisite;
  return p?.tool === "intervene" && typeof p.intervention_id === "string" ? p.intervention_id : null;
}

export interface WorldViewOptions {
  /** The encounter's world model (stable handle), null when gone. */
  world(): WorldRuntime | null;
  facility: FacilityDefinition;
  caseDef: CaseDefinition;
  slotId: string | null;
  /** The engine's state (the monitor's attachment). */
  state(): SessionState;
  locale(): string;
  /** Hand the avatar's pose to the world first. */
  syncPose(): void;
}

export class WorldView {
  /** Plans of `verdict` for the pose and world version in `planKey`. */
  private readonly plans = new Map<string, NavPlan>();
  private planKey = "";
  /** The HUD's last screen check (`screenKey`). */
  private screenCache: { key: string; at: number; value: "readable" | ScreenState["reason"] } | null = null;

  constructor(private readonly o: WorldViewOptions) {}

  /**
   * The patient's monitor as the world has it (its `isPatientMonitor`): the slot's linked monitor, else a
   * monitor at the bedside by THE bedside rule (`WorldRuntime.atBedside` — a monitor-defibrillator wheeled
   * to the bench counts, one behind a wall never). Null: none.
   */
  patientMonitor(): string | null {
    const world = this.o.world();
    const slot = this.o.facility.patientSlots.find((s) => s.id === this.o.slotId);
    if (!world || !slot) return null;
    if (slot.monitor && world.entity(`eq:${slot.monitor}`)) return `eq:${slot.monitor}`;
    return world.entities().find((e) => e.kind === "equipment" && e.interaction === "monitor" && world.atBedside(e.id))?.id ?? null;
  }

  /**
   * Capabilities at the patient's bedside as the world counts them now (EMBODIED §6): the personal kit, those
   * of the in-service providers at the bedside (`WorldRuntime.bedsideProviders`, THE bedside rule — a cart
   * wheeled over counts, one wheeled away or behind a wall not) and the delivered ones (pharmacy drugs, blood
   * products) any in-service provider of the facility gives.
   */
  bedsideCaps(): Set<string> {
    const world = this.o.world();
    const caps = new Set<string>(PERSONAL_KIT);
    if (!world) return caps;
    const all = new Set<string>();
    const snap = world.snapshot();
    for (const e of world.entities()) {
      if (e.kind !== "equipment" || snap.entities[e.id]?.available === false) continue;
      for (const c of e.capabilities) all.add(c);
    }
    for (const c of all) {
      if (caps.has(c)) continue;
      if (DELIVERED_CAPABILITIES.includes(c) || world.bedsideProviders(c).length > 0) caps.add(c);
    }
    return caps;
  }

  /**
   * Can the learner read the patient's monitor screen from where the body stands (the monitor panel and the
   * HUD strip show the live screen only then)? The world's own `check_vitals` check, which must hold through
   * that monitor's screen (`satisfiedBy`); vitals by hand or from the chart are not the screen. Out of view:
   * the world's words for it and the way to the monitor (the world's own hint when it chose that one).
   */
  screen(): ScreenView {
    const world = this.o.world();
    const monitorId = this.patientMonitor();
    if (!world || !monitorId) return { ...screenState(null, null, false), message: null, hint: null };
    this.o.syncPose();
    const check = world.checkSpatial(PRIMARY_ACTOR, { tool: "check_vitals", kind: "vitals" });
    const st = screenState(check, monitorId, monitorAttached(this.o.caseDef, this.o.state()));
    if (st.reason !== "monitor-not-in-view") return { ...st, message: null, hint: null };
    if (!check.ok && check.reason === "monitor-not-in-view") return { ...st, message: learnerText(check.message), hint: check.hint };
    const L = this.o.locale();
    const e = world.entity(monitorId);
    const name = e ? t(e.name, L) : monitorId;
    return {
      ...st,
      message: worldMessage("spatial.monitor-not-in-view", L, { monitor: name, range: metres(POLICY_RANGES.screen) }),
      hint: { goal: { kind: "interact", id: monitorId }, label: worldMessage("hint.provider", L, { provider: name }) },
    };
  }

  /**
   * For the HUD's vitals strip (updated ~10 Hz while the body moves): "readable", or why not — the world's
   * check (`screen`), skipped where it cannot hold (nothing attached; another level, farther from the monitor
   * than its screen range plus a margin for its footprint, or outside the monitor's room) and reused for
   * 400 ms while the body moves: a failing check ranks its hints by walking distance (a reachability flood
   * per new cell, tens of ms), which must not run on every step.
   */
  screenKey(now: number = Date.now()): "readable" | ScreenState["reason"] {
    const world = this.o.world();
    const id = this.patientMonitor();
    if (!world || !id) return "no-monitor";
    if (!monitorAttached(this.o.caseDef, this.o.state())) return "no-monitor-attached";
    const actor = world.actor(PRIMARY_ACTOR);
    const pose = actor?.pose;
    const e = world.entity(id);
    const snap = world.snapshot();
    const spot = e ? entitySpot(snap, id, { x: e.position.x, z: e.position.z, level: e.level }) : null;
    if (pose && spot && (pose.level !== spot.level || Math.hypot(pose.x - spot.x, pose.z - spot.z) > POLICY_RANGES.screen + SCREEN_MARGIN)) return "monitor-not-in-view";
    // the screen is read from the monitor's own room (the rule's own condition): a monitor where it was placed has
    // its room in the registry — elsewhere (wheeled, carried) the world's check decides
    const moved = !!snap.entities[id]?.position || !!snap.entities[id]?.heldBy;
    if (actor && e && !moved && actor.room !== e.room) return "monitor-not-in-view";
    const key = pose ? `${pose.x.toFixed(2)},${pose.z.toFixed(2)},${pose.yaw.toFixed(2)},${pose.level}|${world.version}` : "";
    const last = this.screenCache;
    if (last && (last.key === key || now - last.at < 400)) return last.value;
    const s = this.screen();
    const value = s.readable ? "readable" : s.reason;
    this.screenCache = { key, at: now, value };
    return value;
  }

  /**
   * The world's verdict on a learner's clinical act from where the body stands now (see `Verdict`) — what a
   * panel shows before the learner clicks (the click itself goes through `EmbodiedLink.act`). Walks are
   * planned by the world; plans are reused while the body and the world stay as they are.
   */
  verdict(action: ClinicalAction): Verdict {
    const world = this.o.world();
    const intent = actionIntent(action);
    if (!world || !intent) return { kind: "ok" };
    this.o.syncPose();
    const check = world.checkSpatial(PRIMARY_ACTOR, intent);
    if (check.ok) return { kind: "ok" };
    const range = checkIsRange(check);
    const plan = check.hint && range ? this.planFor(world, check.hint.goal) : null;
    const decision = approachDecision(check.hint, range, plan);
    if (decision.kind === "approach") return { kind: "step", goal: decision.goal };
    return { kind: "refused", reason: check.reason, message: learnerText(check.message), hint: check.hint ? { ...check.hint, label: learnerText(check.hint.label) } : null, prerequisite: prerequisiteOf(check) };
  }

  /** The world's plan to a goal from the body's pose now (cached per pose and world version). */
  private planFor(world: WorldRuntime, goal: NavGoal): NavPlan | null {
    const pose = world.actor(PRIMARY_ACTOR)?.pose;
    if (!pose) return null;
    const key = `${pose.x.toFixed(2)},${pose.z.toFixed(2)},${pose.level}|${world.version}`;
    if (key !== this.planKey) {
      this.planKey = key;
      this.plans.clear();
    }
    const id = JSON.stringify(goal);
    let plan = this.plans.get(id);
    if (!plan) {
      plan = world.plan(PRIMARY_ACTOR, goal);
      this.plans.set(id, plan);
    }
    return plan;
  }
}
