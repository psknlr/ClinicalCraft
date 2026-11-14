/**
 * `@role text` addressing for the conversation input: Chinese role names and
 * full-width @ use the agent router's alias table (`ADDRESS_ALIASES`, shared
 * with the CLI, exec and MCP), so `@护士 …` means the same everywhere. A
 * colleague may also be named — by name, or by the position they hold in this
 * encounter's team: `@一助`, `@二助`, `@扶镜手`, `@术者`, `@主刀`, `@first
 * assistant`, `@camera holder` (docs/GLOSSARY.md "position", "camera holder") —
 * through the agent's own mention parse and its one resolver (`parseMention`,
 * `lookupStaff` and its position tier: the case's team as it is, the camera
 * holder by who holds the camera port), never a table of the web's own
 * (`staffAddress`).
 */
import { ADDRESS_ALIASES, encounterRoom, lookupStaff, parseMention, staffAgent } from "@clinicalcraft/agent";
import type { CaseDefinition, FacilityDefinition, SessionState } from "@clinicalcraft/core";

export { ADDRESS_ALIASES };

/** Resolve `@role text` (incl. Chinese aliases) → {to, text}; unknown roles stay plain text. */
export function parseAddress(raw: string, available: string[]): { to: string | null; text: string } {
  const input = raw.trim();
  const m = /^[@＠](\S+?)[\s,:，：]+([\s\S]*)$/.exec(input) ?? /^[@＠](\S+)$/.exec(input);
  if (!m) return { to: null, text: input };
  const key = m[1];
  const role = (Object.hasOwn(ADDRESS_ALIASES, key) ? ADDRESS_ALIASES[key] : undefined) ?? key.toLowerCase();
  if (available.includes(role)) return { to: role, text: (m[2] ?? "").trim() };
  // Chinese needs no space: "@护士现在血压多少" → nurse, "现在血压多少" (longest alias first).
  const body = input.slice(1);
  const alias = Object.keys(ADDRESS_ALIASES)
    .sort((a, b) => b.length - a.length)
    .find((a) => body.startsWith(a) && available.includes(ADDRESS_ALIASES[a]!));
  if (alias) return { to: ADDRESS_ALIASES[alias]!, text: body.slice(alias.length).replace(/^[\s,:，：]+/, "").trim() };
  return { to: null, text: input };
}

/** Where a mention is resolved: the facility's staff, the case (its team) and the encounter's state. */
export interface AddressContext {
  facility: FacilityDefinition | null;
  caseDef: CaseDefinition;
  state: SessionState;
}

/**
 * A colleague an `@` mention names (`@一助 请拉一下`, `@first assistant …`, `@扶镜手 …`, `@术者 …`, `@Lin Xiao …`): `one` —
 * who, the profile their role speaks through (`agent`) and the rest of the line; `ambiguous` — several equally placed
 * answer to it (their staff ids). Null: the mention names nobody — a role (`parseAddress`), or plain text. The same
 * parse and the same room-aware resolver as the session's own (`parseMention` with `lookupStaff`, its position tier
 * reading the team as it is in this encounter), so the web never decides who holds a position.
 */
export type StaffAddress = { kind: "one"; staffId: string; role: string; agent: string; text: string } | { kind: "ambiguous"; staffIds: string[]; text: string };

/** A line's `@` mention of a colleague (see `StaffAddress`): never a bare agent name (`@nurse …` stays `parseAddress`'s). */
export function staffAddress(raw: string, ctx: AddressContext, available: readonly string[] = []): StaffAddress | null {
  const room = encounterRoom(ctx.caseDef, ctx.facility);
  const lookup = (name: string) => {
    const r = lookupStaff(ctx.facility, name, room, { caseDef: ctx.caseDef, state: ctx.state });
    return r.kind === "none" ? null : r;
  };
  const mention = parseMention(raw, lookup, available);
  if (!mention) return null;
  const found = mention.found;
  if (found.kind === "one") return { kind: "one", staffId: found.staff.id, role: found.staff.role, agent: staffAgent(found.staff.role), text: mention.text };
  return { kind: "ambiguous", staffIds: found.staff.map((x) => x.id), text: mention.text };
}
