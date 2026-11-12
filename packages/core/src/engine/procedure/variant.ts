/**
 * Anatomical variants (docs/PROCEDURE.md §9): a session's procedure is the base definition with the
 * variant chosen at `start` laid over it. Everything that reads the field — the reducer, conditions, the
 * operator's view — works on the resolved definition, so a variant changes consequences the same way the
 * base anatomy does. The variant itself is hidden state: the operator's vocabulary of names is the same
 * whichever variant is in force.
 */
import type { CaseDefinition } from "../../schema/case.js";
import { BASE_VARIANT, TUBULAR_KINDS, type ProcedureDefinition, type Region, type Structure } from "../../schema/procedure.js";
import type { SessionState } from "../../schema/session.js";

const resolved = new WeakMap<ProcedureDefinition, Map<string, ProcedureDefinition>>();
const baseOf = new WeakMap<ProcedureDefinition, ProcedureDefinition>();

/** Shallow merge that ignores absent patch fields. */
function patchRegion(region: Region, patch: Partial<Region>): Region {
  const out: Record<string, unknown> = { ...region };
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) out[k] = v;
  return out as Region;
}

/**
 * The definition with `variant` laid over it (the base for none or `reference`; an unknown id also gives
 * the base — `start` refuses unknown variants). Results are cached per definition and variant.
 */
export function resolveProcedure(def: ProcedureDefinition, variant?: string | null): ProcedureDefinition {
  if (!variant || variant === BASE_VARIANT) return def;
  const v = def.variants.find((x) => x.id === variant);
  if (!v) return def;
  let cache = resolved.get(def);
  if (!cache) resolved.set(def, (cache = new Map()));
  const hit = cache.get(variant);
  if (hit) return hit;
  const removed = new Set(v.remove);
  const anatomy: Structure[] = def.anatomy.filter((s) => !removed.has(s.id)).map((s) => v.anatomy.find((x) => x.id === s.id) ?? s);
  for (const s of v.anatomy) if (!anatomy.some((x) => x.id === s.id)) anatomy.push(s);
  const regions = def.regions.map((r) => {
    const patch = v.regions.find((p) => p.id === r.id);
    return patch ? patchRegion(r, patch) : r;
  });
  const out: ProcedureDefinition = { ...def, anatomy, regions, ...(v.stones !== undefined ? { stones: v.stones } : {}) };
  cache.set(variant, out);
  baseOf.set(out, def);
  return out;
}

/** The procedure of a session: the case's procedure with the session's variant, or undefined. */
export function procedureFor(c: Pick<CaseDefinition, "procedure">, s: Pick<SessionState, "variant">): ProcedureDefinition | undefined {
  return c.procedure ? resolveProcedure(c.procedure, s.variant) : undefined;
}

/** The base definition a resolved one came from (itself when it is the base). */
export function baseProcedure(def: ProcedureDefinition): ProcedureDefinition {
  return baseOf.get(def) ?? def;
}

/** Every structure the base or any variant has, in order of first appearance (the same list whichever variant is resolved). */
export function vocabularyStructures(def: ProcedureDefinition): Structure[] {
  const base = baseProcedure(def);
  const out: Structure[] = [...base.anatomy];
  for (const v of base.variants) for (const s of v.anatomy) if (!out.some((x) => x.id === s.id)) out.push(s);
  return out;
}

/**
 * The names an operator may give what they see (`identify … as`): every structure id of the base and of
 * every variant. The same list whichever variant is in force, so naming never reveals the anatomy.
 */
export function nameVocabulary(def: ProcedureDefinition): string[] {
  return vocabularyStructures(def).map((s) => s.id);
}

/** The duct and vessel names of the vocabulary (what the operator's view lists). */
export function tubeVocabulary(def: ProcedureDefinition): string[] {
  return vocabularyStructures(def)
    .filter((s) => TUBULAR_KINDS.includes(s.kind))
    .map((s) => s.id);
}
