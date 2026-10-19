/**
 * Where an operation with a clinical effect can be done (EMBODIED §6, C7).
 * Two placement rules meet: the operation's own (within `actorWithin` of the
 * device — else its reach — and/or `patientWithin` of the patient) and the
 * spatial policy's for its clinical act (e.g. at the patient). Hinting each
 * separately can alternate forever (the device's interaction point is too
 * far from the patient, the patient's too far from the device), so a
 * refusal hints a spot where BOTH hold:
 *
 * - such a spot exists → the operation's own refusal (`NOT_IN_RANGE` /
 *   `NOT_VISIBLE`) or the policy's (`SPATIAL_REQUIREMENT_UNMET`) with a
 *   `point` goal on it (the free cell nearest by walking);
 * - none exists (a cart parked across the room) → `PRECONDITION_FAILED`
 *   with a fetch hint: wheel the cart to the patient (`move_to`); a fixed
 *   device: the policy's own refusal when a walk lets the act be done
 *   without it (e.g. the sample at the patient), else `PRECONDITION_FAILED`
 *   without a hint (as for a handheld item lying elsewhere).
 *
 * A policy failure no walk fixes (a provider to fetch, a clinical
 * prerequisite, nothing in the facility) is left to the normal path.
 */
import type { OperationSpec } from "./behaviors.js";
import { selectClinical } from "./clinical.js";
import type { ActorState, EntityId, NavGoal, SpatialRequirement, WorldActionRequest } from "./contracts.js";
import { failed, type EffectsHost, type Outcome } from "./effects.js";
import { worldMessage } from "./i18n.js";
import { MIN_RANGE } from "./nav/backend.js";
import { cellPoint, distanceToArea } from "./raster.js";

/** Policy reasons a walk can fix (everything else is left to the operation's normal path). */
const POSITIONAL: ReadonlySet<string> = new Set(["not-near-patient", "not-at-patient", "patient-not-visible", "no-provider-in-reach", "monitor-not-in-view"]);

/** Candidate spots tried by planning before giving up on a hint. */
const PLAN_TRIES = 4;

/**
 * The placement refusal of a clinical operation (see the module docs), or
 * null when the actor may go on (both rules hold, or the policy's failure is
 * not about where the actor stands).
 */
export function clinicalPlacement(host: EffectsHost, request: WorldActionRequest, actor: ActorState, id: EntityId, o: OperationSpec): Outcome | null {
  const { rules, checker, locator, caseDef, locale: L } = host.d;
  const target = locator.name(id);
  const sel = selectClinical({ effect: o.clinical ?? { tool: "order_test", select: "param" }, toolByParam: o.toolByParam, caps: locator.capabilities(id), match: o.toolByParam ? "intersect" : "subset", parameters: request.parameters, caseDef, locale: L, target });
  if (!sel.ok) return null;
  const requirement = checker.requirement(sel.value.intent);
  const own = rules.spatial(id, o, actor);
  const policy = checker.evaluate(actor, requirement);
  if (!own && policy.ok) return null;
  if (!policy.ok && !POSITIONAL.has(policy.reason)) return null;
  const patient = locator.patientId ? locator.name(locator.patientId) : "—";
  const spot = jointSpot(host, actor, id, o, patientBound(requirement), (hypo) => checker.evaluate(hypo, requirement).ok);
  if (spot) {
    const hint = { goal: spot, label: worldMessage("hint.joint", L, { target, patient }) };
    if (own) return failed(own.code, own.message, { hint });
    return failed(policy.ok ? "SPATIAL_REQUIREMENT_UNMET" : policy.code, policy.ok ? "" : policy.message, { hint });
  }
  // no spot satisfies both: the device is too far from where the act must happen
  const place = locator.place(id);
  if (place?.entity?.portable === "cart" && !place.heldBy) {
    return failed("PRECONDITION_FAILED", worldMessage("pre.notOperableCart", L, { target, patient }), { hint: host.verifyHint(actor, { kind: "interact", id }, worldMessage("hint.fetch", L, { provider: target, patient })) ?? null });
  }
  // a fixed device: the act itself can still be done where the policy says (at the patient, with what is there)
  if (!policy.ok && policy.hint) return failed(policy.code, policy.message, { hint: policy.hint });
  if (place?.entity?.portable === "handheld" && !place.heldBy) return failed("PRECONDITION_FAILED", worldMessage("pre.notOperableHandheld", L, { target, patient }), { hint: null });
  return failed("PRECONDITION_FAILED", worldMessage("pre.notOperableFixed", L, { target, patient }), { hint: null });
}

/**
 * The farthest an actor can stand from the patient and still satisfy a
 * requirement (Infinity when some way of satisfying it does not involve the
 * patient): `any-of` the largest of its options, `all-of` the smallest.
 */
export function patientBound(r: SpatialRequirement): number {
  switch (r.kind) {
    case "near-patient":
    case "at-patient":
      return Math.max(r.range, MIN_RANGE);
    case "bedside-provider":
      return Math.max(r.patientRange, MIN_RANGE);
    case "any-of":
      return r.options.length ? Math.max(...r.options.map(patientBound)) : Infinity;
    case "all-of":
      return r.options.length ? Math.min(...r.options.map(patientBound)) : Infinity;
    default:
      return Infinity;
  }
}

/**
 * A free spot (navigation cell centre) where the operation's own placement
 * holds and `policyOk` too, nearest to the actor by walking (else straight
 * line), that the planner can reach; null when there is none.
 */
function jointSpot(host: EffectsHost, actor: ActorState, id: EntityId, o: OperationSpec, nearPatient: number, policyOk: (hypo: ActorState) => boolean): NavGoal | null {
  const { grids, locator, registry, rules, reach, backend } = host.d;
  const place = locator.place(id);
  if (!grids || !place) return null;
  const actorWithin = o.requires.find((p): p is { actorWithin: number } => "actorWithin" in p)?.actorWithin;
  const patientWithin = o.requires.find((p): p is { patientWithin: number } => "patientWithin" in p)?.patientWithin;
  // the band to search: around the device (its own range), or around the patient for an operation placed only by the patient
  const byPatient = actorWithin === undefined && patientWithin !== undefined;
  const anchor = byPatient ? locator.patient() : place;
  if (!anchor) return null;
  const band = Math.max(byPatient ? patientWithin! : (actorWithin ?? locator.reach(place)), MIN_RANGE) + 0.05;
  const g = grids.grid(anchor.level);
  if (!g) return null;
  const mask = grids.compose(anchor.level, { role: actor.role, allowZones: grids.zonesAt(actor.pose.level, actor.pose.x, actor.pose.z) });
  if (!mask) return null;
  const a = anchor.area;
  const x0 = Math.max(0, Math.floor((a.minX - band - g.minX) / g.cell)), x1 = Math.min(g.cols - 1, Math.floor((a.maxX + band - g.minX) / g.cell));
  const z0 = Math.max(0, Math.floor((a.minZ - band - g.minZ) / g.cell)), z1 = Math.min(g.rows - 1, Math.floor((a.maxZ + band - g.minZ) / g.cell));
  const walk = reach.walkField(actor);
  const patient = locator.patient();
  // the policy cannot hold farther than `nearPatient` from the patient: skip those cells before evaluating it
  const tooFar = (x: number, z: number) => Number.isFinite(nearPatient) && (!patient || patient.level !== anchor.level || distanceToArea(x, z, patient.area) > nearPatient + 1e-6);
  const found: { i: number; d: number; x: number; z: number }[] = [];
  for (let iz = z0; iz <= z1; iz++)
    for (let ix = x0; ix <= x1; ix++) {
      const i = iz * g.cols + ix;
      if (mask[i]) continue;
      const c = cellPoint(g, i);
      const dist = distanceToArea(c.x, c.z, a);
      if (dist > band || dist === 0 || tooFar(c.x, c.z)) continue;
      const hypo: ActorState = { ...actor, pose: { ...actor.pose, x: c.x, z: c.z, y: g.elevation, level: anchor.level }, room: registry.roomAt(anchor.level, c.x, c.z) };
      if (rules.spatial(id, o, hypo) || !policyOk(hypo)) continue;
      const d = walk && walk.level === anchor.level && Number.isFinite(walk.field[i]) ? walk.field[i] * g.cell : 1e6 + Math.hypot(c.x - actor.pose.x, c.z - actor.pose.z);
      found.push({ i, d, x: c.x, z: c.z });
    }
  found.sort((p, q) => p.d - q.d || p.i - q.i);
  for (const f of found.slice(0, PLAN_TRIES)) {
    const goal: NavGoal = { kind: "point", x: f.x, z: f.z, level: anchor.level };
    if (backend.plan({ actorId: actor.id, from: actor.pose, goal, role: actor.role }).ok) return goal;
  }
  return null;
}
