/**
 * The care team's own steps at the operating table and the approval gate (docs/TEAM.md §4.5). A team member's step in
 * the operative field — an assistant's traction or camera, the scrub nurse's pass, the stand-in surgeon's steps — runs
 * through the tool path under the team's caller (`TEAM_CALLER`, a built-in profile holding `operate` and
 * `observe_field`), with the member's own body. None of them is asked about, except the stand-in's critical steps: a
 * clip, a division, a coagulation or a bail-out by the body that operates while the learner holds a place in the team.
 * That one is said aloud first — the call-out ("Clipping the cystic duct." / "正在夹闭胆囊管。") — and the session asks
 * the learner (No objection / Stop) in every approval mode but bypass. Pure: read from the case and the state.
 */
import { memberBody, operatorOf, procedureFor, procedureStateOf, ProcedureOpSchema, vocabularyStructures, type CaseDefinition, type ProcedureOp, type ProcedureOpType, type SessionState, type TeamChoice } from "@clinicalcraft/core";
import { both, phrase, type Bilingual } from "./i18n.js";

/** The agent id the care team's own steps in the operative field run under (`TEAM_PROFILE`). */
export const TEAM_CALLER = "team";

/** The critical steps the stand-in surgeon calls out before doing them. */
export const CALLOUT_OPS: readonly ProcedureOpType[] = ["clip", "divide", "coagulate", "bailout"];

/** The step an `operate` call's arguments describe (`{op, …}`, or `{step: {op, …}}`); null when it is not one. */
export function operateArgsOp(args: unknown): ProcedureOp | null {
  if (!args || typeof args !== "object") return null;
  const nested = (args as { step?: unknown }).step;
  const parsed = ProcedureOpSchema.safeParse(nested && typeof nested === "object" ? nested : args);
  return parsed.success ? parsed.data : null;
}

/** The body that operates when it is a member of staff's — the stand-in's while the learner holds a place — else null. */
function standInBody(c: CaseDefinition, s: TeamChoice): string | null {
  const body = memberBody(c, s, "surgeon");
  return body.startsWith("staff:") ? body : null;
}

/** Whether a call of the team's caller is the stand-in's call-out: the stand-in's own body doing a critical step. */
export function isCallout(c: CaseDefinition, s: TeamChoice, actorId: string | undefined, op: ProcedureOp | null): boolean {
  if (!op || !CALLOUT_OPS.includes(op.op) || !actorId) return false;
  return standInBody(c, s) === actorId;
}

/**
 * Whether a step the field recorded (its actor normalised: the operator has none) was the stand-in's critical step: the
 * operator's, while the learner holds a place and a stand-in operates (the benchmark's audit reads the record so).
 */
export function isCalloutStep(c: CaseDefinition, s: TeamChoice, op: ProcedureOpType, actor?: string): boolean {
  return CALLOUT_OPS.includes(op) && actor === undefined && operatorOf(c, s) !== undefined;
}

/** "the cystic duct" / "胆囊管": a name of the vocabulary as it is said in a sentence. */
function spoken(name: Bilingual): Bilingual {
  return phrase("clause.the", { name: { en: name.en.charAt(0).toLowerCase() + name.en.slice(1), "zh-CN": name["zh-CN"] } });
}

/**
 * What a handle is called aloud: the name the operator gave it (`identify … as`, a name of the vocabulary — never the
 * hidden anatomy), else the handle itself ("T2").
 */
function handleWords(c: CaseDefinition, s: SessionState, handle: string): Bilingual {
  const def = procedureFor(c, s);
  const named = procedureStateOf(s).claims[handle];
  const structure = def && named ? vocabularyStructures(def).find((x) => x.id === named) : undefined;
  return structure ? spoken(both(structure.name)) : { en: handle, "zh-CN": handle };
}

/** The call-out of a critical step in both languages ("Clipping the cystic duct."); null for any other step. */
export function calloutLine(c: CaseDefinition, s: SessionState, op: ProcedureOp): Bilingual | null {
  switch (op.op) {
    case "clip":
    case "divide":
    case "coagulate":
      return phrase(`callout.${op.op}`, { structure: handleWords(c, s, op.handle) });
    case "bailout":
      return phrase("callout.bailout", { strategy: phrase(`clause.bailout.${op.strategy}`) });
    default:
      return null;
  }
}
