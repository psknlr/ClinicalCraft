/**
 * The operative field said to whoever asked (docs/PROCEDURE.md §3, §7): a refusal's reason with the people's names —
 * the learner is "you" (their place's member while they hold a place; the operator while they operate) —, controls by
 * their names, the camera and the passes waiting; and the refusal, before any approval, of a step outside the acting
 * body's controls (`placeRefusal`: core `seatCheck` with the body's controls, `bodyControls` for the field — so nobody
 * is asked to approve what the body may not do). The engine's English `message` stays as it is: callers keep it as the
 * detail of a rejection and replace only the generic lead-in with `reasonText` (the A4 rule of the theatre round).
 */
import {
  bodyControls,
  COLLEAGUE_OPS,
  CONTROL_TITLES,
  FIELD_REFUSALS,
  isPlace,
  LEARNER_BODY,
  memberBody,
  normaliseStep,
  operatorOf,
  POSITION_TITLES,
  procedureFor,
  procedureStateOf,
  refOfBody,
  seatCheck,
  SurgicalControlSchema,
  t,
  type Controls,
  type FieldView,
  type ProcedureOp,
  type RefusalReason,
  type SurgicalControl,
} from "@clinicalcraft/core";
import { bodyPosition } from "@clinicalcraft/world";
import { joinList, rt, type RuntimeKey } from "../session/i18n.js";
import { procedureLabel } from "../session/i18n-procedure.js";
import type { ToolContext, ToolOutput } from "./types.js";

/** What naming the field's people needs of a tool call: the case, the state, the facility, the language and the acting body. */
export type FieldContext = Pick<ToolContext, "caseDef" | "facility" | "locale" | "state" | "actorId">;

/** Whether a step's party (`''` / undefined: the operator) is the learner — their place's member, or the operator while they operate. */
export function isLearnerRef(ctx: Pick<FieldContext, "caseDef" | "state">, ref: string | undefined): boolean {
  const s = ctx.state();
  if (ref === undefined || ref === "") return !isPlace(s);
  return memberBody(ctx.caseDef, s, ref) === LEARNER_BODY;
}

/** A step's party in words: "you" for the learner, the operator (`''`) by name while the learner holds a place, a member of staff by name. */
export function nameOfRef(ctx: FieldContext, ref: string | undefined): string {
  const L = ctx.locale;
  if (isLearnerRef(ctx, ref)) return rt(L, "place.you");
  const id = ref === undefined || ref === "" ? (operatorOf(ctx.caseDef, ctx.state()) ?? "") : ref;
  const staff = ctx.facility?.staff.find((s) => s.id === id);
  return staff ? t(staff.name, L) : id;
}

/** A control by its name ("Traction", "器械台"); an unknown value as it is. */
export function controlName(locale: string, control: string): string {
  const parsed = SurgicalControlSchema.safeParse(control);
  return parsed.success ? t(CONTROL_TITLES[parsed.data], locale) : control;
}

/** Controls in words, joined ("Traction, Suction, Camera"). */
export function controlsText(locale: string, controls: readonly SurgicalControl[]): string {
  return joinList(locale, controls.map((c) => controlName(locale, c)));
}

/** The reason keys whose subject is a person: said to the learner, the sentence is the "you" variant (`op.reason.<key>.you`). */
const SUBJECT: Readonly<Partial<Record<string, string>>> = {
  "operator-only": "actor",
  "port-held": "holder",
  "take-from-colleague": "holder",
  "hands-full": "who",
  "needs-control": "who",
  "holds-already": "who",
  "pass-self": "who",
};

const PEOPLE: ReadonlySet<string> = new Set(["who", "holder", "actor", "to"]);

/**
 * A refusal's reason in the caller's language, with the people's names (`op.reason.<key>`; the learner as "you"); null
 * for a key the field does not give — the caller keeps its generic lead-in then.
 */
export function reasonText(ctx: FieldContext, reason: RefusalReason | undefined): string | null {
  if (!reason || !(FIELD_REFUSALS as readonly string[]).includes(reason.key)) return null;
  const L = ctx.locale;
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(reason.params)) {
    if (PEOPLE.has(k)) params[k] = nameOfRef(ctx, v);
    else if (k === "control") params[k] = controlName(L, v);
    else if (k === "op") params[k] = rt(L, `op.noun.${v}` as RuntimeKey);
    else if ((k === "instrument" || k === "role") && v) params[k] = procedureLabel(L, v);
    else params[k] = v;
  }
  const subject = SUBJECT[reason.key];
  const you = subject !== undefined && subject in reason.params && isLearnerRef(ctx, reason.params[subject]);
  return rt(L, `op.reason.${reason.key}${you ? ".you" : ""}` as RuntimeKey, params);
}

/** A body's position in words (the learner's place, the stand-in the operating surgeon, a member of staff their own). */
function positionWords(ctx: FieldContext, body: string): string {
  const p = bodyPosition(ctx.caseDef, ctx.state(), ctx.facility, body);
  return p ? t(POSITION_TITLES[p], ctx.locale) : body;
}

/** A refusal by control as a tool output (`data.code` `NOT_AUTHORIZED`: no approval is asked for it). */
function notAuthorized(output: string, refusal: RefusalReason, detail?: string): ToolOutput {
  return { ok: false, output, data: { code: "NOT_AUTHORIZED", reason: "control", refusal, message: output, ...(detail ? { detail } : {}) } };
}

/**
 * Whether the acting body may take this step at all, before the approval gate (docs/PROCEDURE.md §3; null: it may, or
 * the field decides). The body — `ctx.actorId`, a body-less call being the learner's — works the field as its member
 * (core `refOfBody`): the operator (the learner without a place, the stand-in in one) is never refused here; a body with
 * no part in the field (the colleague standing by) is; a colleague's step only the operator does is ("You are the first
 * assistant: dissection is the operating surgeon's."); and any other step needs the control it is worked with, the one
 * who takes a port too (core `seatCheck`, each body's own controls — `bodyControls` for the field).
 */
export function placeRefusal(ctx: FieldContext, op: ProcedureOp): ToolOutput | null {
  const c = ctx.caseDef;
  const s = ctx.state();
  if (!procedureFor(c, s)) return null;
  const L = ctx.locale;
  const body = ctx.actorId ?? LEARNER_BODY;
  const ref = refOfBody(c, s, body);
  if (ref === undefined) return null;
  const learner = body === LEARNER_BODY;
  if (ref === null) {
    // the colleague standing by while the learner holds their place, or a body that is nobody's in the team
    const who = learner ? rt(L, "place.You") : nameOfBody(ctx, body);
    const standing = !learner && body.startsWith("staff:");
    return notAuthorized(standing ? rt(L, "scope.standingBy", { who, position: positionWords(ctx, body) }) : rt(L, "place.noPart", { who }), { key: standing ? "standing-by" : "no-part", params: { who: body, op: op.op } });
  }
  const step = normaliseStep(c, s, op, ref);
  if (step.actor === undefined) return null;
  const reason: RefusalReason = { key: "operator-only", params: { op: step.op.op, actor: step.actor } };
  if (!COLLEAGUE_OPS.has(step.op.op)) {
    const params = { position: positionWords(ctx, body), op: rt(L, `op.noun.${step.op.op}` as RuntimeKey) };
    return notAuthorized(learner ? rt(L, "op.place.operatorOnly.you", params) : rt(L, "op.place.operatorOnly", { ...params, who: nameOfBody(ctx, body) }), reason);
  }
  const controlsOf = (who: string): Controls => bodyControls(c, s, ctx.facility, memberBody(c, s, who), "field");
  const gate = seatCheck(c, { ...s, procedure: procedureStateOf(s) }, step.op, step.actor, controlsOf);
  if (!gate) return null;
  return notAuthorized(reasonText(ctx, gate.reason) ?? gate.message, gate.reason, gate.message);
}

/** A body's name (a member of staff's from the facility; else its id). */
function nameOfBody(ctx: FieldContext, body: string): string {
  const id = body.replace(/^staff:/u, "");
  const staff = ctx.facility?.staff.find((s) => s.id === id);
  return staff ? t(staff.name, ctx.locale) : id;
}

/**
 * What `observe_field` adds for the acting body (docs/PROCEDURE.md §7): its place and controls when it is not the
 * operator, where the camera looks and who holds it, and the instruments passed and waiting to go in — people by name,
 * the learner as "you".
 */
export function fieldPlaceLines(ctx: FieldContext, v: FieldView): string[] {
  const c = ctx.caseDef;
  const s = ctx.state();
  const L = ctx.locale;
  const lines: string[] = [];
  const body = ctx.actorId ?? LEARNER_BODY;
  const controls = bodyControls(c, s, ctx.facility, body, "field");
  if (controls !== "all") {
    const position = positionWords(ctx, body);
    // the id the field knows the body by (a `hand-over` `to` that takes a port): the place's member, or their own
    const ref = refOfBody(c, s, body) ?? body.replace(/^staff:/u, "");
    lines.push(controls.length ? rt(L, "field.controls", { position, ref, controls: controlsText(L, controls) }) : rt(L, "field.controls.none", { position, ref }));
  }
  if (v.camera) {
    const def = procedureFor(c, s);
    const region = v.camera.at ? def?.regions.find((r) => r.id === v.camera!.at) : undefined;
    const aim = v.camera.at ? rt(L, "field.camera.at", { region: region ? `${t(region.name, L)} (${v.camera.at})` : v.camera.at }) : rt(L, "field.camera.whole");
    lines.push(rt(L, "field.camera", { port: v.camera.port, aim, zoom: rt(L, `field.zoom.${v.camera.zoom}` as RuntimeKey), who: nameOfRef(ctx, v.camera.holder) }));
  }
  if (v.passed.length) {
    const passes = v.passed.map((q) => rt(L, "field.pass", { instrument: procedureLabel(L, q.instrument), to: nameOfRef(ctx, q.to), by: nameOfRef(ctx, q.by) }));
    lines.push(rt(L, "field.passed", { passes: joinList(L, passes) }));
  }
  return lines;
}

/** A port's holder in `observe_field` (" — held by you", " — held by Dr Abe"). */
export function heldByText(ctx: FieldContext, holder: string): string {
  return isLearnerRef(ctx, holder) ? rt(ctx.locale, "field.heldBy.you") : rt(ctx.locale, "field.heldBy", { who: nameOfRef(ctx, holder) });
}
