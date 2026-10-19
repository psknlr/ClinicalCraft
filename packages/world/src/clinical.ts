/**
 * The clinical side of device operations (EMBODIED R3): which case item an
 * operation's `clinical` effect acts on, the clinical tool call that carries
 * it out through the session's tool path (`ClinicalPort.invoke`), and the
 * `ClinicalIntent` the spatial policy checks first.
 *
 * Selection (`ClinicalEffect.select`):
 * - `param`: the operation parameter `investigation` / `intervention` /
 *   `finding` (also `investigation_id`, `intervention_id`, `finding_id`). At
 *   a workstation the station must provide every capability the
 *   investigation requires (stations.ts `investigationsAt`); a device's
 *   `use` needs the item's requires to intersect its capabilities
 *   (stations.ts `deviceActions`).
 * - `capability`: the first case item (in case order) with requirements
 *   that this device provides entirely — e.g. the ECG cart's `record` → the
 *   case's 12-lead ECG; a parameter may pick another such item.
 * - `monitoring`: the case's monitoring intervention — the first
 *   `intervened` id of `physiology.monitor.attachedWhen` that is a
 *   monitoring intervention, else the first monitoring intervention whose
 *   requires this device provides, else the first monitoring intervention.
 *
 * Tool arguments use the agent tools' names: `order_test` /
 * `read_result {investigation_id, phase?}`, `intervene {intervention_id}`,
 * `examine {finding_id}`, `check_vitals {}`.
 */
import { t, type CaseDefinition, type ClinicalEffect, type Condition } from "@clinicalcraft/core";
import type { ClinicalIntent, WorldErrorCode } from "./contracts.js";
import { listText, worldMessage } from "./i18n.js";

/** The tool call an operation's clinical effect makes. */
export interface ClinicalSelection {
  tool: ClinicalEffect["tool"];
  args: Record<string, unknown>;
  intent: ClinicalIntent;
  /** Selected case item id (null for check_vitals). */
  itemId: string | null;
  /** Localised item name (messages). */
  itemName: string;
}

export type SelectionResult = { ok: true; value: ClinicalSelection } | { ok: false; code: WorldErrorCode; message: string; intent?: ClinicalIntent };

type ItemKind = "investigation" | "intervention" | "finding";

const PARAM_KEYS: Record<ItemKind, string[]> = {
  investigation: ["investigation", "investigation_id", "investigationId"],
  intervention: ["intervention", "intervention_id", "interventionId"],
  finding: ["finding", "finding_id", "findingId"],
};

/** A string parameter by any of its accepted names. */
export function paramOf(parameters: Record<string, unknown> | undefined, kind: ItemKind): string | null {
  for (const key of PARAM_KEYS[kind]) {
    const v = parameters?.[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

const itemKindOf = (tool: ClinicalEffect["tool"]): ItemKind | null => (tool === "order_test" || tool === "read_result" ? "investigation" : tool === "intervene" ? "intervention" : tool === "examine" ? "finding" : null);

interface Item {
  id: string;
  name: string;
  requires: string[];
}

function items(c: CaseDefinition, kind: ItemKind, locale: string): Item[] {
  if (kind === "investigation") return c.investigations.map((i) => ({ id: i.id, name: t(i.name, locale), requires: i.requires }));
  if (kind === "intervention") return c.interventions.map((i) => ({ id: i.id, name: t(i.name, locale), requires: i.requires }));
  return c.exam.map((f) => ({ id: f.id, name: t(f.maneuver, locale), requires: f.requires }));
}

/** `intervened` ids of a condition outside `not`, in order. */
function intervenedIds(cond: Condition | undefined, out: string[] = []): string[] {
  if (!cond) return out;
  if ("all" in cond) cond.all.forEach((x) => intervenedIds(x, out));
  else if ("any" in cond) cond.any.forEach((x) => intervenedIds(x, out));
  else if ("intervened" in cond) out.push(cond.intervened);
  return out;
}

/** The case's monitoring intervention for a device with these capabilities (see module docs), or null. */
export function monitoringIntervention(c: CaseDefinition, caps: readonly string[]): string | null {
  const monitoring = c.interventions.filter((i) => i.kind === "monitoring");
  for (const id of intervenedIds(c.physiology?.monitor?.attachedWhen)) if (monitoring.some((i) => i.id === id)) return id;
  return monitoring.find((i) => i.requires.length > 0 && i.requires.every((r) => caps.includes(r)))?.id ?? monitoring[0]?.id ?? null;
}

/** The clinical intent of a tool call on a case item (what `checkSpatial` evaluates). */
export function intentFor(tool: ClinicalEffect["tool"], itemId: string | null): ClinicalIntent {
  switch (tool) {
    case "order_test":
      return itemId ? { tool, kind: "order", investigationId: itemId } : { tool, kind: "order" };
    case "read_result":
      return itemId ? { tool, kind: "read", investigationId: itemId } : { tool, kind: "read" };
    case "intervene":
      return itemId ? { tool, kind: "intervene", interventionId: itemId } : { tool, kind: "intervene" };
    case "examine":
      return itemId ? { tool, kind: "examine", findingId: itemId } : { tool, kind: "examine" };
    default:
      return { tool, kind: "vitals" };
  }
}

function argsFor(tool: ClinicalEffect["tool"], itemId: string | null, parameters: Record<string, unknown> | undefined): Record<string, unknown> {
  switch (tool) {
    case "order_test":
      return { investigation_id: itemId };
    case "read_result": {
      const phase = typeof parameters?.phase === "string" && parameters.phase ? parameters.phase : undefined;
      return phase ? { investigation_id: itemId, phase } : { investigation_id: itemId };
    }
    case "intervene":
      return { intervention_id: itemId };
    case "examine":
      return { finding_id: itemId };
    default:
      return {};
  }
}

/**
 * Select the case item and the tool call for an operation's clinical effect.
 * `match`: "subset" (a workstation: requires ⊆ caps), "intersect" (a
 * device's `use`), "provides" (capability selection: non-empty requires ⊆ caps).
 */
export function selectClinical(opts: {
  effect: ClinicalEffect;
  /** `use`: the tool follows the parameter given. */
  toolByParam?: boolean;
  caps: readonly string[];
  match: "subset" | "intersect";
  parameters?: Record<string, unknown>;
  caseDef: CaseDefinition;
  locale: string;
  /** Localised device name (messages). */
  target: string;
}): SelectionResult {
  const { caseDef: c, locale: L, caps, parameters, target } = opts;
  let tool = opts.effect.tool;
  if (opts.toolByParam) {
    if (paramOf(parameters, "investigation")) tool = "order_test";
    else if (paramOf(parameters, "intervention")) tool = "intervene";
    else return { ok: false, code: "INVALID_REQUEST", message: worldMessage("INVALID_REQUEST", L, { reason: worldMessage("pre.missingParam", L, { param: "investigation | intervention" }) }) };
  }
  const kind = itemKindOf(tool);
  if (!kind) return { ok: true, value: { tool, args: {}, intent: intentFor(tool, null), itemId: null, itemName: "" } };
  const all = items(c, kind, L);
  const wanted = paramOf(parameters, kind);
  const done = (item: Item): SelectionResult => ({ ok: true, value: { tool, args: argsFor(tool, item.id, parameters), intent: intentFor(tool, item.id), itemId: item.id, itemName: item.name } });
  const unknown = (id: string): SelectionResult => ({ ok: false, code: "INVALID_REQUEST", message: worldMessage("INVALID_REQUEST", L, { reason: worldMessage("pre.unknownItem", L, { item: id }) }) });
  const provides = (i: Item) => i.requires.length > 0 && i.requires.every((r) => caps.includes(r));

  if (opts.effect.select === "monitoring" && kind === "intervention") {
    const monitoring = c.interventions.filter((i) => i.kind === "monitoring").map((i) => i.id);
    const id = wanted ?? monitoringIntervention(c, caps);
    if (!id) return { ok: false, code: "PRECONDITION_FAILED", message: worldMessage("pre.noItem", L, { target }) };
    const item = all.find((i) => i.id === id);
    if (!item) return unknown(id);
    if (!monitoring.includes(id)) return { ok: false, code: "PRECONDITION_FAILED", message: worldMessage("pre.cannotProvide", L, { target, item: item.name, caps: listText(item.requires, L) || "—" }) };
    return done(item);
  }
  if (opts.effect.select === "capability" && !opts.toolByParam) {
    const candidates = all.filter(provides);
    if (wanted) {
      const item = all.find((i) => i.id === wanted);
      if (!item) return unknown(wanted);
      if (!candidates.includes(item)) return { ok: false, code: "PRECONDITION_FAILED", message: worldMessage("pre.cannotProvide", L, { target, item: item.name, caps: listText(item.requires, L) || "—" }), intent: intentFor(tool, item.id) };
      return done(item);
    }
    return candidates[0] ? done(candidates[0]) : { ok: false, code: "PRECONDITION_FAILED", message: worldMessage("pre.noItem", L, { target }) };
  }
  // parameter selection
  if (!wanted) return { ok: false, code: "INVALID_REQUEST", message: worldMessage("INVALID_REQUEST", L, { reason: worldMessage("pre.missingParam", L, { param: kind }) }) };
  const item = all.find((i) => i.id === wanted);
  if (!item) return unknown(wanted);
  const fits = opts.match === "subset" ? item.requires.every((r) => caps.includes(r)) : item.requires.some((r) => caps.includes(r));
  if (!fits) return { ok: false, code: "PRECONDITION_FAILED", message: worldMessage("pre.cannotProvide", L, { target, item: item.name, caps: listText(item.requires, L) || "—" }), intent: intentFor(tool, item.id) };
  return done(item);
}
