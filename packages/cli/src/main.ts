/**
 * Entry point: resolve the command path, parse flags, build the context and
 * run the handler; map errors to exit codes (1 error, 2 usage).
 */
import { resolve } from "node:path";
import { loadContent, loadSettings } from "@clinicalcraft/agent/node";
import type { Env } from "./ansi.js";
import { createPalette, colorEnabled } from "./ansi.js";
import { editDistance, flagBool, flagString, lookupFlag, parseArgs, suggest, UsageError, type FlagSpec, type ParsedArgs } from "./argv.js";
import { EXEC, findChild, PLAY, ROOT, type CommandSpec } from "./commands.js";
import { CliError, createContext, EXIT, type CliContext, type CliIO } from "./context.js";
import { GLOBAL_FLAGS } from "./flags.js";
import { renderHelp } from "./help.js";
import { m } from "./i18n.js";
import { cliVersion } from "./paths.js";

export interface ResolvedCommand {
  /** Command path from the root (root first). */
  path: CommandSpec[];
  /** argv without the command words. */
  rest: string[];
  /** `clinicalcraft help …` was used. */
  help: boolean;
}

function scanSpecs(path: readonly CommandSpec[]): FlagSpec[] {
  const specs = [...GLOBAL_FLAGS, ...path.flatMap((c) => c.flags ?? [])];
  if (path.length === 1) specs.push(...(PLAY.flags ?? []), ...(EXEC.flags ?? []));
  return specs;
}

/** Walk argv to find command words (flags may appear anywhere). */
export function resolveCommand(argv: readonly string[]): ResolvedCommand {
  const path: CommandSpec[] = [ROOT];
  const consumed = new Set<number>();
  let help = false;
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;
    if (token === "--") break;
    const node = path[path.length - 1]!;
    const flag = lookupFlag(token, scanSpecs(path));
    if (flag) {
      if (flag.spec.type !== "boolean" && flag.inlineValue === null) {
        const next = argv[i + 1];
        const omitted = flag.spec.optionalValue && (next === undefined || (next.startsWith("-") && next !== "-"));
        if (!omitted) i++;
      }
      continue;
    }
    if (token.startsWith("-") && token !== "-") continue; // unknown flag: reported by the full parse
    if (path.length === 1 && !help && token === "help") {
      help = true;
      consumed.add(i);
      continue;
    }
    const child = findChild(node, token);
    if (!child) break;
    path.push(child);
    consumed.add(i);
  }
  return { path, rest: argv.filter((_, i) => !consumed.has(i)), help };
}

function argvValue(argv: readonly string[], name: string): string | null {
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;
    if (token === "--") break;
    if (token === `--${name}`) return argv[i + 1] ?? null;
    if (token.startsWith(`--${name}=`)) return token.slice(name.length + 3);
  }
  return null;
}

/** UI locale before the full parse: --lang ?? settings (incl. CLINICALCRAFT_LOCALE) ?? zh-CN. */
async function preliminaryLocale(argv: readonly string[], env: Env, cwd: string): Promise<string> {
  const lang = argvValue(argv, "lang");
  if (lang) return lang;
  try {
    const profile = argvValue(argv, "profile");
    const settings = await loadSettings({ cwd, env, ...(profile ? { profile } : {}) });
    return settings.locale;
  } catch {
    return env.CLINICALCRAFT_LOCALE?.trim() || "zh-CN";
  }
}

function tryParse(argv: readonly string[], specs: readonly FlagSpec[], L: string): ParsedArgs | null {
  try {
    return parseArgs(argv, specs, L);
  } catch {
    return null;
  }
}

function hasPrintFlag(argv: readonly string[]): boolean {
  for (const token of argv) {
    if (token === "--") return false;
    if (token === "-p" || token === "--print" || token.startsWith("--print=") || (token.startsWith("-p") && !token.startsWith("--") && token.length > 2)) return true;
  }
  return false;
}

/** Names (and aliases) of top-level commands. */
function commandNames(): string[] {
  return (ROOT.subcommands ?? []).flatMap((c) => [c.name, ...(c.aliases ?? [])]);
}

function defaultIO(): CliIO {
  return { stdout: process.stdout, stderr: process.stderr, stdin: process.stdin };
}

/**
 * Run the CLI. Returns the exit code (0 success, 1 error, 2 usage error,
 * 3 max turns). Never throws.
 */
export async function main(argv: readonly string[], options: { io?: CliIO; env?: Env; cwd?: string } = {}): Promise<number> {
  const io = options.io ?? defaultIO();
  const env = options.env ?? process.env;
  const startCwd = options.cwd ?? process.cwd();
  const errPalette = createPalette(colorEnabled(io.stderr, env));
  let L = "zh-CN";
  let helpPath = "";
  try {
    const cwdFlag = argvValue(argv, "cwd");
    const cwd = cwdFlag ? resolve(startCwd, cwdFlag) : startCwd;
    L = await preliminaryLocale(argv, env, cwd);

    const resolved = resolveCommand(argv);
    helpPath = resolved.path.slice(1).map((c) => c.name).join(" ");
    let path = resolved.path;
    let node = path[path.length - 1]!;

    // Root without a command word: -p → exec, otherwise play (help → root help).
    if (node === ROOT) {
      const rootArgs = tryParse(resolved.rest, scanSpecs([ROOT]), L);
      const wantsHelp = resolved.help || (rootArgs ? flagBool(rootArgs, "help") : false);
      if (hasPrintFlag(resolved.rest)) path = [ROOT, EXEC];
      else if (!wantsHelp) {
        const first = rootArgs?.positionals[0];
        if (first) await rejectCommandTypo(first, cwd, env, L);
        path = [ROOT, PLAY];
      }
      node = path[path.length - 1]!;
    }

    // A group without a subcommand → its default (a stray positional is an unknown subcommand).
    if (node.subcommands && node !== ROOT) {
      const fallback = node.defaultSubcommand ? findChild(node, node.defaultSubcommand) : undefined;
      const groupArgs = tryParse(resolved.rest, [...GLOBAL_FLAGS, ...path.flatMap((c) => c.flags ?? []), ...(fallback?.flags ?? [])], L);
      const first = groupArgs?.positionals[0];
      if (first !== undefined) {
        const hint = suggest(first, node.subcommands.flatMap((c) => [c.name, ...(c.aliases ?? [])]));
        throw new UsageError(m(L, "main.unknownSubcommand", { command: node.name, sub: first }), hint ? m(L, "argv.didYouMean", { value: hint }) : undefined);
      }
      const wantsHelp = resolved.help || (groupArgs ? flagBool(groupArgs, "help") : false);
      if (!wantsHelp && fallback) {
        path = [...path, fallback];
        node = fallback;
      }
    }

    helpPath = path
      .slice(1)
      .map((c) => c.name)
      .join(" ");
    const specs = [...GLOBAL_FLAGS, ...path.flatMap((c) => c.flags ?? [])];
    const args: ParsedArgs = parseArgs(resolved.rest, specs, L);

    if (flagBool(args, "version")) {
      io.stdout.write(`${cliVersion()}\n`);
      return EXIT.ok;
    }
    const verbose = flagBool(args, "verbose");
    const lang = flagString(args, "lang") ?? null;
    const ctx: CliContext = createContext({ io, env, cwd, lang, profile: flagString(args, "profile") ?? null, verbose, locale: lang ?? L });
    if (resolved.help || flagBool(args, "help") || !node.run) {
      ctx.print(renderHelp(path, ctx.locale, ctx.out, cliVersion()));
      return EXIT.ok;
    }
    ctx.debug(`command: ${helpPath || "(root)"} · cwd ${cwd}`);
    return await node.run(ctx, args);
  } catch (err) {
    return reportError(err, io, errPalette, L, helpPath, env);
  }
}

/** A bare first word that looks like a mistyped command (and is not a case id) is a usage error. */
async function rejectCommandTypo(token: string, cwd: string, env: Env, L: string): Promise<void> {
  const names = commandNames();
  const hint = suggest(token, names);
  if (!hint || editDistance(token.toLowerCase(), hint.toLowerCase()) > 2) return;
  try {
    const settings = await loadSettings({ cwd, env });
    const content = await loadContent({ dirs: settings.contentDirs });
    if (content.cases.has(token)) return;
  } catch {
    /* fall through: report the typo */
  }
  throw new UsageError(m(L, "main.unknownCommand", { command: token }), m(L, "argv.didYouMean", { value: hint }));
}

function reportError(err: unknown, io: CliIO, p: ReturnType<typeof createPalette>, L: string, helpPath: string, env: Env): number {
  const write = (s: string) => void io.stderr.write(`${s}\n`);
  if (err instanceof UsageError) {
    write(p.red(`${m(L, "main.error")}: ${err.message}`));
    if (err.hint) write(p.dim(err.hint));
    write(p.dim(m(L, "main.seeHelp", { command: `clinicalcraft ${helpPath ? `${helpPath} ` : ""}--help` })));
    return EXIT.usage;
  }
  if (err instanceof CliError) {
    write(p.red(`${m(L, "main.error")}: ${err.message}`));
    if (err.hint) write(p.dim(err.hint));
    return err.exitCode;
  }
  const e = err as Error;
  write(p.red(`${m(L, "main.error")}: ${e?.message ?? String(err)}`));
  if (env.CLINICALCRAFT_DEBUG || process.argv.includes("--verbose")) write(p.dim(e?.stack ?? ""));
  return EXIT.error;
}
