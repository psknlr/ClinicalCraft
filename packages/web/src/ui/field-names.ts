/**
 * The operative field's people and refusals in the learner's words (docs/PROCEDURE.md §7; docs/TEAM.md §1): the agent's
 * own helpers (`nameOfRef`, `reasonText`) — one way of naming the field's people in every front-end — with the web's
 * templates (`surgery.reason.<key>`, `holder.*`, `position.*`, `control.*`). The learner — operating, or their place's
 * member — is "you"; anyone else by name and, for a member of staff, position ("Dr Ito (operating surgeon)").
 */
import { nameOfRef, reasonText, type FieldContext, type ReasonWords } from "@clinicalcraft/agent";
import { LEARNER_BODY, memberBody, SurgicalControlSchema, type CaseDefinition, type FacilityDefinition, type FieldView, type ProcedureDefinition, type RefusalReason, type SessionState } from "@clinicalcraft/core";
import { bodyPosition } from "@clinicalcraft/world";
import { ct, getLocale, tr, trMaybe } from "../i18n/index.js";

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

/** A name that already says who someone is in brackets ("Dr Mori (assistant surgeon)", "林护士（洗手）"): a facility's own. */
const QUALIFIED = /[)）]\s*$/u;

/**
 * A port's holder, a step's party (a staff id; absent or `""`: the operator) in the learner's words: "you" for the
 * learner, anyone else by name and, for a member of staff, position ("Dr Ito (operating surgeon)") — unless the
 * facility's name for them already says it in brackets (said once: "Dr Mori (assistant surgeon)").
 */
export function partyWords(ctx: FieldContext, ref: string | undefined): string {
  const body = bodyOf(ctx, ref);
  if (body === LEARNER_BODY) return tr("holder.you");
  const name = nameOfRef(ctx, ref === "" ? undefined : ref);
  const position = bodyPosition(ctx.caseDef, ctx.state(), ctx.facility, body);
  return position && !QUALIFIED.test(name) ? tr("holder.named", { name, position: tr(`position.${position}`) }) : name;
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

/**
 * The camera in the learner's words: its port, where it looks, how close and who holds it — the learner as "you" ("Port
 * A: aimed at the gallbladder bed, close up — held by you" / "A 孔：对准胆囊床，近景——由你握持"), anyone else by name and
 * position. Null: no laparoscope in a camera port. A region is named as the view names it, else as the case does.
 */
export function cameraWords(ctx: FieldContext, v: Pick<FieldView, "camera" | "regions">, def?: Pick<ProcedureDefinition, "regions"> | null): string | null {
  const cam = v.camera;
  if (!cam) return null;
  const region = cam.at ? (v.regions.find((r) => r.id === cam.at) ?? def?.regions.find((r) => r.id === cam.at)) : undefined;
  const aim = cam.at ? tr("surgery.camera.at", { region: region ? ct(region.name) : cam.at }) : tr("surgery.camera.whole");
  return tr("surgery.camera.now", { port: cam.port, aim, zoom: tr(`surgery.camera.zoom.${cam.zoom}`), who: partyWords(ctx, cam.holder) });
}
