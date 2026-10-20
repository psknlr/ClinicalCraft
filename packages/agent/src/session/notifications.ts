/**
 * How the ward reacts to engine domain events: UI notifications plus lines
 * spoken by the nurse/monitor (critical-result call-through, alarms, scenario
 * announcements). Results are never quoted — the learner must read them.
 */
import { t, type CaseDefinition, type DomainEvent, type VitalKey } from "@clinicalcraft/core";
import { investigationName, noReading, objectiveTitle, phaseLabel, vitalLabel, vitalWithUnit } from "../tools/format.js";
import { rt, type RuntimeKey } from "./i18n.js";

/** Who voices a reaction line. */
export type LineSpeaker = "nurse" | "monitor" | "patient" | "companion" | "narrator";

export interface EventReaction {
  notification?: { level: "info" | "warning" | "critical"; title: string; body: string };
  /**
   * A line spoken at the bedside: by the nurse (agent "nurse"), announced at
   * the monitor or narrated (agent "nurse", speaker `monitor` / `narrator`),
   * or an authored quote of the patient or companion (that agent).
   */
  staffLine?: { agent: "nurse" | "patient" | "companion"; speaker: LineSpeaker; text: string };
}

/** What the reactions may know about the bedside at the time. */
export interface ReactionContext {
  /**
   * Vitals the monitor cannot read right now (cardiac arrest — `VitalsSnapshot.unmeasurable`).
   * Optional: a `vitals.alarm` event carries its own `unmeasurable` flag (set by the engine at
   * the minute it fired), which is what the session relies on.
   */
  unmeasurable?: readonly VitalKey[];
}

/** "Nurse:", "Nurse Chen:", "护士：", "陈护士：" — a scenario line written as the nurse's speech. */
const NURSE_PREFIX = /^(?:Nurse(?:\s+[A-Z][A-Za-z'’-]*){0,2}|[\u4e00-\u9fff]{0,2}护士)\s*[:：]\s*/u;
/** "Monitor:", "监护：", "监护仪：" (not "Monitor alarm: …", whose words carry meaning). */
const MONITOR_PREFIX = /^(?:Monitor|监护仪?)\s*[:：]\s*/u;
/** "Monitor alarm! …", "监护仪报警：…", "监护报警" — announced at the monitor, text kept. */
const MONITOR_ALARM = /^(?:Monitor\s+alarm|监护仪?报警)/iu;
/** "<name>:", "<name> says:", "林女士说：" — the speaker label of a quoted line (short). */
const NAME_PREFIX = /^([^:：\n]{1,24}?)\s*(?:says|said|说)?\s*[:：]\s*/u;
const HONORIFICS_EN = /^(?:Mr|Ms|Mrs|Miss|Dr)\.?\s+/iu;
const HONORIFICS_ZH = ["先生", "女士", "小姐", "阿姨", "大爷", "大妈", "奶奶", "爷爷"];
const QUOTE_PAIRS: readonly [string, string][] = [["“", "”"], ["‘", "’"], ["「", "」"], ["\"", "\""], ["'", "'"]];

/** The text without wrapping quotes when it is exactly one quoted utterance (apostrophes inside are fine). */
function unquote(text: string): string {
  for (const [open, close] of QUOTE_PAIRS) {
    if (text.length < 2 || !text.startsWith(open) || !text.endsWith(close)) continue;
    const inner = text.slice(open.length, text.length - close.length);
    // A closing quote inside means several quoted pieces (or a quote followed by narration): keep the quotes.
    const closesEarly = open === close ? (open === "'" ? /(?:^|\s)'|'(?:\s|$)/.test(inner) : inner.includes(close)) : inner.includes(close);
    return closesEarly ? text : inner.trim();
  }
  return text;
}

/** Names a person may be quoted by: full names without "(pseudonym)"/"（化名）", and honorific + surname forms. */
export interface SpeakerNames {
  patient?: readonly string[];
  companion?: readonly string[];
}

function stripNote(name: string): string {
  return name.replace(/\s*[（(][^）)]*[）)]\s*/gu, " ").trim();
}

/** Does `label` name the person called `names` (any locale)? "Ms Lin", "林女士", "Lin Xiaolan", "林晓岚". */
function namesPerson(label: string, names: readonly string[]): boolean {
  const l = label.trim().toLowerCase();
  if (!l) return false;
  // "Wu Fan, his roommate" is quoted as "Wu Fan".
  for (const full of names.flatMap((raw) => [stripNote(raw), stripNote(raw).split(/[,，]/u)[0]!.trim()])) {
    if (!full) continue;
    if (l === full.toLowerCase()) return true;
    if (/[\u4e00-\u9fff]/u.test(full)) {
      const surname = full[0]!;
      if (HONORIFICS_ZH.some((h) => l === `${surname}${h}`)) return true;
    } else {
      const words = full.replace(HONORIFICS_EN, "").split(/[\s,]+/u).filter(Boolean);
      const surname = words[0]?.toLowerCase();
      const withHonorific = HONORIFICS_EN.exec(l);
      if (surname && withHonorific && l.slice(withHonorific[0].length).trim() === surname) return true;
    }
  }
  return false;
}

/**
 * Who announces an authored scenario line, and what they say. `speaker`
 * (the event's own `speaker` field) wins. Otherwise: a line written as the
 * nurse's speech ("护士：“…”", "Nurse Chen: …") is spoken by the nurse,
 * without the prefix (and the quotes when it is one quoted utterance); a
 * "Monitor:" line (prefix dropped) or a monitor alarm is announced at the
 * monitor; "<patient name>: '…'" (or the companion's) is that person's quote;
 * anything else — narration, other staff, the cath lab — is narrated.
 */
export function scenarioSpeech(message: string, names: SpeakerNames = {}, speaker?: LineSpeaker): { speaker: LineSpeaker; text: string } {
  const text = message.trim();
  const nurse = NURSE_PREFIX.exec(text);
  const monitor = MONITOR_PREFIX.exec(text);
  const named = NAME_PREFIX.exec(text);
  const rest = (m: RegExpExecArray | null) => (m && text.length > m[0].length ? text.slice(m[0].length).trim() : null);
  if (speaker === "nurse") return { speaker, text: unquote(rest(nurse) ?? text) };
  if (speaker === "monitor") return { speaker, text: rest(monitor) ?? text };
  if (speaker === "patient" || speaker === "companion") return { speaker, text: unquote(rest(named) ?? text) };
  if (speaker === "narrator") return { speaker, text };
  if (nurse && rest(nurse)) return { speaker: "nurse", text: unquote(rest(nurse)!) };
  if (monitor && rest(monitor)) return { speaker: "monitor", text: rest(monitor)! };
  if (MONITOR_ALARM.test(text)) return { speaker: "monitor", text };
  if (named && rest(named)) {
    if (names.patient && namesPerson(named[1]!, names.patient)) return { speaker: "patient", text: unquote(rest(named)!) };
    if (names.companion && namesPerson(named[1]!, names.companion)) return { speaker: "companion", text: unquote(rest(named)!) };
  }
  return { speaker: "narrator", text };
}

/** The names the patient and companion may be quoted by in a case's scenario lines (every locale). */
export function caseSpeakerNames(c: CaseDefinition): SpeakerNames {
  const all = (text: unknown): string[] => (typeof text === "string" ? [text] : text && typeof text === "object" ? Object.values(text as Record<string, string>) : []);
  const companion = c.patient.persona.companion;
  return { patient: all(c.patient.displayName), ...(companion ? { companion: all(companion.name) } : {}) };
}

/** Who calls a critical result through, by investigation category. */
function criticalResultKeys(c: CaseDefinition, investigationId: string): { body: RuntimeKey; line: RuntimeKey } {
  const category = c.investigations.find((i) => i.id === investigationId)?.category;
  switch (category) {
    case "imaging":
      return { body: "notify.criticalResult.body.imaging", line: "nurse.criticalResult.imaging" };
    case "bedside":
    case "procedure":
    case "record":
      return { body: "notify.criticalResult.body.bedside", line: "nurse.criticalResult.bedside" };
    default:
      // lab, microbiology, pathology, genetics: the laboratory phones it through.
      return { body: "notify.criticalResult.body", line: "nurse.criticalResult" };
  }
}

/**
 * Reactions to one domain event (empty for most events). An alarm on a
 * vital the monitor cannot read (arrest: sbp/spo2 "0") is not announced as a
 * reading; the hr alarm says there is no reading.
 */
export function reactToDomainEvent(c: CaseDefinition, event: DomainEvent, locale: string, context: ReactionContext = {}): EventReaction[] {
  const L = locale;
  switch (event.type) {
    case "result.ready": {
      if (!event.critical) return [];
      const name = investigationName(c, event.investigationId, L);
      // "The lab just called" only for laboratory tests: radiology phones imaging, a bedside test is seen at the bedside.
      const keys = criticalResultKeys(c, event.investigationId);
      return [
        { notification: { level: "critical", title: rt(L, "notify.criticalResult.title"), body: rt(L, keys.body, { name, phase: phaseLabel(c, event.phase, L) }) } },
        { staffLine: { agent: "nurse", speaker: "nurse", text: rt(L, keys.line, { name }) } },
      ];
    }
    case "vitals.alarm": {
      const unread = event.unmeasurable === true || (context.unmeasurable?.includes(event.vital) ?? false);
      if (unread && event.vital !== "hr") return [];
      const vital = vitalLabel(event.vital, L);
      const value = unread ? noReading(L) : vitalWithUnit(event.vital, event.value);
      const level = rt(L, event.level === "critical" ? "level.critical" : "level.warning");
      return [
        { notification: { level: event.level, title: rt(L, "notify.alarm.title"), body: rt(L, "notify.alarm.body", { vital, value, level }) } },
        { staffLine: { agent: "nurse", speaker: "nurse", text: rt(L, "nurse.alarm", { vital, value }) } },
      ];
    }
    case "scenario.event": {
      const def = c.physiology?.events.find((e) => e.id === event.eventId);
      if (!def?.message) return [];
      const text = t(def.message, L);
      const speech = scenarioSpeech(text, caseSpeakerNames(c), def.speaker);
      const agent = speech.speaker === "patient" || speech.speaker === "companion" ? speech.speaker : "nurse";
      return [
        { notification: { level: event.severity, title: rt(L, "notify.scenario.title"), body: text } },
        { staffLine: { agent, speaker: speech.speaker, text: speech.text } },
      ];
    }
    case "objective.completed":
      return [{ notification: { level: "info", title: rt(L, "notify.objective.title"), body: objectiveTitle(c, event.objectiveId, L) } }];
    case "case.completed":
      return [{ notification: { level: "info", title: rt(L, "notify.caseCompleted.title"), body: rt(L, "notify.caseCompleted.body") } }];
    case "case.finished":
      return [{ notification: { level: event.timedOut ? "warning" : "info", title: rt(L, "notify.finished.title"), body: rt(L, event.timedOut ? "notify.timedOut.body" : "notify.finished.body") } }];
    case "session.started":
    case "history.asked":
    case "exam.performed":
    case "order.placed":
    case "order.duplicate":
    case "result.read":
    case "phase.changed":
    case "decision.answered":
    case "intervention.applied":
    case "hint.used":
    case "time.advanced":
    case "flag.changed":
    case "note.added":
    case "action.rejected":
      return [];
    default: {
      const never: never = event;
      return never;
    }
  }
}
