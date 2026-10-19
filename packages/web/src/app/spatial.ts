/**
 * Spatial rules of the web UI in embodied mode (docs/EMBODIED.md §6) — pure
 * helpers, no DOM. The world model is the authority (the session's spatial
 * gate refuses what the body cannot do from where it stands); the UI only
 * decides how to help the human: a short animated step when they stand just
 * a little too far (within the 5.5 m aim reach), otherwise the localised
 * refusal with "Go there".
 */
import { BEDSIDE_RADIUS, DELIVERED_CAPABILITIES, type NavGoal, type NavPlan, type SpatialCheck, type WorldActionResult, type WorldStateSnapshot } from "@clinicalcraft/world";
import { PERSONAL_KIT, rectContains, type FacilityDefinition } from "@clinicalcraft/core";

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
export function commandRefusal(data: unknown): { code: string; message: string; hint: { goal: NavGoal; label: string } | null } | null {
  const inner = isObj(data) && isObj(data.data) ? data.data : null;
  if (!inner || typeof inner.code !== "string" || !SPATIAL_CODES.has(inner.code)) return null;
  const hint = isObj(inner.hint) && isObj(inner.hint.goal) ? { goal: inner.hint.goal as unknown as NavGoal, label: typeof inner.hint.label === "string" ? inner.hint.label : "" } : null;
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

/**
 * Capabilities at the patient's bedside as the world policy counts them
 * (EMBODIED §6): the personal kit, every in-service placement within the
 * bedside radius of the slot or in the slot's room — where it stands NOW (a
 * cart wheeled over counts) — and the delivered capabilities (pharmacy
 * drugs, blood products) any in-service placement of the facility provides.
 */
export function bedsideCapsNow(
  f: Pick<FacilityDefinition, "patientSlots" | "rooms">,
  slotId: string | null,
  equipment: readonly { id: string; capabilities: readonly string[]; x: number; z: number; level: string; room: string | null; available: boolean }[],
  slotLevel: string,
): Set<string> {
  const caps = new Set<string>(PERSONAL_KIT);
  const slot = f.patientSlots.find((s) => s.id === slotId);
  const room = slot ? f.rooms.find((r) => r.id === slot.room) : undefined;
  for (const e of equipment) {
    if (!e.available) continue;
    for (const c of e.capabilities) if (DELIVERED_CAPABILITIES.includes(c)) caps.add(c);
    if (!slot || e.level !== slotLevel) continue;
    const near = Math.hypot(e.x - slot.x, e.z - slot.z) <= BEDSIDE_RADIUS || (e.room !== null ? e.room === slot.room : !!room && rectContains(room.rect, e.x, e.z));
    if (near) for (const c of e.capabilities) caps.add(c);
  }
  return caps;
}
