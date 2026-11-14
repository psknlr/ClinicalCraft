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
 * The theatre's work goes by control, not by role (docs/EMBODIED.md §8.3): when the session knows a body's controls
 * (`ScopeActor.controls`, core `bodyControls` for the field), they REPLACE the role's scope for the operative field's
 * tools (`operate`, `observe_field`: any control of the field — saying an injury aloud needs none) and the theatre's
 * delegation tasks (`hold_traction` / `release_traction`: traction, `hold_camera` / `aim_camera`: the camera,
 * `pass_instrument`: the instrument table); the colleague standing by while the learner holds their place gets none of
 * them. Everything else stays with the role.
 *
 * | role | delegable tasks | clinical tools with their body | interventions |
 * |---|---|---|---|
 * | clinician (the learner's avatar), attending | all (with hold_traction / release_traction: an assistant at the operating table — by control when the session knows it) | all | all |
 * | nurse | attach_monitor, record_ecg, obtain_iv_access, fetch_equipment, give_intervention, transport_patient | check_vitals, examine, order_test (bedside tests: ECG, point of care, peak flow), read_result, intervene | medication, fluid, oxygen, monitoring, positioning, the case's IV access and the items authored `scope: "nursing"` (CPR, defibrillation, catheters, NG tube, swallow screen…) — never an item authored `scope: "medical"`, airway/RSI, an arterial line or another medical procedure, a consult or a disposition |
 * | paramedic | as a nurse | as a nurse | as a nurse + airway |
 * | porter | fetch_equipment, transport_patient (wheel the patient to a study and back) | — (no clinical class) | — |
 * | receptionist | fetch_equipment | — (no clinical class) | — |
 * | lab-tech, pharmacist, radiologist, pathologist | fetch_equipment | check_vitals, read_result | — (no patient interventions) |
 *
 * Pure: the role, the case and the item — no world, no session.
 */
import { CONTROL_TITLES, FIELD_CONTROLS, POSITION_TITLES, t, type CaseDefinition, type Controls, type StaffPosition, type SurgicalControl } from "@clinicalcraft/core";
import { holdsControl, ivAccessIntervention, roleName, ROLE_AUTHORITY, type ActorRole } from "@clinicalcraft/world";
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
  /** Items authored `scope: "nursing"`, whatever their kind (CPR, defibrillation, a urinary catheter…). */
  readonly nursing: boolean;
  /** Investigations the role may order: every one, or bedside tests only. */
  readonly investigations: "*" | "bedside";
}

const CARE_TASKS = ["attach_monitor", "record_ecg", "obtain_iv_access", "fetch_equipment", "give_intervention", "transport_patient"] as const;
/** A doctor also assists at the operating table: takes an instrument in a port and keeps its traction (PROCEDURE.md §3). */
const ALL_TASKS = [...CARE_TASKS, "hold_traction", "release_traction"] as const;
const FULL: RoleScope = { tasks: ALL_TASKS, tools: "*", interventionKinds: "*", ivAccess: true, nursing: true, investigations: "*" };
const NURSE: RoleScope = {
  tasks: CARE_TASKS,
  tools: ["check_vitals", "examine", "order_test", "read_result", "intervene"],
  interventionKinds: ["medication", "fluid", "oxygen", "monitoring", "positioning"],
  ivAccess: true,
  nursing: true,
  investigations: "bedside",
};
const FETCH_ONLY: RoleScope = { tasks: ["fetch_equipment"], tools: [], interventionKinds: [], ivAccess: false, nursing: false, investigations: "bedside" };
/** A porter fetches equipment and wheels patients (`transport_patient`, EMBODIED §8) — nothing clinical. */
const PORTER: RoleScope = { ...FETCH_ONLY, tasks: ["fetch_equipment", "transport_patient"] };
const SERVICE: RoleScope = { tasks: ["fetch_equipment"], tools: ["check_vitals", "read_result"], interventionKinds: [], ivAccess: false, nursing: false, investigations: "bedside" };

/** Role → scope of practice (see the module table). */
export const SCOPE_OF_PRACTICE: Readonly<Record<ActorRole, RoleScope>> = {
  clinician: FULL,
  attending: FULL,
  nurse: NURSE,
  paramedic: { ...NURSE, interventionKinds: [...(NURSE.interventionKinds as InterventionKind[]), "airway"] },
  porter: PORTER,
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
  return (SCOPE_OF_PRACTICE as Record<string, RoleScope>)[role] ?? { tasks: [], tools: [], interventionKinds: [], ivAccess: false, nursing: false, investigations: "bedside" };
}

/**
 * A refusal: the role may not, or (the theatre's work) the body does not hold the control, or it stands by (code
 * `NOT_AUTHORIZED`, a localised message naming the body).
 */
export interface ScopeRefusal {
  ok: false;
  code: "NOT_AUTHORIZED";
  reason: "no-clinical-authority" | "tool" | "intervention" | "investigation" | "task" | "control" | "standing-by";
  message: string;
}
export type ScopeCheck = { ok: true } | ScopeRefusal;

/** Who acts, for messages: a name and the role ("Lin Xiao", "nurse") — and, for the theatre's work, what they hold. */
export interface ScopeActor {
  role: string;
  /** Display name (falls back to the role). */
  name?: string;
  /**
   * The body's controls in the operative field when the session knows them (core `bodyControls` for the field; `all`:
   * whoever operates): they decide the theatre's tools and tasks instead of the role (`THEATRE_TOOLS`,
   * `THEATRE_TASK_CONTROL`). Absent: the role decides everything (no team, or a caller that knows no body).
   */
  controls?: Controls;
  /** The body's position in this encounter (named in a refusal by control); null or absent: the role names it. */
  position?: StaffPosition | null;
  /** The colleague whose place the learner holds: standing by, they take no part in the theatre's work. */
  standingBy?: boolean;
}

/** The operative field's tools: with a known body, a control of the field decides them (`FIELD_CONTROLS`), not the role. */
export const THEATRE_TOOLS: readonly string[] = ["operate", "observe_field"];

/** The theatre's delegation tasks and the control each is worked with: with a known body, the control decides them, not the role. */
export const THEATRE_TASK_CONTROL: Readonly<Record<string, SurgicalControl>> = {
  hold_traction: "retract",
  release_traction: "retract",
  hold_camera: "camera",
  aim_camera: "camera",
  pass_instrument: "instruments",
};

const OK: ScopeCheck = { ok: true };

/** A body's position in words, else its role's ("first assistant", "nurse"). */
function positionName(actor: ScopeActor, locale: string): string {
  return actor.position ? t(POSITION_TITLES[actor.position], locale) : roleName(actor.role, locale);
}

function refusal(locale: string, actor: ScopeActor, reason: ScopeRefusal["reason"], key: RuntimeKey, params: Record<string, string> = {}): ScopeRefusal {
  const role = roleName(actor.role, locale);
  return { ok: false, code: "NOT_AUTHORIZED", reason, message: rt(locale, key, { who: actor.name || role, role, position: positionName(actor, locale), ...params }) };
}

/**
 * The operative field's tools for a body whose controls are known: never while standing by; saying an injury aloud
 * (`operate {op: "recognise"}`: `itemId`) needs no control — anyone at work in the room may (docs/PROCEDURE.md §3);
 * anything else needs a control of the field — the scrub nurse's instrument table makes her a party to it (her passes;
 * the field refuses the rest), the anaesthetist's or the circulating nurse's controls do not.
 */
function fieldScope(actor: ScopeActor & { controls: Controls }, tool: string, itemId: string | null, locale: string): ScopeCheck {
  if (actor.standingBy) return refusal(locale, actor, "standing-by", "scope.standingBy");
  if (tool === "operate" && itemId === "recognise") return OK;
  if (actor.controls === "all" || actor.controls.some((c) => FIELD_CONTROLS.includes(c))) return OK;
  return refusal(locale, actor, "control", "scope.control.tool");
}

/** Localised intervention kinds ("medication, fluid…"). */
function kindsText(locale: string, kinds: readonly InterventionKind[], ivAccess: boolean, nursing: boolean): string {
  const names = kinds.map((k) => rt(locale, `scope.kind.${k}` as RuntimeKey));
  if (ivAccess) names.push(rt(locale, "scope.ivAccess"));
  if (nursing) names.push(rt(locale, "scope.nursing"));
  return names.length ? names.join(locale.startsWith("zh") ? "、" : ", ") : "—";
}

/**
 * May this role give this case's intervention? Every item for a full scope; otherwise the authored `scope` wins
 * (`nursing`: a nurse's or a paramedic's; `medical`: nobody else), then the case's IV access, then the kind.
 */
export function mayGive(role: string, caseDef: CaseDefinition, interventionId: string): boolean {
  const scope = scopeOf(role);
  const item = caseDef.interventions.find((i) => i.id === interventionId);
  if (!item) return true; // unknown: the tool refuses it
  if (scope.interventionKinds === "*") return true;
  if (item.scope === "medical") return false;
  if (item.scope === "nursing") return scope.nursing;
  if (scope.ivAccess && ivAccessIntervention(caseDef) === interventionId) return true;
  return scope.interventionKinds.includes(item.kind);
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
  // the operative field goes by control when the body's are known (docs/EMBODIED.md §8.3), not by role
  if (actor.controls !== undefined && THEATRE_TOOLS.includes(tool)) return fieldScope(actor as ScopeActor & { controls: Controls }, tool, itemId, locale);
  const scope = scopeOf(actor.role);
  if (scope.tools !== "*" && !scope.tools.includes(tool)) return refusal(locale, actor, "tool", "scope.tool", { tool });
  if (tool === "intervene" && itemId && !mayGive(actor.role, caseDef, itemId)) {
    const item = caseDef.interventions.find((i) => i.id === itemId)!;
    return refusal(locale, actor, "intervention", "scope.intervention", { item: t(item.name, locale), kinds: kindsText(locale, scope.interventionKinds === "*" ? [] : scope.interventionKinds, scope.ivAccess, scope.nursing) });
  }
  if (tool === "order_test" && itemId && !mayOrder(actor.role, caseDef, itemId)) {
    const item = caseDef.investigations.find((i) => i.id === itemId)!;
    return refusal(locale, actor, "investigation", "scope.investigation", { item: t(item.name, locale) });
  }
  return OK;
}

/**
 * May this staff member be handed this task (`interventionId`: what a `give_intervention` gives)? The theatre's tasks
 * by the control each is worked with when the body's controls are known (`THEATRE_TASK_CONTROL`; never the colleague
 * standing by), every other task — and a theatre task for a body whose controls are unknown — by the role's scope.
 */
export function checkTaskScope(actor: ScopeActor, task: string, caseDef: CaseDefinition, locale: string, interventionId?: string | null): ScopeCheck {
  const control = THEATRE_TASK_CONTROL[task];
  if (control && actor.controls !== undefined) {
    if (actor.standingBy) return refusal(locale, actor, "standing-by", "scope.standingBy");
    if (holdsControl(actor.controls, control)) return OK;
    return refusal(locale, actor, "control", "scope.control.task", { task: rt(locale, `delegate.task.${task}` as RuntimeKey), control: t(CONTROL_TITLES[control], locale) });
  }
  const scope = scopeOf(actor.role);
  if (!scope.tasks.includes(task)) {
    const tasks = scope.tasks.map((x) => rt(locale, `delegate.task.${x}` as RuntimeKey)).join(locale.startsWith("zh") ? "、" : ", ") || "—";
    return refusal(locale, actor, "task", "scope.task", { task: rt(locale, `delegate.task.${task}` as RuntimeKey), tasks });
  }
  if (task === "give_intervention" && interventionId) return checkClinicalScope(actor, "intervene", interventionId, caseDef, locale);
  return OK;
}
