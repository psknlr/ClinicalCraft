/**
 * Patients who cannot speak (`patient.nonVerbalWhen`, docs/CASE_AUTHORING.md §2): while the condition holds the
 * patient never speaks. History goes to the companion when the case has one (whatever `answersHistory` says),
 * relaying an answer written in the patient's own words ("He told us: “…”"); otherwise the reply is an honest
 * narration — "<name> cannot answer: <reason>" — in the narrator's voice, and no fact is revealed (the engine
 * refuses the question: `cannot-answer`). An opening line written as an aside ("(She is on a ventilator…)") is
 * narration too. Shared by the patient pipeline, the learner's button questions and `list_options`.
 */
import { patientNonVerbal, t, type CaseDefinition, type SessionState } from "@clinicalcraft/core";
import { isZh, rt, type RuntimeKey } from "./i18n.js";

/** A display name without its "(pseudonym)" / "（化名）" note. */
export function plainName(name: string): string {
  return name.replace(/\s*[（(][^（()）]*[）)]\s*$/u, "").trim() || name;
}

/** The text ended as a sentence ("." / "。") unless it already ends with sentence punctuation. */
function asSentence(text: string, locale: string): string {
  const s = text.trim();
  if (!s || /[.!?。！？…]["”’」）)]*$/u.test(s)) return s;
  return `${s}${isZh(locale) ? "。" : "."}`;
}

/**
 * While the patient cannot speak (`patient.nonVerbalWhen` holds): the authored reason in `locale` ("" when the
 * case gives none). Null while the patient can speak.
 */
export function nonVerbalReason(c: CaseDefinition, s: SessionState, locale: string): string | null {
  if (!patientNonVerbal(c, s)) return null;
  return c.patient.nonVerbalReason ? t(c.patient.nonVerbalReason, locale).trim() : "";
}

/** The narration when the patient cannot answer ("Li Ming cannot answer: intubated and sedated.") — or, on approach, cannot speak. */
export function nonVerbalNarration(c: CaseDefinition, reason: string, locale: string, approach = false): string {
  const name = plainName(t(c.patient.displayName, locale));
  const key: RuntimeKey = approach ? (reason ? "patient.nonVerbal.approach" : "patient.nonVerbal.approachNoReason") : reason ? "patient.nonVerbal.answer" : "patient.nonVerbal.answerNoReason";
  return asSentence(rt(locale, key, { name, reason }), locale);
}

/**
 * The text of a line written as narration — wholly one bracketed aside, "(She is on a ventilator and cannot
 * speak.)" / "（她接着呼吸机，不能说话。）" — or null for speech.
 */
export function narratedLine(text: string): string | null {
  const s = text.trim();
  if (!/^[（(]/u.test(s) || !/[）)]$/u.test(s)) return null;
  const inner = s.slice(1, -1);
  let depth = 0;
  for (const ch of inner) {
    if (ch === "(" || ch === "（") depth++;
    else if (ch === ")" || ch === "）") depth--;
    if (depth < 0) return null; // "(sighs) I'm fine (really)": two asides around speech
  }
  return depth === 0 && inner.trim() ? inner.trim() : null;
}

/** How the companion refers to the patient: she / he / they (zh: 她 / 他 / the name). */
function patientPronoun(c: CaseDefinition, locale: string): string {
  const key: RuntimeKey = c.patient.sex === "female" ? "pronoun.she" : c.patient.sex === "male" ? "pronoun.he" : "pronoun.they";
  return rt(locale, key, { name: plainName(t(c.patient.displayName, locale)) });
}

/**
 * The authored answer of history item `itemId` as `speaker` says it: while the patient cannot speak and the
 * companion answers for them, an answer written in the patient's own words (the companion does not answer
 * history, or the item is the patient's `speaker: "patient"`) is relayed — "He told us: “…”" — never spoken as
 * the companion's own first person.
 */
export function spokenAnswer(c: CaseDefinition, s: SessionState, itemId: string, locale: string, speaker: "patient" | "companion"): string {
  const item = c.history.find((h) => h.id === itemId);
  if (!item) return "";
  const answer = t(item.answer, locale);
  const companion = c.patient.persona.companion;
  const ownWords = !companion?.answersHistory || item.speaker === "patient";
  if (speaker !== "companion" || !companion || !ownWords || !patientNonVerbal(c, s) || !answer) return answer;
  return rt(locale, "companion.relay", { who: patientPronoun(c, locale), answer });
}
