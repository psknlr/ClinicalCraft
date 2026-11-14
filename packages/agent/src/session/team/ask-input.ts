/**
 * A `team ask`'s `field`, checked before anything is said (docs/PROTOCOL.md, the `team` op): what is asked of the
 * operative field and what each request needs — traction a `port`, the `structure` pulled and its `direction` (names in
 * the patient's terms; `force` gentle, firm or excessive, firm by default); letting go, at most a `port`; the camera, at
 * most its `port`; an aim a `region` (and a `zoom`); a zoom its `zoom` (wide or close); a pass an `instrument` of the
 * field. Whether the one asked can do it is theirs to say (a read-back, or a decline with the reason).
 */
import { DirectionNameSchema, IdSchema, InstrumentIdSchema, ZoomLevelSchema } from "@clinicalcraft/core";
import type { FieldAsk, FieldAskOp } from "./types.js";

/** Every request about the field a learner may make. */
export const FIELD_ASK_OPS: readonly FieldAskOp[] = ["traction", "release", "camera", "aim", "zoom", "pass"];

const FORCES = ["gentle", "firm", "excessive"] as const;

/** A well-formed request about the field, or why it is not one (English: the protocol's own words). */
export function parseFieldAsk(raw: unknown): FieldAsk | string {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "ask needs field {op, …}";
  const f = raw as Record<string, unknown>;
  const op = f.op as FieldAskOp;
  if (!FIELD_ASK_OPS.includes(op)) return `field.op must be one of ${FIELD_ASK_OPS.join(", ")}`;
  const id = (key: string): string | undefined | null => (f[key] === undefined ? undefined : IdSchema.safeParse(f[key]).success ? (f[key] as string) : null);
  const port = id("port");
  const structure = id("structure");
  const region = id("region");
  if (port === null || structure === null || region === null) return "field.port, field.structure and field.region are ids";
  const zoom = f.zoom === undefined ? undefined : ZoomLevelSchema.safeParse(f.zoom).success ? (f.zoom as FieldAsk["zoom"]) : null;
  if (zoom === null) return "field.zoom is wide or close";
  const ask: FieldAsk = { op, ...(port ? { port } : {}) };
  switch (op) {
    case "traction": {
      const direction = Array.isArray(f.direction) && f.direction.length > 0 && f.direction.every((d) => DirectionNameSchema.safeParse(d).success) ? (f.direction as FieldAsk["direction"]) : null;
      const force = f.force === undefined ? "firm" : FORCES.includes(f.force as (typeof FORCES)[number]) ? (f.force as FieldAsk["force"]) : null;
      if (!port || !structure || !direction || !force) return "traction needs field.port, field.structure and field.direction (cephalad, caudal, patient-left, patient-right, anterior, posterior); field.force gentle, firm or excessive";
      return { ...ask, structure, direction: [...direction!], force };
    }
    case "release":
    case "camera":
      return ask;
    case "aim":
      if (!region) return "aim needs field.region";
      return { ...ask, region, ...(zoom ? { zoom } : {}) };
    case "zoom":
      if (!zoom) return "zoom needs field.zoom (wide or close)";
      return { ...ask, zoom };
    case "pass": {
      if (!InstrumentIdSchema.safeParse(f.instrument).success) return `pass needs field.instrument (${InstrumentIdSchema.options.join(", ")})`;
      return { op, instrument: f.instrument as FieldAsk["instrument"] };
    }
  }
}
