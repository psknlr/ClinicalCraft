/**
 * Authored teaching corrections (case `npcs[].corrections`, docs/CASE_AUTHORING.md §7.3): which a message to a
 * colleague triggers, and whether a reply made them. Pure string matching — the same in every runtime.
 */
import type { CaseDefinition, NpcCorrection } from "../schema/case.js";

const lower = (s: string) => s.normalize("NFKC").toLowerCase();

/** True when `text` contains at least one phrase of every group (case-insensitive). */
export function correctionMatches(c: Pick<NpcCorrection, "match">, text: string): boolean {
  const t = lower(text);
  return c.match.every((group) => group.some((phrase) => t.includes(lower(phrase))));
}

/** True when a reply shows the correction (one of its `marks`). */
export function correctionMade(c: Pick<NpcCorrection, "marks">, reply: string): boolean {
  const t = lower(reply);
  return c.marks.some((m) => t.includes(lower(m)));
}

/**
 * The corrections a message to a colleague triggers: the case NPCs of `role`, and a named consultant whose name
 * matches `speakerName` (the anaesthetist speaking through the attending's profile), in case order.
 */
export function correctionsFor(c: CaseDefinition, role: string, speakerName: string | null, text: string): NpcCorrection[] {
  const named = (n: CaseDefinition["npcs"][number]) => {
    if (!speakerName || !n.name) return false;
    const names = typeof n.name === "string" ? [n.name] : Object.values(n.name as Record<string, string>);
    return names.some((x) => lower(speakerName).includes(lower(x)));
  };
  return c.npcs
    .filter((n) => n.role === role || (n.role === "consultant" && named(n)))
    .flatMap((n) => n.corrections)
    .filter((x) => correctionMatches(x, text));
}
