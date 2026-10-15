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
