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
 *   investigation requires (stations.ts `investigationsAt`) — or be a
 *   records terminal: order entry for laboratory tests, the viewer of
 *   laboratory and bedside results (`orderEntry`); a device's `use` needs
 *   the item's requires to intersect its capabilities (stations.ts
 *   `deviceActions`).
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
import { capabilityLabels, t, type CaseDefinition, type ClinicalEffect, type Condition } from "@clinicalcraft/core";
import { BEDSIDE_CAPABILITIES, CHART_CAPABILITY, LAB_CAPABILITIES } from "./capabilities.js";
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
  /** An investigation that is a record review (`performedAt: "records"`): a records terminal retrieves it. */
  record?: true;
}

function items(c: CaseDefinition, kind: ItemKind, locale: string): Item[] {
  if (kind === "investigation") return c.investigations.map((i) => ({ id: i.id, name: t(i.name, locale), requires: i.requires, ...(i.performedAt === "records" ? { record: true as const } : {}) }));
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

/**
 * The case's IV-access procedure (EMBODIED §6: IV access is patient state):
 * the intervention with id `iv-access`, else a procedure requiring the
 * `iv-access` capability, else a cannulation procedure (by id); null when
 * the case has none.
 */
export function ivAccessIntervention(c: CaseDefinition): string | null {
  return (
    c.interventions.find((i) => i.id === "iv-access")?.id ??
    c.interventions.find((i) => i.kind === "procedure" && i.requires.includes("iv-access"))?.id ??
    c.interventions.find((i) => i.kind === "procedure" && /cannul|iv-access|venous-access/i.test(i.id))?.id ??
    null
  );
}

/**
 * Does the patient already have IV access when the case starts — a cannula
 * in situ (authored as `extensions.embodied.ivAccessInSitu: true`, e.g. a
 * post-operative ward patient)? Then IV drugs need no IV-access procedure
 * first (its intervention places a further line).
 */
export function ivAccessInSitu(c: CaseDefinition): boolean {
  const embodied = (c.extensions as Record<string, unknown> | undefined)?.embodied;
  return !!embodied && typeof embodied === "object" && (embodied as Record<string, unknown>).ivAccessInSitu === true;
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
 * A records terminal (`CHART_CAPABILITY`) is order entry and the result
 * viewer (EMBODIED §6): it orders laboratory investigations (the sample is
 * taken at the patient; the policy checks it) and shows laboratory and
 * bedside results — never a bedside test's order (that is done at the
 * patient with the device) — and it retrieves a record review
 * (`performedAt: "records"`), whatever its `requires` say.
 */
function orderEntry(tool: ClinicalEffect["tool"], requires: readonly string[], caps: readonly string[], record = false): boolean {
  if (!caps.includes(CHART_CAPABILITY)) return false;
  if (record) return tool === "order_test" || tool === "read_result";
  if (!requires.length) return false;
  if (tool === "order_test") return requires.every((r) => LAB_CAPABILITIES.includes(r));
  if (tool === "read_result") return requires.every((r) => LAB_CAPABILITIES.includes(r) || BEDSIDE_CAPABILITIES.includes(r));
  return false;
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
    if (!monitoring.includes(id)) return { ok: false, code: "PRECONDITION_FAILED", message: worldMessage("pre.cannotProvide", L, { target, item: item.name, caps: listText(capabilityLabels(item.requires, L), L) || "—" }) };
    return done(item);
  }
  if (opts.effect.select === "capability" && !opts.toolByParam) {
    const candidates = all.filter(provides);
    if (wanted) {
      const item = all.find((i) => i.id === wanted);
      if (!item) return unknown(wanted);
      if (!candidates.includes(item)) return { ok: false, code: "PRECONDITION_FAILED", message: worldMessage("pre.cannotProvide", L, { target, item: item.name, caps: listText(capabilityLabels(item.requires, L), L) || "—" }), intent: intentFor(tool, item.id) };
      return done(item);
    }
    return candidates[0] ? done(candidates[0]) : { ok: false, code: "PRECONDITION_FAILED", message: worldMessage("pre.noItem", L, { target }) };
  }
  // parameter selection
  if (!wanted) return { ok: false, code: "INVALID_REQUEST", message: worldMessage("INVALID_REQUEST", L, { reason: worldMessage("pre.missingParam", L, { param: kind }) }) };
  const item = all.find((i) => i.id === wanted);
  if (!item) return unknown(wanted);
  // a record review is retrieved at a records terminal, never with a device (`use`)
  const fits = opts.match === "subset" ? item.requires.every((r) => caps.includes(r)) || orderEntry(tool, item.requires, caps, item.record) : !item.record && item.requires.some((r) => caps.includes(r));
  if (!fits) return { ok: false, code: "PRECONDITION_FAILED", message: worldMessage("pre.cannotProvide", L, { target, item: item.name, caps: listText(capabilityLabels(item.requires, L), L) || "—" }), intent: intentFor(tool, item.id) };
  return done(item);
}
