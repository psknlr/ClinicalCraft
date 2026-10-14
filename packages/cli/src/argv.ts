import { m } from "./i18n.js";

/**
 * A small, dependency-free argv parser (no CLI framework):
 *
 *   --flag value · --flag=value · -p value · -pvalue · --no-flag (booleans)
 *   repeated / comma-separated list flags · `--` ends options · `-` is a positional
 *
 * Unknown flags and bad values throw `UsageError` (exit code 2) with a typo
 * suggestion ("did you mean --model?").
 */

/** Text in both UI languages. */
export interface Localized {
  en: string;
  zh: string;
}

export type FlagType = "boolean" | "string" | "number" | "list";

export interface FlagSpec {
  /** Long name without dashes (kebab-case), e.g. "output-format". */
  name: string;
  /** Single-letter short alias, e.g. "p". */
  short?: string;
  /** Extra long names, e.g. ["print"]. */
  aliases?: string[];
  type: FlagType;
  description: Localized;
  /** Placeholder shown in help, e.g. "<id>". */
  valueName?: string;
  /** Allowed values (string/list flags). */
  choices?: readonly string[];
  /** Omit from help. */
  hidden?: boolean;
}

export interface ParsedArgs {
  /** Values keyed by the spec's long `name`. */
  flags: Record<string, string | number | boolean | string[]>;
  positionals: string[];
  /** Tokens after a bare `--`. */
  rest: string[];
}

/** A usage error: exit code 2, printed with an optional hint. */
export class UsageError extends Error {
  readonly exitCode = 2;
  constructor(
    message: string,
    readonly hint?: string,
  ) {
    super(message);
    this.name = "UsageError";
  }
}

/** Damerau–Levenshtein (optimal string alignment) distance. */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array<number>(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) d[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
    }
  }
  return d[m]![n]!;
}

/**
 * Closest candidate to `input` (case-insensitive), or null when nothing is
 * plausibly a typo. A candidate that starts with the input also counts.
 */
export function suggest(input: string, candidates: readonly string[]): string | null {
  const needle = input.toLowerCase();
  if (!needle) return null;
  let best: string | null = null;
  let bestScore = Infinity;
  for (const candidate of candidates) {
    const c = candidate.toLowerCase();
    if (c === needle) return candidate;
    const distance = editDistance(needle, c);
    const limit = Math.max(1, Math.min(3, Math.floor(Math.max(needle.length, c.length) / 3)));
    let score = distance <= limit ? distance : Infinity;
    if (needle.length >= 2 && c.startsWith(needle)) score = Math.min(score, 0.5 + (c.length - needle.length) / 100);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return Number.isFinite(bestScore) ? best : null;
}

interface FlagIndex {
  long: Map<string, FlagSpec>;
  short: Map<string, FlagSpec>;
}

function indexSpecs(specs: readonly FlagSpec[]): FlagIndex {
  const long = new Map<string, FlagSpec>();
  const short = new Map<string, FlagSpec>();
  for (const spec of specs) {
    if (!long.has(spec.name)) long.set(spec.name, spec);
    for (const alias of spec.aliases ?? []) if (!long.has(alias)) long.set(alias, spec);
    if (spec.short && !short.has(spec.short)) short.set(spec.short, spec);
  }
  return { long, short };
}

/** Whether `token` is an option token (not a negative number, not "-" alone). */
function isOptionToken(token: string): boolean {
  return token.startsWith("-") && token !== "-" && !/^-\d/.test(token);
}

/** Find the spec an option token refers to (without consuming anything). */
export function lookupFlag(token: string, specs: readonly FlagSpec[]): { spec: FlagSpec; inlineValue: string | null } | null {
  if (!isOptionToken(token)) return null;
  const index = indexSpecs(specs);
  if (token.startsWith("--")) {
    const body = token.slice(2);
    const eq = body.indexOf("=");
    const name = eq >= 0 ? body.slice(0, eq) : body;
    const inline = eq >= 0 ? body.slice(eq + 1) : null;
    const spec = index.long.get(name);
    if (spec) return { spec, inlineValue: inline };
    if (name.startsWith("no-")) {
      const negated = index.long.get(name.slice(3));
      if (negated?.type === "boolean") return { spec: negated, inlineValue: null };
    }
    return null;
  }
  const letter = token.slice(1, 2);
  const spec = index.short.get(letter);
  if (!spec) return null;
  let rest = token.slice(2);
  if (rest.startsWith("=")) rest = rest.slice(1);
  return { spec, inlineValue: rest ? rest : null };
}

function coerce(spec: FlagSpec, raw: string, display: string, L: string): string | number {
  if (spec.type === "number") {
    const n = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(n)) throw new UsageError(m(L, "argv.number", { flag: display, value: raw }));
    return n;
  }
  if (spec.choices && spec.type === "string" && !spec.choices.includes(raw)) {
    const hint = suggest(raw, spec.choices);
    throw new UsageError(m(L, "argv.choice", { flag: display, value: raw, choices: spec.choices.join(" | ") }), hint ? m(L, "argv.didYouMean", { value: `"${hint}"` }) : undefined);
  }
  return raw;
}

function parseBoolean(raw: string, display: string, L: string): boolean {
  const v = raw.toLowerCase();
  if (["true", "1", "yes", "on"].includes(v)) return true;
  if (["false", "0", "no", "off"].includes(v)) return false;
  throw new UsageError(m(L, "argv.switch", { flag: display, value: raw }));
}

/**
 * Parse `argv` against `specs`. Throws `UsageError` for unknown flags,
 * missing values and invalid choices.
 */
export function parseArgs(argv: readonly string[], specs: readonly FlagSpec[], L = "en"): ParsedArgs {
  const index = indexSpecs(specs);
  const flags: ParsedArgs["flags"] = {};
  const positionals: string[] = [];
  const rest: string[] = [];
  const knownLong = [...index.long.keys()].map((n) => `--${n}`);

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;
    if (token === "--") {
      rest.push(...argv.slice(i + 1));
      break;
    }
    if (!isOptionToken(token)) {
      positionals.push(token);
      continue;
    }
    const found = lookupFlag(token, specs);
    const display = token.split("=")[0]!;
    if (!found) {
      const hint = token.startsWith("--") ? suggest(display, knownLong) : suggest(display, [...index.short.keys()].map((s) => `-${s}`).concat(knownLong));
      throw new UsageError(m(L, "argv.unknown", { flag: display }), hint ? m(L, "argv.didYouMean", { value: hint }) : undefined);
    }
    const { spec, inlineValue } = found;
    const negated = token.startsWith("--no-") && !index.long.has(token.slice(2).split("=")[0]!);
    if (spec.type === "boolean") {
      if (negated) flags[spec.name] = false;
      else flags[spec.name] = inlineValue === null ? true : parseBoolean(inlineValue, display, L);
      continue;
    }
    let raw = inlineValue;
    if (raw === null) {
      const next = argv[i + 1];
      if (next === undefined || (isOptionToken(next) && next !== "-")) {
        throw new UsageError(m(L, "argv.missing", { flag: display, value: spec.valueName ?? "" }));
      }
      raw = next;
      i++;
    }
    if (spec.type === "list") {
      const items = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (spec.choices) for (const item of items) coerce({ ...spec, type: "string" }, item, display, L);
      const prev = flags[spec.name];
      flags[spec.name] = [...(Array.isArray(prev) ? prev : []), ...items];
    } else {
      flags[spec.name] = coerce(spec, raw, display, L);
    }
  }
  return { flags, positionals, rest };
}

/* ------------------------------------------------------------------ */
/* Typed accessors                                                     */
/* ------------------------------------------------------------------ */

/** A string flag value, or undefined. */
export function flagString(args: ParsedArgs, name: string): string | undefined {
  const v = args.flags[name];
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : undefined;
}

/** A number flag value, or undefined. */
export function flagNumber(args: ParsedArgs, name: string): number | undefined {
  const v = args.flags[name];
  return typeof v === "number" ? v : undefined;
}

/** A boolean flag value, or `fallback` when absent. */
export function flagBool(args: ParsedArgs, name: string, fallback = false): boolean {
  const v = args.flags[name];
  return typeof v === "boolean" ? v : fallback;
}

/** A list flag value ([] when absent). */
export function flagList(args: ParsedArgs, name: string): string[] {
  const v = args.flags[name];
  return Array.isArray(v) ? v : typeof v === "string" ? [v] : [];
}

/** A positive integer flag (throws UsageError for 0, negatives and fractions). */
export function flagPositiveInt(args: ParsedArgs, name: string, max = Number.MAX_SAFE_INTEGER, L = "en"): number | undefined {
  const v = flagNumber(args, name);
  if (v === undefined) return undefined;
  if (!Number.isInteger(v) || v < 1 || v > max) throw new UsageError(m(L, "argv.int", { flag: `--${name}`, max }));
  return v;
}
