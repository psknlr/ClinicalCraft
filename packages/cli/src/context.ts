/**
 * Per-invocation CLI context: streams, env, cwd, UI locale, colour palettes,
 * exit codes and the settings layer built from session flags.
 */
import { resolve } from "node:path";
import { loadSettings, type LoadedSettings } from "@clinicalcraft/agent/node";
import { createPalette, colorEnabled, type Env, type Palette } from "./ansi.js";
import { flagBool, flagPositiveInt, flagString, UsageError, type ParsedArgs } from "./argv.js";
import { m, type MsgKey } from "./i18n.js";

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
  };
  return ctx;
}

/** Load settings for this invocation (optionally with a flags layer). Unknown profiles are usage errors. */
export async function loadCliSettings(ctx: CliContext, flags?: Record<string, unknown>): Promise<LoadedSettings> {
  try {
    const settings = await loadSettings({ cwd: ctx.cwd, env: ctx.env, ...(flags ? { flags } : {}), ...(ctx.profile ? { profile: ctx.profile } : {}) });
    for (const issue of settings.issues) ctx.debug(`settings ${issue.severity}: ${issue.file ?? issue.source} ${issue.path || "(root)"}: ${issue.message}`);
    return settings;
  } catch (err) {
    throw new UsageError((err as Error).message);
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
  if (provider) layer.provider = provider;
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
  return { ...layer, ...extra };
}

/** `--resume <id>` / `--continue` → a resume reference for `createNodeSession` (or undefined). */
export function resumeRef(args: ParsedArgs): string | undefined {
  const id = flagString(args, "resume");
  if (id) return id;
  if (flagBool(args, "continue")) return "latest";
  return undefined;
}
