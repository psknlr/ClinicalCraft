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

const COMMAND_RE = /^[/／]([^\s/／]*)\s*([\s\S]*)$/;
const ADDRESS_RE = /^[@＠]([A-Za-z][A-Za-z0-9_-]*)(?:[\s,:，：]+([\s\S]*))?$/;

/** Parse one line of learner input. */
export function parseLearnerInput(text: string): LearnerInput {
  const input = text.trim();
  if (/^[/／]{2}/.test(input)) return { kind: "message", to: null, text: input.slice(1) };
  const command = COMMAND_RE.exec(input);
  if (command) return { kind: "command", name: command[1]!.toLowerCase(), args: command[2]!.trim() };
  const address = ADDRESS_RE.exec(input);
  if (address) return { kind: "message", to: address[1]!.toLowerCase(), text: (address[2] ?? "").trim() };
  return { kind: "message", to: null, text: input };
}
