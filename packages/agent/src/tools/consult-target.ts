/**
 * Who a `consult` reaches (docs/PROTOCOL.md §3): a named colleague — a facility staff id, a staff member's name, a
 * role or title ("anaesthetist", "receptionist") or a case consultant's name — resolves to ONE person, who answers
 * under their own name through the profile that speaks for their role (`STAFF_AGENT`). A bare role keeps the old
 * behaviour (the role's own agent). Nothing unresolved is silently sent to the nurse: it is refused with who can
 * be asked.
 */
import { t, type CaseDefinition, type FacilityDefinition, type LocalizedText } from "@clinicalcraft/core";
import { staffAgent, type StaffVoice } from "../session/staff-voice.js";

/** A resolved recipient: the agent profile and, for a named colleague, the voice they answer in. */
export interface ConsultTarget {
  agent: string;
  voice: StaffVoice | null;
  /** The recipient in words ("Anaesthetist (attending)"). */
  label: string;
}

export type ConsultResolution = { ok: true; target: ConsultTarget } | { ok: false; asked: string; candidates: string[] };

/** Words a title may be asked by, in any locale → a word in staff names (title matching is by name). */
const TITLE_ALIASES: readonly (readonly [RegExp, string[]])[] = [
  [/an(a)?esthe(t|s)i(st|a)|麻醉/i, ["anaesthe", "anesthe", "麻醉"]],
  [/reception|admission|front desk|登记|接待|前台/i, ["reception", "admission", "登记", "接待"]],
  [/porter|transport|护工|运送/i, ["porter", "护工", "运送"]],
  [/circulat|巡回/i, ["circulating", "巡回"]],
  [/scrub|洗手护士/i, ["scrub", "洗手"]],
];

const norm = (s: string) => s.toLowerCase().replace(/^staff:/, "").replace(/\b(dr|doctor|nurse|mr|mrs|ms)\.?\s+/g, "").replace(/\s+/g, " ").trim();

function names(text: LocalizedText): string[] {
  return typeof text === "string" ? [text] : Object.values(text as Record<string, string>);
}

/** The agent profile a facility staff role speaks through (a consultant through the attending's). */
export function consultAgentFor(role: string): string {
  return role === "consultant" ? "attending" : staffAgent(role);
}

/**
 * Resolve a `consult` request's `staff` (id, name, title or role) to one colleague. Facility staff first (id, then
 * name, then title, then role); then the case's named consultants (`npcs[].name`, answering through the
 * attending's profile). Ties go to the first in facility order (deterministic).
 */
export function resolveConsultStaff(c: CaseDefinition, facility: FacilityDefinition | null | undefined, asked: string, locale: string): ConsultResolution {
  const q = norm(asked);
  const staff = facility?.staff ?? [];
  const voiceOf = (s: (typeof staff)[number]): ConsultTarget => {
    const name = t(s.name, locale);
    return { agent: consultAgentFor(s.role), voice: { staffId: s.id, role: s.role, name }, label: `${name} (${s.role})` };
  };
  if (q) {
    const byId = staff.find((s) => norm(s.id) === q || norm(s.id).endsWith(`.${q}`));
    if (byId) return { ok: true, target: voiceOf(byId) };
    const byName = staff.find((s) => names(s.name).some((n) => norm(n) === q));
    if (byName) return { ok: true, target: voiceOf(byName) };
    const title = TITLE_ALIASES.find(([re]) => re.test(asked))?.[1];
    if (title) {
      const titled = staff.find((s) => names(s.name).some((n) => title.some((w) => n.toLowerCase().includes(w))) || title.some((w) => s.id.toLowerCase().includes(w)));
      if (titled) return { ok: true, target: voiceOf(titled) };
    }
    const byRole = staff.find((s) => s.role === q);
    if (byRole) return { ok: true, target: voiceOf(byRole) };
    // a case consultant by name (the anaesthetist of a case played without a facility)
    const consultant = c.npcs.findIndex((n) => n.role === "consultant" && n.name && names(n.name).some((x) => norm(x) === q || (title ?? []).some((w) => x.toLowerCase().includes(w))));
    if (consultant >= 0) {
      const n = c.npcs[consultant]!;
      const name = n.name ? t(n.name, locale) : asked;
      return { ok: true, target: { agent: "attending", voice: { staffId: `consultant-${consultant + 1}`, role: "consultant", name }, label: `${name} (consultant)` } };
    }
  }
  const candidates = [
    ...staff.map((s) => `${t(s.name, locale)} [staff:${s.id}, ${s.role}]`),
    ...c.npcs.filter((n) => n.role === "consultant" && n.name).map((n) => `${t(n.name!, locale)} [consultant]`),
  ].slice(0, 16);
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
