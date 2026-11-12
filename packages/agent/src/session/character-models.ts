/**
 * The model a character is driven by (docs/CHARACTERS.md): the one their facility role speaks through
 * (`STAFF_AGENT`: a scrub nurse's is `agents.nurse`, an anaesthetist's `agents.attending`), with that agent's
 * request options and retries; null when it has none, or when `characters.engine` is not `llm`.
 */
import type { MindModel } from "../characters/team-mind.js";
import type { SessionKernel } from "./kernel.js";
import { staffAgent } from "./staff-voice.js";

export function characterModel(k: SessionKernel, role: string): MindModel | null {
  if (k.settings.characters.engine !== "llm") return null;
  const agent = staffAgent(role);
  const m = k.models.model(agent, false);
  if (!m.provider) return null;
  const retry = k.models.retryFor(m);
  return { provider: m.provider, agent, request: k.models.requestOptions(m), ...(retry !== undefined ? { retry } : {}) };
}
