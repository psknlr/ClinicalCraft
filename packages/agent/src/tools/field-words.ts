/**
 * The operative field said to whoever asked (docs/PROCEDURE.md §3, §7): a refusal's reason with the people's names,
 * controls by their names, the camera and the passes waiting; and the refusal, before any approval, of a step the
 * field would not take from the acting body (`placeRefusal`: core `fieldGate` — who takes part, `stepPartyRefusal`,
 * and the controls, `seatCheck` with each body's own, `bodyControls` for the field, for whoever does the step and
 * whoever takes a port — so nobody is asked to approve what the body may not do). The engine's English `message` stays as it
 * is: callers keep it as the detail of a rejection and replace only the generic lead-in with `reasonText` (the A4 rule
 * of the theatre round).
 *
 * "You" is whom the words are said to (`addresseeOf`): the acting body — a body-less call is the learner's — unless the
 * caller names another (a delegated step reports to the learner who delegated). Anyone else is named: a member of staff
 * by name, the learner — said to a colleague — by their place ("the first assistant (the learner)"; the operating
 * surgeon while they operate), whose place's member is the learner wherever its ref is shown (A19).
 */
import {
  bodyControls,
  CONTROL_TITLES,
  FIELD_REFUSALS,
  fieldGate,
  LEARNER_BODY,
  memberBody,
  POSITION_TITLES,
  procedureFor,
  refOfBody,
  seatMember,
  SurgicalControlSchema,
  t,
  type CaseDefinition,
  type FieldGateRefusal,
  type FieldView,
  type ProcedureOp,
  type RefusalReason,
  type SurgicalControl,
  type TeamChoice,
} from "@clinicalcraft/core";
import { bodyPosition } from "@clinicalcraft/world";
import { isZh, joinList, rt, type RuntimeKey } from "../session/i18n.js";
import { procedureLabel } from "../session/i18n-procedure.js";
import type { ToolContext, ToolOutput } from "./types.js";

/** What naming the field's people needs of a tool call: the case, the state, the facility, the language, the acting body and whom it is said to. */
export type FieldContext = Pick<ToolContext, "caseDef" | "facility" | "locale" | "state" | "actorId" | "addressee">;

/**
 * The body the words of a call are said to — its "you": the addressee the caller names (a delegated step reports to the
 * learner who delegated it), else the acting body (a call with no body is the learner's).
 */
export function addresseeOf(ctx: Pick<FieldContext, "actorId" | "addressee">): string {
  return ctx.addressee ?? ctx.actorId ?? LEARNER_BODY;
}

/**
 * The body a step's party works with (core `memberBody`): the operator (`''` / undefined) the surgeon member's — the
 * learner's while the learner operates, the stand-in's while they hold a place —; the member whose place the learner
 * holds, the learner's; any other member of staff their own.
 */
function partyBody(ctx: Pick<FieldContext, "caseDef" | "state">, ref: string | undefined): string {
  return memberBody(ctx.caseDef, ctx.state(), ref === undefined || ref === "" ? "surgeon" : ref);
}

/** Whether a step's party (`''` / undefined: the operator) is the one the words are said to ("you"). */
export function isAddressee(ctx: Pick<FieldContext, "caseDef" | "state" | "actorId" | "addressee">, ref: string | undefined): boolean {
  return partyBody(ctx, ref) === addresseeOf(ctx);
}

/** A body's name (a member of staff's from the facility; else its id). */
function nameOfBody(ctx: Pick<FieldContext, "facility" | "locale">, body: string): string {
  const id = body.replace(/^staff:/u, "");
  const staff = ctx.facility?.staff.find((s) => s.id === id);
  return staff ? t(staff.name, ctx.locale) : id;
}

/**
 * A step's party in words: "you" for the one the words are said to; the learner, said to someone else, by their place
 * ("the first assistant (the learner)"; "the operating surgeon (the learner)" while they operate); the operator — the
 * stand-in while the learner holds a place — and any other member of staff by name.
 */
export function nameOfRef(ctx: FieldContext, ref: string | undefined): string {
  const L = ctx.locale;
  const body = partyBody(ctx, ref);
  if (body === addresseeOf(ctx)) return rt(L, "place.you");
  if (body === LEARNER_BODY) return rt(L, "place.learner", { position: t(POSITION_TITLES[ctx.state().seat ?? "surgeon"], L) });
  return nameOfBody(ctx, body);
}

/**
 * A record's staff reference as the learner reads it (A19): the member whose place the learner holds is "you"; any
 * other reference — a staff id, the `surgeon` or `learner` token — as recorded.
 */
export function shownRef(c: CaseDefinition, s: TeamChoice, ref: string, locale: string): string {
  return s.seat !== undefined && seatMember(c, s)?.staff === ref ? rt(locale, "place.you") : ref;
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

/** The reason keys whose subject is a person: said to that person, the sentence is the "you" variant (`op.reason.<key>.you`). */
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
 * How a refusal's reason is worded (`reasonText`): its sentence for a reason key — `<key>`, or `<key>.you` said to the
 * one it is about — with its blanks filled (its template when given no blanks), and the words for the values it names.
 * The runtime's own (`op.reason.<key>` in the session's language) unless a front-end brings its own templates.
 */
export interface ReasonWords {
  sentence(key: string, params?: Record<string, string>): string;
  op(value: string): string;
  /** An instrument, or a port's role. */
  label(value: string): string;
  control(value: string): string;
}

/** The runtime's words for a refusal's reason, in a language (`op.reason.<key>`, `op.noun.<op>`, the procedure's labels). */
export function runtimeReasonWords(locale: string): ReasonWords {
  return {
    sentence: (key, params) => rt(locale, `op.reason.${key}` as RuntimeKey, params),
    op: (value) => rt(locale, `op.noun.${value}` as RuntimeKey),
    label: (value) => procedureLabel(locale, value),
    control: (value) => controlName(locale, value),
  };
}

/**
 * A refusal's reason in the caller's language, with the people's names (`op.reason.<key>`; the one it is said to as
 * "you"); null for a key the field does not give — the caller keeps its generic lead-in then. `words`: a front-end's
 * own templates for the same sentences (the web's `surgery.reason.<key>`), the people still named here.
 */
export function reasonText(ctx: FieldContext, reason: RefusalReason | undefined, words: ReasonWords = runtimeReasonWords(ctx.locale)): string | null {
  if (!reason || !(FIELD_REFUSALS as readonly string[]).includes(reason.key)) return null;
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(reason.params)) {
    if (PEOPLE.has(k)) params[k] = nameOfRef(ctx, v);
    else if (k === "control") params[k] = words.control(v);
    else if (k === "op") params[k] = words.op(v);
    else if ((k === "instrument" || k === "role") && v) params[k] = words.label(v);
    else params[k] = v;
  }
  const subject = SUBJECT[reason.key];
  const you = subject !== undefined && subject in reason.params && isAddressee(ctx, reason.params[subject]);
  const key = `${reason.key}${you ? ".you" : ""}`;
  const text = words.sentence(key, params);
  // the learner named by their place at the head of a sentence ("The first assistant (the learner) holds …")
  const lead = /^\{(\w+)\}/u.exec(words.sentence(key))?.[1];
  const learner = lead !== undefined && PEOPLE.has(lead) && lead in reason.params && !isAddressee(ctx, reason.params[lead]) && partyBody(ctx, reason.params[lead]) === LEARNER_BODY;
  return learner ? text.charAt(0).toUpperCase() + text.slice(1) : text;
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
 * The field's own refusal of a step's party, said before any approval as the step's rejection would say it
 * (`rejectedOutput`): the reason in the caller's words, then the engine's English message word for word.
 */
function partyRejected(ctx: FieldContext, refusal: FieldGateRefusal): ToolOutput {
  const message = `${reasonText(ctx, refusal.reason) ?? ""} ${refusal.message}`.trim();
  return { ok: false, output: rt(ctx.locale, "tool.rejected", { code: refusal.code, message }), data: { rejected: { code: refusal.code, message: refusal.message, reason: refusal.reason }, message } };
}

/**
 * Whether the field would take this step from the acting body at all, before the approval gate (docs/PROCEDURE.md §3;
 * null: it may, or the field decides) — core `fieldGate`, the composition a front-end's offers ask too, said in the
 * caller's words. The body — `ctx.actorId`, a body-less call being the learner's — works the field as its member (core
 * `refOfBody`): a body with no part in the field (the colleague standing by) is refused; a colleague's step only the
 * operator does is ("You are the first assistant: dissection is the operating surgeon's."); a step naming someone the
 * field takes no part from (core `stepPartyRefusal`: a member the team scenario makes absent; a pass, or in a place a
 * hand-over, to someone outside the team) is, as the field would say it; and any other step needs the control it is
 * worked with (core `seatCheck`, each body's own controls — `bodyControls` for the field): the colleague's own for
 * their step — the operator's are never narrowed — and whoever takes a port, from the operator too, theirs.
 */
export function placeRefusal(ctx: FieldContext, op: ProcedureOp): ToolOutput | null {
  const c = ctx.caseDef;
  const s = ctx.state();
  if (!procedureFor(c, s)) return null;
  const L = ctx.locale;
  const body = ctx.actorId ?? LEARNER_BODY;
  const you = body === addresseeOf(ctx);
  const gate = fieldGate(c, s, ctx.facility, op, body);
  if (!gate) return null;
  if (gate.kind === "no-part") {
    // the colleague standing by while the learner holds their place, or a body that is nobody's in the team
    const standing = body !== LEARNER_BODY && body.startsWith("staff:");
    const said = standing
      ? rt(L, "scope.standingBy", { who: you ? rt(L, "place.You") : nameOfBody(ctx, body), position: positionWords(ctx, body) })
      : you
        ? rt(L, "place.noPart.you")
        : rt(L, "place.noPart", { who: nameOfBody(ctx, body) });
    return notAuthorized(said, { key: standing ? "standing-by" : "no-part", params: { who: body, op: op.op } });
  }
  if (gate.kind === "operator-only") {
    const params = { position: positionWords(ctx, body), op: rt(L, `op.noun.${gate.step.op.op}` as RuntimeKey) };
    return notAuthorized(you ? rt(L, "op.place.operatorOnly.you", params) : rt(L, "op.place.operatorOnly", { ...params, who: nameOfBody(ctx, body) }), gate.reason);
  }
  if (gate.kind === "party") return partyRejected(ctx, gate.refusal);
  return notAuthorized(reasonText(ctx, gate.refusal.reason) ?? gate.refusal.message, gate.refusal.reason, gate.refusal.message);
}

/**
 * What `observe_field` adds for the acting body (docs/PROCEDURE.md §7): its place and controls when it is not the
 * operator and the words are said to it, where the camera looks and who holds it, and the instruments passed and
 * waiting to go in — people by name, the one the words are said to as "you".
 */
export function fieldPlaceLines(ctx: FieldContext, v: FieldView): string[] {
  const c = ctx.caseDef;
  const s = ctx.state();
  const L = ctx.locale;
  const lines: string[] = [];
  const body = ctx.actorId ?? LEARNER_BODY;
  const controls = bodyControls(c, s, ctx.facility, body, "field");
  if (controls !== "all" && body === addresseeOf(ctx)) {
    const position = positionWords(ctx, body);
    // the id the field knows the body by (a `hand-over` `to` that takes a port): the place's member, or their own
    const ref = refOfBody(c, s, body) ?? body.replace(/^staff:/u, "");
    lines.push(controls.length ? rt(L, "field.controls", { position, ref, controls: controlsText(L, controls) }) : rt(L, "field.controls.none", { position, ref }));
  }
  if (v.camera) {
    const aim = v.camera.at ? rt(L, "field.camera.at", { region: regionText(ctx, v.camera.at) }) : rt(L, "field.camera.whole");
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
  return isAddressee(ctx, holder) ? rt(ctx.locale, "field.heldBy.you") : rt(ctx.locale, "field.heldBy", { who: nameOfRef(ctx, holder) });
}

/** A region of the operation in words, its id in brackets ("Hepatocystic triangle (hepatocystic-triangle)", "胆囊三角（hepatocystic-triangle）"); an unknown id as it is. */
export function regionText(ctx: Pick<FieldContext, "caseDef" | "state" | "locale">, id: string): string {
  const region = procedureFor(ctx.caseDef, ctx.state())?.regions.find((r) => r.id === id);
  if (!region) return id;
  return isZh(ctx.locale) ? `${t(region.name, ctx.locale)}（${id}）` : `${t(region.name, ctx.locale)} (${id})`;
}
