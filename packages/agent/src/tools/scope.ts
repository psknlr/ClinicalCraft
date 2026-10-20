/**
 * Scope of practice (review S3 = R2 C2 = R3 G2; docs/EMBODIED.md §8): what a
 * body's role may do in the encounter, on top of the world's operation
 * classes (`ROLE_AUTHORITY`: a porter or a receptionist holds no clinical
 * class at all). Checked
 * - in the spatial gate's precheck, for every clinical tool call made with a
 *   body (`ctx.actorId`: a world operation's clinical effect, a skill step,
 *   a delegated step) — refused `NOT_AUTHORIZED` before the approval gate,
 *   so nobody is asked to approve what the body may not do;
 * - by `delegate_task` before the staff member takes a step (the task, and
 *   the item a `give_intervention` gives);
 * - by the bench authorisation audit, for the body the trace says acted.
 *
 * | role | delegable tasks | clinical tools with their body | interventions |
 * |---|---|---|---|
 * | clinician (the learner's avatar), attending | all | all | all |
 * | nurse | attach_monitor, record_ecg, obtain_iv_access, fetch_equipment, give_intervention | check_vitals, examine, order_test (bedside tests: ECG, point of care, peak flow), read_result, intervene | medication, fluid, oxygen, monitoring, positioning and the case's IV access — never airway/RSI, an arterial line or another procedure, a consult or a disposition |
 * | paramedic | as a nurse | as a nurse | as a nurse + airway |
 * | porter, receptionist | fetch_equipment | — (no clinical class) | — |
 * | lab-tech, pharmacist, radiologist, pathologist | fetch_equipment | check_vitals, read_result | — (no patient interventions) |
 *
 * Pure: the role, the case and the item — no world, no session.
 */
import { t, type CaseDefinition } from "@clinicalcraft/core";
import { ivAccessIntervention, roleName, ROLE_AUTHORITY, type ActorRole } from "@clinicalcraft/world";
import { rt, type RuntimeKey } from "../session/i18n.js";

type InterventionKind = CaseDefinition["interventions"][number]["kind"];

/** What one role may do (see the module table). */
export interface RoleScope {
  /** Delegation tasks the role may be handed (`delegate_task`). */
  readonly tasks: readonly string[];
  /** Clinical tools the role's body may be used for ("*": every one). */
  readonly tools: readonly string[] | "*";
  /** Intervention kinds the role may give ("*": every kind). */
  readonly interventionKinds: readonly InterventionKind[] | "*";
  /** The case's IV-access procedure, whatever its kind. */
  readonly ivAccess: boolean;
  /** Investigations the role may order: every one, or bedside tests only. */
  readonly investigations: "*" | "bedside";
}

const ALL_TASKS = ["attach_monitor", "record_ecg", "obtain_iv_access", "fetch_equipment", "give_intervention"] as const;
const FULL: RoleScope = { tasks: ALL_TASKS, tools: "*", interventionKinds: "*", ivAccess: true, investigations: "*" };
const NURSE: RoleScope = {
  tasks: ALL_TASKS,
  tools: ["check_vitals", "examine", "order_test", "read_result", "intervene"],
  interventionKinds: ["medication", "fluid", "oxygen", "monitoring", "positioning"],
  ivAccess: true,
  investigations: "bedside",
};
const FETCH_ONLY: RoleScope = { tasks: ["fetch_equipment"], tools: [], interventionKinds: [], ivAccess: false, investigations: "bedside" };
const SERVICE: RoleScope = { tasks: ["fetch_equipment"], tools: ["check_vitals", "read_result"], interventionKinds: [], ivAccess: false, investigations: "bedside" };

/** Role → scope of practice (see the module table). */
export const SCOPE_OF_PRACTICE: Readonly<Record<ActorRole, RoleScope>> = {
  clinician: FULL,
  attending: FULL,
  nurse: NURSE,
  paramedic: { ...NURSE, interventionKinds: [...(NURSE.interventionKinds as InterventionKind[]), "airway"] },
  porter: FETCH_ONLY,
  receptionist: FETCH_ONLY,
  "lab-tech": SERVICE,
  pharmacist: SERVICE,
  radiologist: SERVICE,
  pathologist: SERVICE,
};

/** Capabilities of tests done at the bedside with a device the nursing staff operate. */
const BEDSIDE_TEST_CAPABILITIES: readonly string[] = ["ecg-12lead", "point-of-care", "peak-flow"];

/** The scope of a role (an unknown role: nothing). */
export function scopeOf(role: string): RoleScope {
  return (SCOPE_OF_PRACTICE as Record<string, RoleScope>)[role] ?? { tasks: [], tools: [], interventionKinds: [], ivAccess: false, investigations: "bedside" };
}

/** A refusal: the role may not (code `NOT_AUTHORIZED`, a localised message naming the body). */
export interface ScopeRefusal {
  ok: false;
  code: "NOT_AUTHORIZED";
  reason: "no-clinical-authority" | "tool" | "intervention" | "investigation" | "task";
  message: string;
}
export type ScopeCheck = { ok: true } | ScopeRefusal;

/** Who acts, for messages: a name and the role ("Lin Xiao", "nurse"). */
export interface ScopeActor {
  role: string;
  /** Display name (falls back to the role). */
  name?: string;
}

const OK: ScopeCheck = { ok: true };

function refusal(locale: string, actor: ScopeActor, reason: ScopeRefusal["reason"], key: RuntimeKey, params: Record<string, string> = {}): ScopeRefusal {
  const role = roleName(actor.role, locale);
  return { ok: false, code: "NOT_AUTHORIZED", reason, message: rt(locale, key, { who: actor.name || role, role, ...params }) };
}

/** Localised intervention kinds ("medication, fluid…"). */
function kindsText(locale: string, kinds: readonly InterventionKind[], ivAccess: boolean): string {
  const names = kinds.map((k) => rt(locale, `scope.kind.${k}` as RuntimeKey));
  if (ivAccess) names.push(rt(locale, "scope.ivAccess"));
  return names.length ? names.join(locale.startsWith("zh") ? "、" : ", ") : "—";
}

/** May this role give this case's intervention? */
export function mayGive(role: string, caseDef: CaseDefinition, interventionId: string): boolean {
  const scope = scopeOf(role);
  const item = caseDef.interventions.find((i) => i.id === interventionId);
  if (!item) return true; // unknown: the tool refuses it
  if (scope.ivAccess && ivAccessIntervention(caseDef) === interventionId) return true;
  return scope.interventionKinds === "*" || scope.interventionKinds.includes(item.kind);
}

/** May this role order this case's investigation? */
export function mayOrder(role: string, caseDef: CaseDefinition, investigationId: string): boolean {
  const scope = scopeOf(role);
  if (scope.investigations === "*") return true;
  const item = caseDef.investigations.find((i) => i.id === investigationId);
  if (!item) return true; // unknown: the tool refuses it
  return item.requires.length > 0 && item.requires.every((c) => BEDSIDE_TEST_CAPABILITIES.includes(c));
}

/**
 * May a body of this role make this clinical tool call (`itemId`: the item it resolves to, when it does)? The
 * world's clinical class first, then the role's scope of practice.
 */
export function checkClinicalScope(actor: ScopeActor, tool: string, itemId: string | null, caseDef: CaseDefinition, locale: string): ScopeCheck {
  const classes = (ROLE_AUTHORITY as Record<string, readonly string[]>)[actor.role] ?? [];
  if (!classes.includes("clinical")) return refusal(locale, actor, "no-clinical-authority", "scope.noClinical");
  const scope = scopeOf(actor.role);
  if (scope.tools !== "*" && !scope.tools.includes(tool)) return refusal(locale, actor, "tool", "scope.tool", { tool });
  if (tool === "intervene" && itemId && !mayGive(actor.role, caseDef, itemId)) {
    const item = caseDef.interventions.find((i) => i.id === itemId)!;
    return refusal(locale, actor, "intervention", "scope.intervention", { item: t(item.name, locale), kinds: kindsText(locale, scope.interventionKinds === "*" ? [] : scope.interventionKinds, scope.ivAccess) });
  }
  if (tool === "order_test" && itemId && !mayOrder(actor.role, caseDef, itemId)) {
    const item = caseDef.investigations.find((i) => i.id === itemId)!;
    return refusal(locale, actor, "investigation", "scope.investigation", { item: t(item.name, locale) });
  }
  return OK;
}

/** May a staff member of this role be handed this task (`interventionId`: what a `give_intervention` gives)? */
export function checkTaskScope(actor: ScopeActor, task: string, caseDef: CaseDefinition, locale: string, interventionId?: string | null): ScopeCheck {
  const scope = scopeOf(actor.role);
  if (!scope.tasks.includes(task)) {
    const tasks = scope.tasks.map((x) => rt(locale, `delegate.task.${x}` as RuntimeKey)).join(locale.startsWith("zh") ? "、" : ", ") || "—";
    return refusal(locale, actor, "task", "scope.task", { task: rt(locale, `delegate.task.${task}` as RuntimeKey), tasks });
  }
  if (task === "give_intervention" && interventionId) return checkClinicalScope(actor, "intervene", interventionId, caseDef, locale);
  return OK;
}
