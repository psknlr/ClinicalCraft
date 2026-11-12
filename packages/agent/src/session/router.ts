/**
 * Learner input router (docs/PROTOCOL.md §9):
 *
 *   `/name args`   → slash command
 *   `@role text`   → message addressed to `role` (`@nurse is the CBC back?`)
 *   anything else  → message to the current interlocutor (`to: null`)
 *
 * `//text` escapes a leading slash (sent as the message `/text`). Full-width
 * `／` and `＠` (Chinese IME) are accepted.
 */

export type LearnerInput =
  | { kind: "command"; name: string; args: string }
  | { kind: "message"; to: string | null; text: string };

/** Chinese role names accepted wherever an agent is named (`@护士 …`, `/talk 护士`, `/consult 上级 …`). */
export const ADDRESS_ALIASES: Readonly<Record<string, string>> = {
  护士: "nurse",
  护士长: "nurse",
  上级: "attending",
  上级医师: "attending",
  上级医生: "attending",
  老师: "attending",
  带教: "attending",
  带教老师: "attending",
  放射科: "radiologist",
  放射科医生: "radiologist",
  病理科: "pathologist",
  病理科医生: "pathologist",
  家属: "companion",
  陪同: "companion",
  患者: "patient",
  病人: "patient",
};

/** Agent name for a role word: a Chinese alias, else the word lower-cased (a leading @ is dropped). */
export function resolveAgentAlias(word: string): string {
  const w = word.trim().replace(/^[@＠]/, "");
  return Object.hasOwn(ADDRESS_ALIASES, w) ? ADDRESS_ALIASES[w]! : w.toLowerCase();
}

/**
 * The colleague an `@` mention may name, with the text after it: the longest run of up to four words (or, with no
 * space as Chinese is typed, the longest leading run of characters) that `lookup` answers for — never a bare agent
 * name (`@nurse …` addresses the nurse as before). Null when the input is not a mention or names nobody.
 */
export function parseMention<T>(text: string, lookup: (name: string) => T | null, agents: readonly string[] = []): { found: T; text: string } | null {
  const m = /^[@＠]([\s\S]+)$/u.exec(text.trim());
  if (!m) return null;
  const body = m[1]!;
  const isAgent = (w: string) => agents.includes(w.toLowerCase()) || Object.hasOwn(ADDRESS_ALIASES, w);
  const words = [...body.matchAll(/[^\s,，:：]+/gu)];
  for (let n = Math.min(4, words.length); n >= 1; n--) {
    const last = words[n - 1]!;
    const name = body.slice(0, last.index! + last[0].length);
    if (n === 1 && isAgent(name)) break;
    const found = lookup(name);
    if (found !== null) return { found, text: body.slice(last.index! + last[0].length).replace(/^[\s,:，：]+/u, "").trim() };
  }
  // no space after a Chinese name: "@林护士请把持针器递给我"
  const first = words[0]?.[0] ?? "";
  if (/[\u4e00-\u9fff]/u.test(first)) {
    for (let k = Math.min(first.length - 1, 8); k >= 2; k--) {
      const name = first.slice(0, k);
      if (isAgent(name)) continue;
      const found = lookup(name);
      if (found !== null) return { found, text: body.slice(k).replace(/^[\s,:，：]+/u, "").trim() };
    }
  }
  return null;
}

const COMMAND_RE = /^[/／]([^\s/／]*)\s*([\s\S]*)$/;
const ADDRESS_RE = /^[@＠]([A-Za-z][A-Za-z0-9_-]*)(?:[\s,:，：]+([\s\S]*))?$/;
/** Longest Chinese alias first, so "护士长" wins over "护士". */
const ALIASES_BY_LENGTH = Object.keys(ADDRESS_ALIASES).sort((a, b) => b.length - a.length);

/**
 * Parse one line of learner input. `@护士 …` (and the IME-friendly no-space
 * form `@护士血压多少`) address the agent the alias names; with `agents`
 * given, an alias whose agent is not in the case stays plain text.
 */
export function parseLearnerInput(text: string, agents?: readonly string[]): LearnerInput {
  const input = text.trim();
  if (/^[/／]{2}/.test(input)) return { kind: "message", to: null, text: input.slice(1) };
  const command = COMMAND_RE.exec(input);
  if (command) return { kind: "command", name: command[1]!.toLowerCase(), args: command[2]!.trim() };
  const address = ADDRESS_RE.exec(input);
  if (address) return { kind: "message", to: address[1]!.toLowerCase(), text: (address[2] ?? "").trim() };
  if (/^[@＠]/.test(input)) {
    const body = input.slice(1);
    const alias = ALIASES_BY_LENGTH.find((a) => body.startsWith(a) && (!agents || agents.includes(ADDRESS_ALIASES[a]!)));
    if (alias) return { kind: "message", to: ADDRESS_ALIASES[alias]!, text: body.slice(alias.length).replace(/^[\s,:，：]+/, "").trim() };
  }
  return { kind: "message", to: null, text: input };
}
