/**
 * `clinicalcraft serve` (HTTP server: web world + content API + LLM proxy)
 * and `clinicalcraft mcp` (MCP stdio server). Both packages are loaded
 * lazily so the rest of the CLI works without them.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAttachKey, type ResolvedSettings } from "@clinicalcraft/agent";
import { flagBool, flagNumber, flagString, UsageError, type ParsedArgs } from "./argv.js";
import { CliError, EXIT, loadCliSettings, requireProviderKey, sessionFlagsLayer, type CliContext } from "./context.js";
import { webDistDir } from "./paths.js";

interface StartServerOptions {
  port: number;
  host: string;
  token?: string;
  staticDir?: string;
  settings: ResolvedSettings;
  contentDirs?: string[];
  cwd?: string;
  env?: Record<string, string | undefined>;
}
type StartServer = (o: StartServerOptions) => Promise<{ url: string; close(): Promise<void> | void }>;
type RunMcpServer = (o: { stdin: NodeJS.ReadableStream; stdout: NodeJS.WritableStream; settings: ResolvedSettings; cwd?: string; env?: Record<string, string | undefined> }) => Promise<unknown>;

/**
 * Whether `host` only listens on the loopback interface — the same rule as
 * the server's `isLoopbackHost` (a laxer check here would let "127.evil.com"
 * through to an unlocalised refusal from `startServer`).
 */
export function isLoopback(host: string): boolean {
  const h = host.trim().toLowerCase().replace(/^\[|\]$/g, "");
  return h === "localhost" || h.endsWith(".localhost") || h === "::1" || h === "0:0:0:0:0:0:0:1" || /^127(?:\.\d{1,3}){3}$/.test(h) || h === "::ffff:127.0.0.1";
}

/** Lazily import `name` from a sibling package; `reason` explains why it is unavailable. */
async function importExport<T>(ctx: CliContext, specifier: string, name: string): Promise<{ fn: T } | { reason: string }> {
  try {
    const mod = (await import(specifier)) as Record<string, unknown>;
    const fn = mod[name];
    return typeof fn === "function" ? { fn: fn as T } : { reason: ctx.t("pkg.noExport", { name }) };
  } catch (err) {
    return { reason: (err as Error).message ?? String(err) };
  }
}

function openBrowser(url: string): void {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    const child = spawn(cmd, args, { stdio: "ignore", detached: true });
    child.on("error", () => undefined);
    child.unref();
  } catch {
    /* no browser available */
  }
}

/** Environment variable read for the server token (keeps it out of the process list). */
export const SERVER_TOKEN_ENV = "CLINICALCRAFT_SERVER_TOKEN";
/** Shortest access token `serve` accepts. */
export const MIN_TOKEN_LENGTH = 16;

/**
 * The access token, by precedence: `--token` (visible in the process list —
 * warned about), `--token-file <path>`, `CLINICALCRAFT_SERVER_TOKEN`, then
 * `server.token` from settings. Tokens shorter than `MIN_TOKEN_LENGTH` are a
 * usage error.
 */
export function resolveServeToken(ctx: CliContext, args: ParsedArgs, fromSettings: string | null | undefined): string | undefined {
  const flag = flagString(args, "token");
  const file = flagString(args, "token-file");
  let token: string | undefined;
  if (flag !== undefined) {
    token = flag;
    ctx.printErr(ctx.err.yellow(ctx.t("serve.tokenOnCommandLine", { env: SERVER_TOKEN_ENV })));
  } else if (file !== undefined) {
    const path = ctx.path(file);
    try {
      token = readFileSync(path, "utf8").trim();
    } catch (err) {
      throw new UsageError(ctx.t("serve.tokenFile", { file: path, message: (err as Error).message }));
    }
  } else token = ctx.env[SERVER_TOKEN_ENV]?.trim() || fromSettings || undefined;
  if (token !== undefined && token.length < MIN_TOKEN_LENGTH) throw new UsageError(ctx.t("serve.shortToken", { min: MIN_TOKEN_LENGTH }));
  return token;
}

export async function runServe(ctx: CliContext, args: ParsedArgs): Promise<number> {
  // `--lang` is the default language of the server's error messages (Accept-Language wins).
  const settings = await loadCliSettings(ctx, ctx.lang ? { locale: ctx.lang } : undefined);
  const host = flagString(args, "host") ?? settings.server.host;
  const portFlag = flagNumber(args, "port");
  if (portFlag !== undefined && (!Number.isInteger(portFlag) || portFlag < 0 || portFlag > 65535)) throw new UsageError(ctx.t("serve.badPort", { port: portFlag }));
  const port = portFlag ?? settings.server.port;
  const token = resolveServeToken(ctx, args, settings.server.token);
  if (!isLoopback(host) && !token) throw new CliError(ctx.t("serve.needToken", { host }), EXIT.usage);

  const loaded = await importExport<StartServer>(ctx, "@clinicalcraft/server", "startServer");
  if (!("fn" in loaded)) throw new CliError(ctx.t("serve.unavailable", { reason: loaded.reason }), EXIT.error, ctx.t("serve.buildHint"));
  const startServer = loaded.fn;

  const staticFlag = flagString(args, "static");
  const staticDir = staticFlag ? ctx.path(staticFlag) : webDistDir();
  if (staticFlag && !existsSync(staticDir!)) throw new CliError(ctx.t("serve.noStatic", { dir: staticDir! }), EXIT.usage);
  if (!staticDir) ctx.printErr(ctx.err.yellow(ctx.t("serve.noWeb")));

  const server = await startServer({
    port,
    host,
    ...(token ? { token } : {}),
    ...(staticDir ? { staticDir } : {}),
    settings,
    contentDirs: settings.contentDirs,
    cwd: ctx.cwd,
    env: ctx.env,
  });
  ctx.print(ctx.t("serve.listening", { url: server.url }));
  if (token) ctx.print(ctx.out.dim(ctx.t("serve.tokenNote", { url: server.url })));
  if (flagBool(args, "open")) openBrowser(server.url);

  await new Promise<void>((resolve) => {
    const stop = () => {
      process.off("SIGINT", stop);
      process.off("SIGTERM", stop);
      resolve();
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
  });
  ctx.printErr(ctx.err.dim(ctx.t("serve.stopping")));
  await server.close();
  return EXIT.ok;
}

type RunAttachedMcpServer = (o: {
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WritableStream;
  serverUrl: string;
  token: string | null;
  worldSession: string;
  attachKey: string;
  callTimeoutMs?: number;
  locale?: string;
}) => Promise<unknown>;

/** Environment variable read for the live session's attach key (keeps it out of the process list). */
export const ATTACH_KEY_ENV = "CLINICALCRAFT_ATTACH_KEY";
/** Environment variable read for the live session id when `--world-session` is not given. */
export const WORLD_SESSION_ENV = "CLINICALCRAFT_WORLD_SESSION";

/** Flags of `mcp` that only apply to attach mode, and session flags that never do (the live session has its own settings). */
const ATTACH_ONLY_FLAGS = ["world-session", "attach-key-file", "token-file", "timeout"] as const;
const SESSION_ONLY_FLAGS = ["provider", "model", "base-url", "approval", "scope", "facility", "max-tool-rounds", "ephemeral", "embodied", "allowed-tools", "disallowed-tools"] as const;

/**
 * `--attach <url>`: `clinicalcraft serve`'s base URL — http(s), without
 * credentials, query or fragment (a token there would be visible in the
 * process list; it comes from `--token-file` or the environment).
 */
export function attachServerUrl(ctx: CliContext, raw: string): string {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new UsageError(ctx.t("mcp.attach.badUrl", { value: raw }));
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new UsageError(ctx.t("mcp.attach.badUrl", { value: raw }));
  if (u.username || u.password || u.search || u.hash) throw new UsageError(ctx.t("mcp.attach.urlSecret"));
  return `${u.origin}${u.pathname.replace(/\/+$/, "")}`;
}

/**
 * `clinicalcraft mcp --attach <url> --world-session <id> --attach-key-file <f> [--token-file f] [--timeout <sec>]`:
 * the MCP tools act in a learner's live browser session through the world
 * bridge of `clinicalcraft serve` (docs/EMBODIED.md §12). The session and its
 * attach key are both required — the learner's "External agent" badge shows
 * them; a session is never picked automatically (review S5). The session id
 * may come from `CLINICALCRAFT_WORLD_SESSION`, the key from
 * `CLINICALCRAFT_ATTACH_KEY` (never from the command line: the process list);
 * the server token from `--token-file`, `CLINICALCRAFT_SERVER_TOKEN` or
 * `server.token`.
 */
async function runMcpAttach(ctx: CliContext, args: ParsedArgs, raw: string): Promise<number> {
  const serverUrl = attachServerUrl(ctx, raw);
  for (const flag of SESSION_ONLY_FLAGS) if (args.flags[flag] !== undefined) throw new UsageError(ctx.t("mcp.attach.sessionFlag", { flag: `--${flag}` }));
  const settings = await loadCliSettings(ctx, ctx.lang ? { locale: ctx.lang } : undefined);
  const file = flagString(args, "token-file");
  let token: string | undefined;
  if (file !== undefined) {
    const path = ctx.path(file);
    try {
      token = readFileSync(path, "utf8").trim() || undefined;
    } catch (err) {
      throw new UsageError(ctx.t("serve.tokenFile", { file: path, message: (err as Error).message }));
    }
  } else token = ctx.env[SERVER_TOKEN_ENV]?.trim() || settings.server.token || undefined;
  const worldSession = flagString(args, "world-session") ?? (ctx.env[WORLD_SESSION_ENV]?.trim() || undefined);
  if (worldSession === undefined) throw new UsageError(ctx.t("mcp.attach.needSession", { env: WORLD_SESSION_ENV }));
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(worldSession)) throw new UsageError(ctx.t("mcp.attach.badSession", { value: worldSession }));
  const keyFile = flagString(args, "attach-key-file");
  let attachKey: string | undefined;
  if (keyFile !== undefined) {
    const path = ctx.path(keyFile);
    try {
      attachKey = readFileSync(path, "utf8").trim();
    } catch (err) {
      throw new UsageError(ctx.t("mcp.attach.keyFile", { file: path, message: (err as Error).message }));
    }
  } else attachKey = ctx.env[ATTACH_KEY_ENV]?.trim() || undefined;
  if (attachKey === undefined) throw new UsageError(ctx.t("mcp.attach.needKey", { env: ATTACH_KEY_ENV }));
  if (!isAttachKey(attachKey)) throw new UsageError(ctx.t("mcp.attach.badKey"));
  const timeout = flagNumber(args, "timeout");
  if (timeout !== undefined && !(timeout >= 1 && timeout <= 600)) throw new UsageError(ctx.t("mcp.attach.badTimeout"));
  const url = new URL(serverUrl);
  if (token && url.protocol === "http:" && !isLoopback(url.hostname)) ctx.printErr(ctx.err.yellow(ctx.t("mcp.attach.cleartext", { host: url.host })));
  const loaded = await importExport<RunAttachedMcpServer>(ctx, "@clinicalcraft/mcp", "runAttachedMcpServer");
  if (!("fn" in loaded)) throw new CliError(ctx.t("mcp.unavailable", { reason: loaded.reason }), EXIT.error, ctx.t("serve.buildHint"));
  // stdout carries JSON-RPC only: diagnostics go to stderr.
  await loaded.fn({
    stdin: ctx.io.stdin,
    stdout: ctx.io.stdout,
    serverUrl,
    token: token ?? null,
    worldSession,
    attachKey,
    ...(timeout !== undefined ? { callTimeoutMs: Math.round(timeout * 1000) } : {}),
    locale: settings.locale,
  });
  return EXIT.ok;
}

export async function runMcp(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const attach = flagString(args, "attach");
  if (attach !== undefined) return runMcpAttach(ctx, args, attach);
  for (const flag of ATTACH_ONLY_FLAGS) if (args.flags[flag] !== undefined) throw new UsageError(ctx.t("mcp.attach.only", { flag: `--${flag}` }));
  const flags = await sessionFlagsLayer(ctx, args);
  // A `--provider` without its key is an error, never a silent offline patient behind the client's back.
  await requireProviderKey(ctx, args, flags);
  const settings = await loadCliSettings(ctx, flags);
  const loaded = await importExport<RunMcpServer>(ctx, "@clinicalcraft/mcp", "runMcpServer");
  if (!("fn" in loaded)) throw new CliError(ctx.t("mcp.unavailable", { reason: loaded.reason }), EXIT.error, ctx.t("serve.buildHint"));
  const runMcpServer = loaded.fn;
  // stdout carries JSON-RPC only: diagnostics go to stderr.
  await runMcpServer({ stdin: ctx.io.stdin, stdout: ctx.io.stdout, settings, cwd: ctx.cwd, env: ctx.env });
  return EXIT.ok;
}
