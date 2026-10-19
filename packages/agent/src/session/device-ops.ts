/**
 * Device operations as an embodied agent plans them (docs/EMBODIED.md §8):
 * which operation of a device carries out a clinical tool call on a case
 * item (the world's own selection rules, `selectClinical`), and which
 * operations lead there from the device's current state (a breadth-first
 * search over the behaviour's state machine: the ECG cart's prepare →
 * connect → record, or reset first when a tracing was left on it).
 */
import type { CaseDefinition } from "@clinicalcraft/core";
import { behaviorOf, selectClinical, type BehaviorSpec, type EntityId, type OperationSpec, type WorldRuntime } from "@clinicalcraft/world";

/** A clinical operation of a device for one tool call. */
export interface DeviceRoute {
  entityId: EntityId;
  spec: BehaviorSpec;
  op: OperationSpec;
  parameters: Record<string, unknown>;
}

const PARAM: Record<string, string> = { order_test: "investigation", read_result: "investigation", intervene: "intervention", examine: "finding" };

/**
 * The operation of `entityId` whose clinical effect would run `tool` on
 * `itemId` (with `phase` for reads), or null. Mirrors the action bus: a
 * workstation's items must be covered by its capabilities, a device's
 * `use` needs them to intersect.
 */
export function clinicalOperation(world: WorldRuntime, entityId: EntityId, tool: string, itemId: string, caseDef: CaseDefinition, locale: string, phase?: string): DeviceRoute | null {
  const e = world.entity(entityId);
  if (!e || e.kind !== "equipment") return null;
  const spec = behaviorOf(e);
  const key = PARAM[tool];
  if (!key) return null;
  for (const op of spec.operations) {
    if (!op.clinical && !op.toolByParam) continue;
    const parameters: Record<string, unknown> = { [key]: itemId, ...(phase && tool === "read_result" ? { phase } : {}) };
    const sel = selectClinical({ effect: op.clinical ?? { tool: "order_test", select: "param" }, toolByParam: op.toolByParam, caps: e.capabilities, match: op.toolByParam ? "intersect" : "subset", parameters, caseDef, locale, target: entityId });
    if (sel.ok && sel.value.tool === tool && sel.value.itemId === itemId) return { entityId, spec, op, parameters };
  }
  return null;
}

/**
 * Operation ids leading from `state` to a state in which `goal` is offered,
 * through non-clinical operations (shortest first); [] when it is offered
 * now, null when it cannot be reached.
 */
export function operationPath(spec: BehaviorSpec, state: string | null, goal: OperationSpec): string[] | null {
  const offered = (s: string | null, o: OperationSpec) => o.from === "*" || (s !== null && o.from.includes(s));
  if (offered(state, goal)) return [];
  if (state === null) return null;
  const queue: { state: string; path: string[] }[] = [{ state, path: [] }];
  const seen = new Set([state]);
  while (queue.length) {
    const { state: s, path } = queue.shift()!;
    for (const o of spec.operations) {
      if (o.clinical || o.toolByParam || o.to === undefined || !offered(s, o) || seen.has(o.to)) continue;
      const next = [...path, o.id];
      if (offered(o.to, goal)) return next;
      seen.add(o.to);
      queue.push({ state: o.to, path: next });
    }
  }
  return null;
}

/** The operation that releases a device reservation in this state (e.g. the ECG cart's `reset`), or null. */
export function releaseOperation(spec: BehaviorSpec, state: string | null): OperationSpec | null {
  return spec.operations.find((o) => o.release && !o.clinical && (o.from === "*" || (state !== null && o.from.includes(state)))) ?? null;
}
