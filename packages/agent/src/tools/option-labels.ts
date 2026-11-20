/**
 * A decision's options as every learner-facing surface presents them (docs/PROTOCOL.md §3): lettered A, B, C… in
 * presentation order (core `presentedOptions`: a deterministic shuffle per case and decision), never by their
 * authored ids — authors often name options by role ("supported", "alternative-1"), which would give the answer
 * away. One helper for `list_options(decisions)`, `/board` and the web case board (they show the letters),
 * `answer_decision`, `/answer` and a learner action's tool input (they read them back) and the MCP resources (an
 * attempt's options as letters).
 *
 * What a caller writes is split into tokens by one tokenizer (`optionTokens`): "A, C" in one item is two tokens,
 * and so are "A C", "Ａ，Ｃ", "A、C" and "A+C" (as the CLI shows several options). A token names an option by
 *   - its letter, in any case ("A", "b"; full-width "Ａ", a bracketed "[A]" and a list marker's "A." or "B)" too),
 *   - else its 1-based number in that order ("2"),
 *   - else its exact authored id (callers that predate the letters; no listing shows ids), else that id in
 *     another case when only one option has it.
 * A letter or number in range is always the presented option, also when an authored id is spelt the same (the
 * schema allows one-letter ids such as "a"…"f"): callers that hold authored ids — the reference walkthrough, a
 * learner action's tool input — pass the letters (`optionLabelsFor`). The same option named twice counts once
 * (`resolveOptionTokens`).
 */
import { presentedOptions, type CaseDefinition } from "@clinicalcraft/core";

/** An option with the letter it is presented under. */
export interface LabelledOption<O> {
  /** "A", "B", … in presentation order ("AA" follows "Z"). */
  label: string;
  option: O;
}

/** The letter of the option presented at `index` (0 → "A", 25 → "Z", 26 → "AA"). */
export function optionLabel(index: number): string {
  let n = Math.max(0, Math.floor(index)) + 1;
  let label = "";
  while (n > 0) {
    label = String.fromCharCode(65 + ((n - 1) % 26)) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

/** A decision's options in presentation order (`presentedOptions`), each with its letter. */
export function labelledOptions<O>(c: Pick<CaseDefinition, "id">, decision: { id: string; options: readonly O[] }): LabelledOption<O>[] {
  return presentedOptions(c, decision).map((option, i) => ({ label: optionLabel(i), option }));
}

/**
 * What separates option tokens within one item: whitespace, commas (",", "，"), "、", semicolons (";", "；") and
 * plus signs ("+", "＋": the CLI shows several options as "A+C"). No authored id contains any of them.
 */
const TOKEN_SEPARATORS = /[\s,，、;；+＋]+/u;

/**
 * The option tokens of an `option_ids` value (an array of items, or one string): each item split at whitespace,
 * commas, "、", semicolons and plus signs ("A, C" → "A", "C"; "Ａ，Ｃ" → "Ａ", "Ｃ"; "A+C" → "A", "C"), without the
 * empty pieces — so an item of separators only (",", "、") gives none. Anything else (a number, an object) gives none.
 */
export function optionTokens(value: unknown): string[] {
  const items = Array.isArray(value) ? value : [value];
  return items.flatMap((item) => (typeof item === "string" ? item.split(TOKEN_SEPARATORS) : [])).filter((token) => token.length > 0);
}

/**
 * A token as the text a letter or number is read from: trimmed, full-width forms in ASCII ("Ａ" → "A", "２" → "2",
 * "（" → "("), without one pair of surrounding brackets ("[A]", "(B)", "（Ｂ）") — else without one list marker's
 * trailing ".", ")" or "。" ("A.", "B)", "Ｃ）", "2。"; no authored id contains ")" or "。", and exact ids are
 * matched against the token as typed). Shared with the decision references (`decision-refs.ts`).
 */
export function tokenText(token: string): string {
  const half = token.trim().replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  const bracketed = /^[[(]\s*([^\])]*?)\s*[\])]$/.exec(half);
  return bracketed ? bracketed[1]! : half.replace(/\s*[.)。]$/u, "");
}

/** The option a token names (letter, 1-based number, exact authored id — see the module docs), or undefined. */
export function resolveOptionToken<O extends { id: string }>(options: readonly LabelledOption<O>[], token: string): LabelledOption<O> | undefined {
  const label = tokenText(token).toUpperCase();
  if (!label) return undefined;
  const byLabel = options.find((o) => o.label === label);
  if (byLabel) return byLabel;
  if (/^\d+$/.test(label)) {
    const n = Number(label);
    if (n >= 1 && n <= options.length) return options[n - 1];
  }
  const id = token.trim();
  const exact = options.find((o) => o.option.id === id);
  if (exact) return exact;
  const folded = options.filter((o) => o.option.id.toLowerCase() === id.toLowerCase());
  return folded.length === 1 ? folded[0] : undefined;
}

/** The options some tokens name: each chosen option once, in the order first named, and the tokens naming none (once each). */
export interface ResolvedOptions<O> {
  chosen: LabelledOption<O>[];
  unresolved: string[];
}

/** Resolve tokens (`optionTokens`) against a decision's lettered options; "A" and "1" naming the same option count once. */
export function resolveOptionTokens<O extends { id: string }>(options: readonly LabelledOption<O>[], tokens: readonly string[]): ResolvedOptions<O> {
  const chosen: LabelledOption<O>[] = [];
  const unresolved: string[] = [];
  for (const token of tokens) {
    const o = resolveOptionToken(options, token);
    if (!o) {
      if (!unresolved.includes(token)) unresolved.push(token);
    } else if (!chosen.includes(o)) chosen.push(o);
  }
  return { chosen, unresolved };
}

/**
 * The letters of authored option ids, for callers that hold ids (an id the decision lacks is kept as it is):
 * tool input in the vocabulary the tool reads, whatever the ids look like.
 */
export function optionLabelsFor(c: Pick<CaseDefinition, "id">, decision: { id: string; options: readonly { id: string }[] }, ids: readonly string[]): string[] {
  const labelled = labelledOptions(c, decision);
  return ids.map((id) => labelled.find((o) => o.option.id === id)?.label ?? id);
}
