/**
 * The operative field's people and refusals in the learner's words (docs/PROCEDURE.md §7; A19): the agent's own
 * helpers (`nameOfRef`, `reasonText`) — one way of naming the field's people in every front-end — with the web's
 * templates (`surgery.reason.<key>`, `holder.*`, `position.*`, `control.*`). The learner — operating, or their place's
 * member — is "you"; anyone else by name and, for a member of staff, position ("Dr Ito (operating surgeon)").
 */
import { nameOfRef, reasonText, type FieldContext, type ReasonWords } from "@clinicalcraft/agent";
import { LEARNER_BODY, memberBody, SurgicalControlSchema, type CaseDefinition, type FacilityDefinition, type RefusalReason, type SessionState } from "@clinicalcraft/core";
import { bodyPosition } from "@clinicalcraft/world";
import { getLocale, tr, trMaybe } from "../i18n/index.js";

/**
 * The words' context: what the learner reads (no acting body — the learner's — and nobody else addressed), in the UI
 * language of the moment it is read.
 */
export function learnerField(caseDef: CaseDefinition, facility: FacilityDefinition | null, state: () => SessionState): FieldContext {
  return {
    caseDef,
    facility,
    state,
    get locale() {
      return getLocale();
    },
  };
}

/** The body a step's party works with (core `memberBody`; absent or `""`: the operator). */
function bodyOf(ctx: FieldContext, ref: string | undefined): string {
  return memberBody(ctx.caseDef, ctx.state(), ref === undefined || ref === "" ? "surgeon" : ref);
}

/**
 * A step's party (a staff id; absent or `""`: the operator) by name, as a caption says who did it: "you" for the learner
 * — operating, or their place's member (core `memberBody`) —, anyone else by name.
 */
export function partyName(ctx: FieldContext, ref: string | undefined): string {
  return bodyOf(ctx, ref) === LEARNER_BODY ? tr("holder.you") : nameOfRef(ctx, ref === "" ? undefined : ref);
}

/**
 * A port's holder, a step's party (a staff id; absent or `""`: the operator) in the learner's words: "you" for the
 * learner, anyone else by name and, for a member of staff, position ("Dr Ito (operating surgeon)").
 */
export function partyWords(ctx: FieldContext, ref: string | undefined): string {
  const body = bodyOf(ctx, ref);
  if (body === LEARNER_BODY) return tr("holder.you");
  const name = nameOfRef(ctx, ref === "" ? undefined : ref);
  const position = bodyPosition(ctx.caseDef, ctx.state(), ctx.facility, body);
  return position ? tr("holder.named", { name, position: tr(`position.${position}`) }) : name;
}

/** A sentence of the web's for a reason key (`<key>` or its "you" variant `<key>.you`), its blanks filled. */
function sentence(key: string, params?: Record<string, string>): string {
  const base = key.replace(/\.you$/u, "");
  return trMaybe(`surgery.reason.${key}`, trMaybe(`surgery.reason.${base}`, base, params), params);
}

/** The web's words for a refusal's reason (`reasonText`): its templates and its labels of the values a reason names. */
export const WEB_REASON_WORDS: ReasonWords = {
  sentence,
  op: (value) => trMaybe(`surgery.op.${value}`, value),
  label: (value) => trMaybe(`surgery.instrument.${value}`, trMaybe(`surgery.role.${value}`, value)),
  control: (value) => {
    const parsed = SurgicalControlSchema.safeParse(value);
    return parsed.success ? tr(`control.${parsed.data}`) : value;
  },
};

/** Why the field refused a step, in the learner's words with the people's names (null: the field gave no reason). */
export function refusalWords(ctx: FieldContext, reason: RefusalReason | undefined): string | null {
  return reasonText(ctx, reason, WEB_REASON_WORDS);
}
