/**
 * `@role text` addressing for the conversation input (the session router only
 * knows agent ids; the UI also accepts Chinese role names and full-width @).
 */

/** Chinese / English aliases for `@role` addressing. */
export const ADDRESS_ALIASES: Record<string, string> = {
  护士: "nurse",
  护士长: "nurse",
  上级: "attending",
  上级医师: "attending",
  老师: "attending",
  带教: "attending",
  放射科: "radiologist",
  放射科医生: "radiologist",
  病理科: "pathologist",
  病理科医生: "pathologist",
  家属: "companion",
  陪同: "companion",
  患者: "patient",
  病人: "patient",
};

/** Resolve `@role text` (incl. Chinese aliases) → {to, text}; unknown roles stay plain text. */
export function parseAddress(raw: string, available: string[]): { to: string | null; text: string } {
  const input = raw.trim();
  const m = /^[@＠](\S+?)[\s,:，：]+([\s\S]*)$/.exec(input) ?? /^[@＠](\S+)$/.exec(input);
  if (!m) return { to: null, text: input };
  const key = m[1];
  const role = ADDRESS_ALIASES[key] ?? key.toLowerCase();
  if (available.includes(role)) return { to: role, text: (m[2] ?? "").trim() };
  // Chinese needs no space: "@护士现在血压多少" → nurse, "现在血压多少" (longest alias first).
  const body = input.slice(1);
  const alias = Object.keys(ADDRESS_ALIASES)
    .sort((a, b) => b.length - a.length)
    .find((a) => body.startsWith(a) && available.includes(ADDRESS_ALIASES[a]));
  if (alias) return { to: ADDRESS_ALIASES[alias], text: body.slice(alias.length).replace(/^[\s,:，：]+/, "").trim() };
  return { to: null, text: input };
}
