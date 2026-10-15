/**
 * `clinicalcraft serve` (HTTP server: web world + content API + LLM proxy)
 * and `clinicalcraft mcp` (MCP stdio server). Both packages are loaded
 * lazily so the rest of the CLI works without them.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import type { ResolvedSettings } from "@clinicalcraft/agent";
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

export async function runMcp(ctx: CliContext, args: ParsedArgs): Promise<number> {
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
