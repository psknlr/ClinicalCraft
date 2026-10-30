/**
 * The patient changes position when asked (EMBODIED §8.4): `reposition_patient {posture}` — "lie down on the
 * couch", "sit up for me", "could you stand up?" — from conversation range. Physical state only: the posture they
 * take is stored with the clinical posture it was asked over (`PatientPlaceState.asked`) and holds while clinical
 * state still gives that posture; a positioning intervention, a transport or a transfer replaces it. Clinical
 * positioning that scores (an authored "sit him upright") is the session's to map to its intervention first —
 * this operation never changes clinical state.
 *
 * What the patient can do where they are:
 * - nothing while walking with someone (ask them to wait first);
 * - sit or lie down only on something there to sit or lie on (their bed space's bed or couch, a bench, a chair);
 * - nothing on a place that forces a posture (a scanner table, a station, where a transport stopped), nor when
 *   they cannot respond;
 * - stand up only if they could walk (`walkProblem`: not lying by clinical state, not in distress).
 */
import type { ActorState, BodyPosture, EntityId, WorldActionRequest, WorldEvent } from "./contracts.js";
import { failed, type Outcome } from "./effects.js";
import { postureName, worldMessage } from "./i18n.js";
import type { TransportHost } from "./transport.js";

/** Postures a patient may be asked to take. */
export const POSTURES: readonly BodyPosture[] = ["standing", "sitting", "lying"];

const grow = (a: { minX: number; maxX: number; minZ: number; maxZ: number }, m: number) => ({ minX: a.minX - m, maxX: a.maxX + m, minZ: a.minZ - m, maxZ: a.maxZ + m });

/** Why the patient cannot take `posture` now (a localised sentence), or null. */
export function repositionProblem(host: Pick<TransportHost, "d">, posture: BodyPosture): string | null {
  const { patient: body, locale: L, locator } = host.d;
  if (!body.id) return worldMessage("pre.noPatient", L);
  const st = body.state()!;
  const name = locator.name(body.id);
  const by = body.escort(st);
  if (by) return worldMessage("pre.repositionWalking", L, { patient: name });
  if (body.posture(st) === posture) return null;
  if (posture !== "standing" && !st.support) return worldMessage("pre.noSupport", L, { patient: name });
  if (st.posture) return worldMessage("pre.repositionPlace", L, { patient: name, place: body.placeName() });
  if (!body.responsive()) return worldMessage("pre.cannotWalk.unresponsive", L, { patient: name });
  if (posture === "standing") {
    const problem = body.walkProblem(st);
    if (problem) return worldMessage(`pre.cannotStand.${problem}`, L, { patient: name });
  }
  return null;
}

/** `reposition_patient {posture}` (the spatial phase checked the actor is within conversation range). */
export function repositionPatient(host: TransportHost, request: WorldActionRequest, _actor: ActorState, patientId: EntityId): Outcome {
  const { patient: body, locale: L, locator, store } = host.d;
  const posture = request.parameters?.posture;
  if (typeof posture !== "string" || !(POSTURES as readonly string[]).includes(posture)) {
    return failed("INVALID_REQUEST", worldMessage("INVALID_REQUEST", L, { reason: worldMessage("pre.posture", L) }));
  }
  const want = posture as BodyPosture;
  const name = locator.name(patientId);
  const st = body.state()!;
  const now = body.posture(st);
  const problem = repositionProblem(host, want);
  if (problem) return failed("PRECONDITION_FAILED", problem);
  if (now === want) return { status: "completed", message: worldMessage("ok.alreadyPosture", L, { patient: name, posture: postureName(want, L) }), events: [] };
  const clinical = body.clinicalPostureOf(st);
  const { asked: _asked, ...rest } = st;
  void _asked;
  store.patchEntity(patientId, { patient: want === clinical ? rest : { ...rest, asked: { posture: want, over: clinical } } });
  // the body box follows (standing at the slot point blocks it; lying on the bed does not)
  const old = host.patientStamp.body;
  const fresh = body.body();
  for (const b of [old, fresh]) if (b) host.invalidate({ level: b.level, ...grow(b.area, 0.1) });
  host.patientStamp = { key: body.bodyKey(), posture: body.posture(), body: fresh };
  const events: WorldEvent[] = [host.emit({ type: "patient.posture", entityId: patientId, from: now, to: want })];
  return { status: "completed", message: worldMessage(`ok.reposition.${want}`, L, { patient: name }), events };
}
