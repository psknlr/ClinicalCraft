/**
 * Per-invocation CLI context: streams, env, cwd, UI locale, colour palettes,
 * exit codes and the settings layer built from session flags.
 */
import { isAbsolute, relative, resolve } from "node:path";
import { UNTRUSTED_PROJECT } from "@clinicalcraft/agent";
import { loadSettings, type LoadedSettings } from "@clinicalcraft/agent/node";
import { createPalette, colorEnabled, type Env, type Palette } from "./ansi.js";
import { flagBool, flagList, flagPositiveInt, flagString, suggest, UsageError, type ParsedArgs } from "./argv.js";
import { m, type MsgKey } from "./i18n.js";
import { isKnownProvider, missingKeyEnv, providerIds } from "./provider-check.js";

/** Process exit codes (docs/PROTOCOL.md §11). */
export const EXIT = { ok: 0, error: 1, usage: 2, maxTurns: 3 } as const;

/** Writable stream as far as the CLI needs it. */
export interface OutStream {
  write(chunk: string): boolean;
  isTTY?: boolean;
  columns?: number;
}

/** Readable stream as far as the CLI needs it. */
export type InStream = NodeJS.ReadableStream & { isTTY?: boolean; setRawMode?: (mode: boolean) => unknown };

export interface CliIO {
  stdout: OutStream & NodeJS.WritableStream;
  stderr: OutStream & NodeJS.WritableStream;
  stdin: InStream;
}

/** A user-facing failure with an exit code (1 = error, 2 = usage). */
export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode: number = EXIT.error,
    readonly hint?: string,
  ) {
    super(message);
    this.name = "CliError";
  }
}

export interface CliContext {
  readonly io: CliIO;
  readonly env: Env;
  /** Working directory (`--cwd`). */
  readonly cwd: string;
  /** UI language (`--lang` ?? settings.locale). */
  locale: string;
  /** Explicit `--lang`, if any. */
  readonly lang: string | null;
  readonly profile: string | null;
  readonly verbose: boolean;
  /** Palettes for stdout / stderr. */
  readonly out: Palette;
  readonly err: Palette;
  /** Localised message. */
  t(key: MsgKey, params?: Record<string, string | number>): string;
  /** Write a line to stdout. */
  print(text?: string): void;
  /** Write a line to stderr. */
  printErr(text?: string): void;
  /** Write a line to stderr when `--verbose`. */
  debug(text: string): void;
  /** Resolve a user-supplied path against `cwd`. */
  path(p: string): string;
  /** A path for display: relative when inside `cwd`, else absolute. */
  show(p: string): string;
}

/** `file` relative to `cwd` when it lies inside it, else the absolute path. */
export function displayPath(cwd: string, file: string): string {
  const abs = resolve(cwd, file);
  const rel = relative(cwd, abs);
  return rel && !rel.startsWith("..") && !isAbsolute(rel) ? rel : abs;
}

export interface ContextOptions {
  io: CliIO;
  env: Env;
  cwd: string;
  lang: string | null;
  profile: string | null;
  verbose: boolean;
  locale: string;
}

export function createContext(o: ContextOptions): CliContext {
  const ctx: CliContext = {
    io: o.io,
    env: o.env,
    cwd: o.cwd,
    locale: o.locale,
    lang: o.lang,
    profile: o.profile,
    verbose: o.verbose,
    out: createPalette(colorEnabled(o.io.stdout, o.env)),
    err: createPalette(colorEnabled(o.io.stderr, o.env)),
    t: (key, params) => m(ctx.locale, key, params),
    print: (text = "") => void o.io.stdout.write(`${text}\n`),
    printErr: (text = "") => void o.io.stderr.write(`${text}\n`),
    debug: (text) => {
      if (o.verbose) o.io.stderr.write(`${ctx.err.dim(`[debug] ${text}`)}\n`);
    },
    path: (p) => resolve(o.cwd, p),
    show: (p) => displayPath(o.cwd, p),
  };
  return ctx;
}

/** Contexts that already printed the untrusted-project warning (once per invocation). */
const warnedUntrusted = new WeakSet<CliContext>();

/**
 * Settings an untrusted project tried to set (hooks, provider/server secrets)
 * are dropped by `loadSettings`; say so on stderr — always, not only with
 * `--verbose` — once per invocation (stdout stays clean for JSON/MCP output).
 */
export function warnUntrustedProject(ctx: CliContext, settings: Pick<LoadedSettings, "issues">): void {
  const dropped = settings.issues.filter((i) => i.code === UNTRUSTED_PROJECT);
  if (dropped.length === 0 || warnedUntrusted.has(ctx)) return;
  warnedUntrusted.add(ctx);
  const keys = [...new Set(dropped.map((i) => i.path))].join(", ");
  const files = [...new Set(dropped.map((i) => (i.file ? ctx.show(i.file) : i.source)))].join(", ");
  ctx.printErr(ctx.err.yellow(ctx.t("trust.untrusted", { keys, files })));
}

/** Load settings for this invocation (optionally with a flags layer). Unknown profiles are usage errors. */
export async function loadCliSettings(ctx: CliContext, flags?: Record<string, unknown>): Promise<LoadedSettings> {
  try {
    const settings = await loadSettings({ cwd: ctx.cwd, env: ctx.env, ...(flags ? { flags } : {}), ...(ctx.profile ? { profile: ctx.profile } : {}) });
    for (const issue of settings.issues) ctx.debug(`settings ${issue.severity}: ${issue.file ?? issue.source} ${issue.path || "(root)"}: ${issue.message}`);
    warnUntrustedProject(ctx, settings);
    return settings;
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    // loadSettings' message is English-only; keep its list of known profiles.
    const profile = /^Unknown settings profile "([^"]*)"(?: \(known: (.+)\))?/.exec(message);
    if (profile) throw new UsageError(ctx.t("settings.unknownProfile", { name: profile[1]!, known: profile[2] ?? "-" }));
    throw new UsageError(message);
  }
}

const APPROVAL_MODES = ["default", "strict", "auto", "plan", "bypass"] as const;
const SCOPES = ["history-only", "workup", "full"] as const;

/**
 * Settings layer from session flags (`--provider --model --base-url
 * --approval --scope --lang --max-tool-rounds`). `--base-url` overrides the
 * base URL of the selected (or configured) provider.
 */
export async function sessionFlagsLayer(ctx: CliContext, args: ParsedArgs, extra: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const layer: Record<string, unknown> = {};
  const provider = flagString(args, "provider");
  const model = flagString(args, "model");
  const approval = flagString(args, "approval");
  const scope = flagString(args, "scope");
  if (provider) {
    const settings = await loadCliSettings(ctx);
    if (!isKnownProvider(settings, provider)) {
      const known = providerIds(settings);
      const hint = suggest(provider, known);
      throw new UsageError(ctx.t("flags.unknownProvider", { value: provider }), hint ? ctx.t("argv.didYouMean", { value: hint }) : ctx.t("flags.knownProviders", { list: known.join(", ") }));
    }
    layer.provider = provider;
  }
  if (model) layer.model = model;
  if (approval) {
    if (!(APPROVAL_MODES as readonly string[]).includes(approval)) throw new UsageError(ctx.t("flags.badApproval", { value: approval, choices: APPROVAL_MODES.join(" | ") }));
    layer.approvalMode = approval;
  }
  if (scope) {
    if (!(SCOPES as readonly string[]).includes(scope)) throw new UsageError(ctx.t("flags.badScope", { value: scope, choices: SCOPES.join(" | ") }));
    layer.practiceScope = scope;
  }
  if (ctx.lang) layer.locale = ctx.lang;
  const rounds = args.flags["max-tool-rounds"] !== undefined ? flagPositiveInt(args, "max-tool-rounds", 100, ctx.locale) : undefined;
  if (rounds !== undefined) layer.maxToolRounds = rounds;
  const baseUrl = flagString(args, "base-url");
  if (baseUrl) {
    try {
      new URL(baseUrl);
    } catch {
      throw new UsageError(ctx.t("flags.badUrl", { value: baseUrl }));
    }
    const target = provider ?? (await loadCliSettings(ctx)).provider;
    layer.providers = { [target]: { baseUrl } };
  }
  if (flagBool(args, "ephemeral")) layer.transcripts = { enabled: false };
  const allow = flagList(args, "allowed-tools");
  const deny = flagList(args, "disallowed-tools");
  if (allow.length > 0 || deny.length > 0) layer.permissions = { ...(allow.length ? { allow } : {}), ...(deny.length ? { deny } : {}) };
  return { ...layer, ...extra };
}

/**
 * Headless runs fail fast when the provider chosen with `--provider` needs an
 * API key that is not configured (the session would otherwise fall back to the
 * offline responders with only a warning).
 */
export async function requireProviderKey(ctx: CliContext, args: ParsedArgs, flags: Record<string, unknown>): Promise<void> {
  const provider = flagString(args, "provider");
  if (!provider) return;
  const settings = await loadCliSettings(ctx, flags);
  const missing = missingKeyEnv(settings, provider, ctx.env);
  if (missing) throw new CliError(ctx.t("flags.noKey", { id: provider, env: missing.join(" / ") }), EXIT.error);
}

/** `--resume <id>` / `--continue` → a resume reference for `createNodeSession` (or undefined). */
export function resumeRef(args: ParsedArgs): string | undefined {
  const id = flagString(args, "resume");
  if (id) return id;
  if (flagBool(args, "continue")) return "latest";
  return undefined;
}
