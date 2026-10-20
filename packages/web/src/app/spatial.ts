/**
 * Spatial rules of the web UI in embodied mode (docs/EMBODIED.md §6) — pure
 * helpers, no DOM. The world model is the authority (the session's spatial
 * gate refuses what the body cannot do from where it stands; what counts as
 * at the bedside is `WorldRuntime.atBedside` / `bedsideProviders`, never a
 * rule of the web's own); the UI only decides how to help the human: a short
 * animated step when they stand just a little too far (within the 5.5 m aim
 * reach), otherwise the localised refusal with "Go there".
 */
import type { ActionHint, NavGoal, NavPlan, SpatialCheck, WorldActionResult, WorldStateSnapshot } from "@clinicalcraft/world";

/** How far (m of walking) the UI may step the avatar by itself before retrying a refused action: the aim reach. */
export const AUTO_APPROACH_M = 5.5;

/** Spatial-check reasons that walking a few steps fixes (no cart to fetch, nothing missing). */
export const RANGE_REASONS: ReadonlySet<string> = new Set(["not-near-patient", "not-at-patient", "patient-not-visible", "no-provider-in-reach"]);

/** World action error codes that walking a few steps fixes. */
export const RANGE_CODES: ReadonlySet<string> = new Set(["NOT_IN_RANGE", "NOT_VISIBLE", "SPATIAL_REQUIREMENT_UNMET"]);

/** What to do about a refusal: walk a little and retry once, or show it with "Go there" (`goal` null: nowhere to go). */
export type ApproachDecision = { kind: "approach"; goal: NavGoal } | { kind: "refuse"; goal: NavGoal | null; label: string | null };

/**
 * The decision for a refused action: an auto-approach when the refusal is
 * only about distance (`rangeOnly`) and the walk the world plans to the
 * hint is at most `AUTO_APPROACH_M` long; otherwise the refusal with its
 * hint (when there is one).
 */
export function approachDecision(hint: { goal: NavGoal; label: string } | null | undefined, rangeOnly: boolean, plan: NavPlan | null): ApproachDecision {
  if (!hint) return { kind: "refuse", goal: null, label: null };
  if (rangeOnly && plan?.ok && plan.length <= AUTO_APPROACH_M) return { kind: "approach", goal: hint.goal };
  return { kind: "refuse", goal: hint.goal, label: hint.label };
}

/** Is a failed spatial check only about where the body stands? */
export function checkIsRange(check: Extract<SpatialCheck, { ok: false }>): boolean {
  return RANGE_REASONS.has(check.reason);
}

/** Is a failed world action only about where the body stands? */
export function resultIsRange(result: WorldActionResult): boolean {
  return result.status === "failed" && !!result.errorCode && RANGE_CODES.has(result.errorCode);
}

/** Spatial error codes of the session's gate (a learner's action refused for where the body stands). */
export const SPATIAL_CODES: ReadonlySet<string> = new Set(["SPATIAL_REQUIREMENT_UNMET", "SPATIAL_PRECONDITION_CHANGED"]);

/**
 * The learner-facing part of the session's refusal text: its first line ("Not here: …"). The next line
 * tells a model which tool call fixes it (`navigate_to {…}`); a human gets "Go there" instead.
 */
export function refusalLead(text: string): string {
  return (text.split("\n")[0] ?? text).trim();
}

/**
 * A spatial refusal carried by a command's output (`/vitals`, `/order` … run through the learner's
 * gated tool path: `command_output.data = { ok, data: { code, message, hint } }`), else null.
 */
export function commandRefusal(data: unknown): { code: string; message: string; hint: { goal: NavGoal; label: string; then?: ActionHint["then"] } | null } | null {
  const inner = isObj(data) && isObj(data.data) ? data.data : null;
  if (!inner || typeof inner.code !== "string" || !SPATIAL_CODES.has(inner.code)) return null;
  const then = isObj(inner.hint) && isObj(inner.hint.then) && typeof inner.hint.then.operation === "string" && typeof inner.hint.then.targetId === "string" ? (inner.hint.then as unknown as ActionHint["then"]) : undefined;
  const hint = isObj(inner.hint) && isObj(inner.hint.goal) ? { goal: inner.hint.goal as unknown as NavGoal, label: typeof inner.hint.label === "string" ? inner.hint.label : "", ...(then ? { then } : {}) } : null;
  return { code: inner.code, message: typeof inner.message === "string" ? inner.message : "", hint };
}

/** Results kept in a saved world (the transcript keeps 16 too); paths and events dropped — resume needs states, not telemetry. */
export const SAVED_RESULTS = 16;

/** A world snapshot as the browser saves it (idempotency window trimmed like the session's transcript snapshot). */
export function trimWorldSnapshot(s: WorldStateSnapshot): WorldStateSnapshot {
  return {
    ...s,
    results: s.results.slice(-SAVED_RESULTS).map((r) => {
      const { navigation, ...rest } = r;
      return { ...rest, events: [], ...(navigation ? { navigation: { ...navigation, path: [] } } : {}) };
    }),
  };
}

const finite = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * A world snapshot from a save or an imported file, or null when it does not
 * look like one (`clinicalcraft-world@1`, actors with finite poses, bounded
 * sizes). The world model refuses a snapshot of another facility itself.
 */
export function validWorldSnapshot(v: unknown, facilityId?: string | null): WorldStateSnapshot | null {
  if (!isObj(v) || v.format !== "clinicalcraft-world@1" || typeof v.facilityId !== "string" || !finite(v.version)) return null;
  if (facilityId && v.facilityId !== facilityId) return null;
  if (!Array.isArray(v.actors) || v.actors.length > 500 || !isObj(v.entities) || Object.keys(v.entities).length > 20_000) return null;
  if (!Array.isArray(v.obstacles) || v.obstacles.length > 500 || !Array.isArray(v.results) || v.results.length > 1000) return null;
  for (const a of v.actors) {
    if (!isObj(a) || typeof a.id !== "string" || typeof a.role !== "string" || !isObj(a.pose)) return null;
    const p = a.pose;
    if (![p.x, p.y, p.z, p.yaw, p.pitch].every(finite) || typeof p.level !== "string") return null;
    if (!Array.isArray(a.seen) || !Array.isArray(a.holding)) return null;
  }
  for (const e of Object.values(v.entities)) if (!isObj(e) || !finite(e.version)) return null;
  for (const r of v.results) if (!isObj(r) || typeof r.actionId !== "string") return null;
  return v as unknown as WorldStateSnapshot;
}

/** Where an entity stands now in a world snapshot (moved carts, carried items: their holder), else its registry spot. */
export function entitySpot(snapshot: Pick<WorldStateSnapshot, "entities" | "actors">, id: string, registry: { x: number; z: number; level: string } | null): { x: number; z: number; level: string } | null {
  const e = snapshot.entities[id];
  if (e?.heldBy) {
    const holder = snapshot.actors.find((a) => a.id === e.heldBy);
    return holder ? { x: holder.pose.x, z: holder.pose.z, level: holder.pose.level } : null;
  }
  if (e?.position) return { x: e.position.x, z: e.position.z, level: e.position.level };
  return registry;
}

/** Why the patient's monitor screen cannot be read (EMBODIED §6 `monitor-screen`). */
export type ScreenReason = "no-monitor" | "no-monitor-attached" | "monitor-not-in-view";

/** Whether the learner can read the patient's monitor screen now (`monitorId`: that monitor's entity id). */
export type ScreenState = { readable: true; reason: null; monitorId: string } | { readable: false; reason: ScreenReason; monitorId: string | null };

/**
 * The monitor panel and the HUD's vitals strip show the live screen (numbers,
 * waveforms, rhythm) only when the world's own `check_vitals` check holds
 * THROUGH THAT MONITOR'S SCREEN — `satisfiedBy` names it (the `monitor-screen`
 * option: in its room, within 6 m, line of sight; never through a window).
 * Vitals by hand at the patient or from the chart give numbers through the
 * tools, never the live screen. `attached`: the engine's `monitorAttached`.
 */
export function screenState(check: SpatialCheck | null, monitorId: string | null, attached: boolean): ScreenState {
  if (!monitorId) return { readable: false, reason: "no-monitor", monitorId: null };
  if (!attached || (check && !check.ok && check.reason === "no-monitor-attached")) return { readable: false, reason: "no-monitor-attached", monitorId };
  if (check?.ok && check.satisfiedBy.includes(monitorId)) return { readable: true, reason: null, monitorId };
  return { readable: false, reason: "monitor-not-in-view", monitorId };
}

/**
 * World and session texts as a person reads them: the operation ids they name for a model ("… to the patient
 * (move_to)", "（move_to）") are dropped — the "Go there" button does that part. Other parentheses stay.
 */
export function learnerText(text: string): string {
  return text.replace(/\s*[（(][a-z]+(?:_[a-z]+)+[）)]/g, "");
}
