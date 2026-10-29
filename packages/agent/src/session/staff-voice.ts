/**
 * Colleagues by name (docs/PROTOCOL.md §4): when the learner addresses one facility staff member
 * (`user_message.staff`), that person answers — under their own name, as their own role, with their own
 * conversation — through the agent profile that speaks for their role (`STAFF_AGENT`: a porter or a
 * receptionist speaks through the nurse profile's model and tools). Two nurses share a profile, never a voice:
 * the turn's events carry the staff id (`turn_started` / `agent_message` `staffId`), so a front-end animates
 * and labels the one who spoke, whoever the learner turned to meanwhile.
 */
import { t, type FacilityDefinition } from "@clinicalcraft/core";
import type { AgentRole } from "../protocol.js";

/** The agent profile that speaks for each facility staff role. */
export const STAFF_AGENT: Readonly<Record<string, string>> = {
  nurse: "nurse",
  radiologist: "radiologist",
  pathologist: "pathologist",
  attending: "attending",
  "lab-tech": "pathologist",
  pharmacist: "nurse",
  receptionist: "nurse",
  paramedic: "nurse",
  porter: "nurse",
};

/** The profile a staff role speaks through (default: the nurse). */
export function staffAgent(role: string): string {
  return STAFF_AGENT[role] ?? "nurse";
}

/** One staff member speaking: facility id (no prefix), role, display name in the session language. */
export interface StaffVoice {
  staffId: string;
  role: string;
  name: string;
}

/**
 * The staff member a learner message addresses (`staff:<id>` or the id), when the facility has them and their role
 * speaks through `agent`; null otherwise (the agent answers as itself).
 */
export function staffVoice(facility: FacilityDefinition | null | undefined, ref: string | undefined | null, agent: AgentRole, locale: string): StaffVoice | null {
  if (!facility || typeof ref !== "string" || !ref.trim()) return null;
  const id = ref.trim().replace(/^staff:/, "");
  const s = facility.staff.find((x) => x.id === id);
  if (!s || staffAgent(s.role) !== agent) return null;
  return { staffId: s.id, role: s.role, name: t(s.name, locale) };
}

/** The conversation one staff member keeps with the learner (`nurse#ed-nurse`); the agent's own without a voice. */
export function conversationKey(agent: AgentRole, voice: StaffVoice | null | undefined): string {
  return voice ? `${agent}#${voice.staffId}` : agent;
}

/** The agent profile behind a conversation key (`nurse#ed-nurse` → `nurse`). */
export function agentOfKey(key: string): string {
  const i = key.indexOf("#");
  return i < 0 ? key : key.slice(0, i);
}
