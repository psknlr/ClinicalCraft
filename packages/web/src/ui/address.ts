/**
 * `@role text` addressing for the conversation input: Chinese role names and
 * full-width @ use the agent router's alias table (`ADDRESS_ALIASES`, shared
 * with the CLI, exec and MCP), so `@护士 …` means the same everywhere. A
 * colleague may also be named — by name, or by the position they hold in this
 * encounter's team: `@一助`, `@二助`, `@扶镜手`, `@术者`, `@主刀`, `@first
 * assistant`, `@camera holder`, `@surgeon` (docs/GLOSSARY.md "position",
 * "camera holder") — through the agent's own mention parse and its one resolver
 * (`parseMention`, `lookupStaff` and its position tier: the case's team as it
 * is, the camera holder by who holds the camera port), never a table of the
 * web's own (`staffAddress`). A position the learner holds themselves names
 * nobody else: holding the first assistant's place, `@一助` is the learner — the
 * colleague whose place it is stands by (they can still be named) —, so it is
 * said so and nothing is sent.
 */
import { ADDRESS_ALIASES, encounterRoom, lookupStaff, parseMention, positionWord, staffAgent } from "@clinicalcraft/agent";
import { refOfBody, type CaseDefinition, type FacilityDefinition, type Place, type SessionState } from "@clinicalcraft/core";

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
 * answer to it (their staff ids); `self` — a position the learner holds themselves (`place`): nobody else answers to
 * it. Null: the mention names nobody — a role (`parseAddress`), or plain text. The same parse and the same room-aware
 * resolver as the session's own (`parseMention` with `lookupStaff`, its position tier reading the team as it is in
 * this encounter), so the web never decides who holds a position.
 */
export type StaffAddress =
  | { kind: "one"; staffId: string; role: string; agent: string; text: string }
  | { kind: "ambiguous"; staffIds: string[]; text: string }
  | { kind: "self"; place: Place; text: string };

/** A line's `@` mention of a colleague (see `StaffAddress`): never a bare agent name (`@nurse …` stays `parseAddress`'s). */
export function staffAddress(raw: string, ctx: AddressContext, available: readonly string[] = []): StaffAddress | null {
  const room = encounterRoom(ctx.caseDef, ctx.facility);
  // the learner's own place (core `refOfBody`): its member's staff id — the colleague who stands by while they hold it
  const own = ctx.state.seat ? refOfBody(ctx.caseDef, ctx.state) : null;
  let asked = "";
  const lookup = (name: string) => {
    const r = lookupStaff(ctx.facility, name, room, { caseDef: ctx.caseDef, state: ctx.state });
    if (r.kind === "none") return null;
    asked = name;
    return r;
  };
  const mention = parseMention(raw, lookup, available);
  if (!mention) return null;
  const found = mention.found;
  // a position word naming the learner's own place: they hold it — not the colleague standing by (still named by name)
  if (ctx.state.seat && typeof own === "string" && positionWord(asked) !== null) {
    const others = (found.kind === "one" ? [found.staff] : found.staff).filter((x) => x.id !== own);
    if (!others.length) return { kind: "self", place: ctx.state.seat, text: mention.text };
    if (others.length === 1) return { kind: "one", staffId: others[0]!.id, role: others[0]!.role, agent: staffAgent(others[0]!.role), text: mention.text };
    return { kind: "ambiguous", staffIds: others.map((x) => x.id), text: mention.text };
  }
  if (found.kind === "one") return { kind: "one", staffId: found.staff.id, role: found.staff.role, agent: staffAgent(found.staff.role), text: mention.text };
  return { kind: "ambiguous", staffIds: found.staff.map((x) => x.id), text: mention.text };
}
