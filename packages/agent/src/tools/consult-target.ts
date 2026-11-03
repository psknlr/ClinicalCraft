/**
 * Who a named colleague is (docs/PROTOCOL.md §3): ONE room-aware resolver for every way the learner names a
 * colleague — a typed `@` mention, `consult {staff}`, `delegate_task`, the staff picker — so "@Nurse Lim", "Lim", the
 * staff id and the OR 7 scrub nurse picked from the list reach the same person, and "anaesthetist" and "麻醉医生"
 * the same anaesthetist. A named colleague answers under their own name through the profile that speaks for their
 * role (`STAFF_AGENT`). Nothing unresolved is silently sent to the nurse: it is refused with who can be asked, and
 * a name several people answer to equally is refused with the choice.
 */
import { assignPatientSlot, t, type CaseDefinition, type FacilityDefinition, type LocalizedText } from "@clinicalcraft/core";
import { staffAgent, type StaffVoice } from "../session/staff-voice.js";

/** A resolved recipient: the agent profile and, for a named colleague, the voice they answer in. */
export interface ConsultTarget {
  agent: string;
  voice: StaffVoice | null;
  /** The recipient in words ("Anaesthetist (attending)"). */
  label: string;
}

export type ConsultResolution = { ok: true; target: ConsultTarget } | { ok: false; asked: string; candidates: string[]; ambiguous?: true };

type Staff = FacilityDefinition["staff"][number];

/** How a lookup came out: one colleague; several named alike, equally placed (ask which); nobody. */
export type StaffLookup = { kind: "one"; staff: Staff } | { kind: "ambiguous"; staff: Staff[] } | { kind: "none" };

/** Words a title may be asked by, in any locale → a word in staff names or ids (title matching is by name). */
const TITLE_ALIASES: readonly (readonly [RegExp, string[]])[] = [
  [/an(a)?esthe(t|s)i(st|a|olog)|麻醉/i, ["anaesthe", "anesthe", "麻醉"]],
  [/reception|admission|front desk|登记|接待|前台/i, ["reception", "admission", "登记", "接待"]],
  [/porter|transport|护工|运送/i, ["porter", "护工", "运送"]],
  [/circulat|巡回/i, ["circulating", "巡回"]],
  [/scrub|洗手护士/i, ["scrub", "洗手"]],
];

const norm = (s: string) => s.toLowerCase().replace(/^staff:/, "").replace(/^[@＠]/u, "").replace(/\b(dr|doctor|nurse|mr|mrs|ms)\.?\s+/g, "").replace(/\s+/g, " ").trim();
/** A name without what it says about the role ("Dr Tanaka (anaesthesia)" → "tanaka"; "林护士（洗手）" → "林护士"). */
const core = (s: string) => norm(s.replace(/\s*[（(][^）)]*[）)]\s*/gu, " "));

function names(text: LocalizedText): string[] {
  return typeof text === "string" ? [text] : Object.values(text as Record<string, string>);
}

/** The agent profile a facility staff role speaks through (a consultant through the attending's). */
export function consultAgentFor(role: string): string {
  return role === "consultant" ? "attending" : staffAgent(role);
}

/** The room of the encounter: the case team's operating room, else the room of the patient's assigned place. */
export function encounterRoom(c: CaseDefinition, facility: FacilityDefinition | null | undefined): string | null {
  if (c.team?.room) return c.team.room;
  return facility?.patientSlots?.length ? (assignPatientSlot(facility, c)?.room ?? null) : null;
}

/**
 * The facility colleague a request names (see the module docs): id → a room's post (`….anaesthetist`) → name (with
 * or without the title and the role in brackets, in any language) → title → role. Within the first of these that matches anyone, colleagues in `room`
 * (the encounter's) come first: one there — or one in all — is the answer; several equally placed are ambiguous.
 */
export function lookupStaff(facility: FacilityDefinition | null | undefined, asked: string, room: string | null): StaffLookup {
  const staff = facility?.staff ?? [];
  const q = norm(asked);
  if (!q || !staff.length) return { kind: "none" };
  const byId = staff.find((s) => norm(s.id) === q);
  if (byId) return { kind: "one", staff: byId };
  const title = TITLE_ALIASES.find(([re]) => re.test(asked))?.[1];
  const tiers: ((s: Staff) => boolean)[] = [
    // a room's own id for the post (`or-7.anaesthetist` asked as "anaesthetist")
    (s) => norm(s.id).endsWith(`.${q}`),
    (s) => names(s.name).some((n) => norm(n) === q || core(n) === core(asked)),
    (s) => !!title && (names(s.name).some((n) => title.some((w) => n.toLowerCase().includes(w))) || title.some((w) => s.id.toLowerCase().includes(w))),
    (s) => s.role === q,
  ];
  for (const tier of tiers) {
    const all = staff.filter(tier);
    if (!all.length) continue;
    const here = room ? all.filter((s) => s.room === room) : [];
    const best = here.length ? here : all;
    return best.length === 1 ? { kind: "one", staff: best[0]! } : { kind: "ambiguous", staff: best };
  }
  return { kind: "none" };
}

/** A colleague as the choice lists them: name, staff id, role (and room). */
export function staffChoice(s: Staff, locale: string): string {
  return `${t(s.name, locale)} [staff:${s.id}, ${s.role}${s.room ? `, ${s.room}` : ""}]`;
}

/**
 * Resolve a `consult` request's `staff` (id, name, title or role) to one colleague: the facility's (room-aware,
 * `lookupStaff`), else the case's named consultants (`npcs[].name`, answering through the attending's profile).
 */
export function resolveConsultStaff(c: CaseDefinition, facility: FacilityDefinition | null | undefined, asked: string, locale: string): ConsultResolution {
  const q = norm(asked);
  const staff = facility?.staff ?? [];
  const voiceOf = (s: Staff): ConsultTarget => {
    const name = t(s.name, locale);
    return { agent: consultAgentFor(s.role), voice: { staffId: s.id, role: s.role, name }, label: `${name} (${s.role})` };
  };
  if (q) {
    const found = lookupStaff(facility, asked, encounterRoom(c, facility));
    if (found.kind === "one") return { ok: true, target: voiceOf(found.staff) };
    if (found.kind === "ambiguous") return { ok: false, asked, candidates: found.staff.map((s) => staffChoice(s, locale)).slice(0, 16), ambiguous: true };
    // a case consultant by name (the anaesthetist of a case played without a facility)
    const title = TITLE_ALIASES.find(([re]) => re.test(asked))?.[1];
    const consultant = c.npcs.findIndex((n) => n.role === "consultant" && n.name && names(n.name).some((x) => norm(x) === q || core(x) === core(asked) || (title ?? []).some((w) => x.toLowerCase().includes(w))));
    if (consultant >= 0) {
      const n = c.npcs[consultant]!;
      const name = n.name ? t(n.name, locale) : asked;
      return { ok: true, target: { agent: "attending", voice: { staffId: `consultant-${consultant + 1}`, role: "consultant", name }, label: `${name} (consultant)` } };
    }
  }
  const candidates = [...staff.map((s) => staffChoice(s, locale)), ...c.npcs.filter((n) => n.role === "consultant" && n.name).map((n) => `${t(n.name!, locale)} [consultant]`)].slice(0, 16);
  return { ok: false, asked, candidates };
}

/** The title a name carries ("Dr Tanaka (anaesthesia)" and "Anaesthetist" both: the anaesthetist), or null. */
function titleOf(name: string): RegExp | null {
  return TITLE_ALIASES.find(([re]) => re.test(name))?.[0] ?? null;
}

/**
 * The case consultants a named speaker is (their name, or the same title: OR 7's "Dr Tanaka (anaesthesia)" is the
 * case's "Anaesthetist"), in case order.
 */
export function consultantsFor(c: CaseDefinition, speakerName: string | null | undefined): CaseDefinition["npcs"] {
  if (!speakerName) return [];
  const q = norm(speakerName);
  const title = titleOf(speakerName);
  return c.npcs.filter((n) => n.role === "consultant" && n.name && names(n.name).some((x) => norm(x) === q || q.includes(norm(x)) || (title !== null && title.test(x))));
}

/** The consultant knowledge of a case for a named speaker (see `consultantsFor`). */
export function consultantKnowledge(c: CaseDefinition, speakerName: string | undefined, locale: string): string[] {
  return consultantsFor(c, speakerName).map((n) => t(n.knowledge, locale));
}
