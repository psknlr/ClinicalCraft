/**
 * `clinicalcraft providers list|test|models` — never prints API keys.
 */
import {
  createProvider,
  findProviderTemplate,
  isProviderConfigured,
  localizedName,
  redactSecrets,
  table,
  type ChatRequest,
  type ProviderConfig,
} from "@clinicalcraft/agent";
import { resolveNodeProviderConfig, type LoadedSettings } from "@clinicalcraft/agent/node";
import { flagBool, flagNumber, flagString, suggest, UsageError, type ParsedArgs } from "./argv.js";
import { CliError, EXIT, loadCliSettings, type CliContext } from "./context.js";
import { isKnownProvider, missingKeyEnv, providerIds } from "./provider-check.js";
import { truncate } from "./render.js";

interface ProviderRow {
  id: string;
  name: string;
  wire: string;
  baseUrl: string | null;
  defaultModel: string | null;
  configured: boolean;
  keyEnv: string[];
  source: "builtin" | "settings";
  active: boolean;
}


function providerRows(ctx: CliContext, settings: LoadedSettings): ProviderRow[] {
  return providerIds(settings).map((id) => {
    const template = findProviderTemplate(id);
    const override = settings.providers[id];
    const name = override?.name ?? template?.name;
    return {
      id,
      name: localizedName(name, ctx.locale) || id,
      wire: override?.wire ?? template?.wire ?? "?",
      baseUrl: override?.baseUrl ?? template?.baseUrl ?? null,
      defaultModel: override?.defaultModel ?? template?.defaultModel ?? null,
      configured: isProviderConfigured(settings, id, ctx.env),
      keyEnv: override?.apiKeyEnv ?? template?.apiKeyEnv ?? [],
      source: template ? "builtin" : "settings",
      active: settings.provider === id,
    };
  });
}

export async function providersList(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const settings = await loadCliSettings(ctx);
  const rows = providerRows(ctx, settings);
  if (flagBool(args, "json")) {
    ctx.print(JSON.stringify(rows, null, 2));
    return EXIT.ok;
  }
  const p = ctx.out;
  const yes = ctx.t("word.yes");
  const no = ctx.t("word.no");
  const data = [[ctx.t("col.id"), ctx.t("col.name"), ctx.t("col.wire"), ctx.t("col.baseUrl"), ctx.t("col.defaultModel"), ctx.t("col.key")]];
  for (const r of rows) {
    const key = r.wire === "offline" || r.wire === "proxy" ? "-" : r.configured ? yes : `${no}${r.keyEnv.length ? ` (${r.keyEnv.join("/")})` : ""}`;
    data.push([`${r.active ? "*" : " "}${r.id}`, r.name, r.wire, r.baseUrl ?? "-", r.defaultModel ?? "-", key]);
  }
  ctx.print(table(data, { header: true, maxCell: 48 }));
  ctx.print(p.dim(ctx.t("providers.active", { id: settings.provider })));
  return EXIT.ok;
}

function resolveConfig(ctx: CliContext, settings: LoadedSettings, args: ParsedArgs): ProviderConfig {
  const id = args.positionals[0];
  if (!id) throw new UsageError(ctx.t("providers.needId"));
  const known = providerIds(settings);
  if (!isKnownProvider(settings, id)) {
    const hint = suggest(id, known);
    throw new CliError(ctx.t("providers.unknown", { id }), EXIT.usage, hint ? ctx.t("argv.didYouMean", { value: hint }) : ctx.t("providers.knownList", { list: known.join(", ") }));
  }
  const baseUrl = flagString(args, "base-url");
  const effective = baseUrl ? { ...settings, providers: { ...settings.providers, [id]: { ...(settings.providers[id] ?? {}), baseUrl } } } : settings;
  return resolveNodeProviderConfig(effective, id, flagString(args, "model") ?? null, ctx.env);
}

/** Secrets that must never be printed. */
function secretsOf(config: ProviderConfig): string[] {
  return config.apiKey ? [config.apiKey] : [];
}

export async function providersTest(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const settings = await loadCliSettings(ctx);
  const config = resolveConfig(ctx, settings, args);
  const p = ctx.out;
  const secrets = secretsOf(config);
  const clean = (s: string) => redactSecrets(s, secrets);
  if (config.wire === "offline") {
    ctx.print(ctx.t("providers.offline"));
    return EXIT.ok;
  }
  if (config.wire === "proxy") {
    ctx.print(ctx.t("providers.proxy"));
    return EXIT.ok;
  }
  const missingKey = config.apiKey ? null : missingKeyEnv(settings, config.id, ctx.env);
  if (missingKey) throw new CliError(ctx.t("providers.noKey", { id: config.id, env: missingKey.join(" / ") }), EXIT.error);
  const timeoutSec = flagNumber(args, "timeout") ?? 60;
  const provider = createProvider(config);
  const request: ChatRequest = {
    model: config.model,
    system: [{ id: "test", text: "You are a connectivity test. Follow the user's instruction exactly.", cache: "stable" }],
    messages: [{ role: "user", content: [{ type: "text", text: "Reply with OK" }] }],
    maxTokens: 32,
  };
  ctx.print(p.dim(ctx.t("providers.testing", { id: config.id, model: config.model, url: config.baseUrl ?? "-" })));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutSec * 1000);
  const started = Date.now();
  let firstToken: number | null = null;
  let text = "";
  let usage: { inputTokens: number; outputTokens: number } | null = null;
  let stopReason: string | null = null;
  let error: string | null = null;
  try {
    for await (const ev of provider.stream(request, controller.signal)) {
      if (ev.type === "text_delta") {
        if (firstToken === null) firstToken = Date.now() - started;
        text += ev.text;
      } else if (ev.type === "finish") {
        usage = ev.usage;
        stopReason = ev.stopReason;
      } else if (ev.type === "error") {
        error = `${ev.error.kind}${ev.error.status ? ` ${ev.error.status}` : ""}${ev.error.code !== undefined ? ` (${String(ev.error.code)})` : ""}: ${ev.error.message}`;
      }
    }
  } catch (err) {
    error = (err as Error).message;
  } finally {
    clearTimeout(timer);
  }
  const total = Date.now() - started;
  if (error) {
    ctx.print(p.red(`✗ ${clean(truncate(error, 400))}`));
    return EXIT.error;
  }
  ctx.print(`${p.green("✓")} ${ctx.t("providers.ok", { reply: clean(truncate(text || "(empty)", 80)) })}`);
  ctx.print(
    p.dim(
      ctx.t("providers.stats", {
        first: firstToken ?? "-",
        total,
        input: usage?.inputTokens ?? 0,
        output: usage?.outputTokens ?? 0,
        stop: stopReason ?? "-",
      }),
    ),
  );
  return EXIT.ok;
}

export async function providersModels(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const settings = await loadCliSettings(ctx);
  const config = resolveConfig(ctx, settings, args);
  const template = findProviderTemplate(config.id);
  const suggested = settings.providers[config.id]?.models ?? template?.models ?? [];
  const p = ctx.out;
  const secrets = secretsOf(config);
  if (config.wire === "offline" || config.wire === "proxy" || !config.baseUrl) {
    for (const mdl of suggested) ctx.print(mdl);
    if (suggested.length === 0) ctx.print(p.dim(ctx.t("providers.noModels")));
    return EXIT.ok;
  }
  const missingKey = config.apiKey ? null : missingKeyEnv(settings, config.id, ctx.env);
  if (missingKey) {
    ctx.printErr(ctx.err.yellow(ctx.t("providers.modelsNoKey", { id: config.id, env: missingKey.join(" / ") })));
    if (flagBool(args, "json")) ctx.print(JSON.stringify(suggested, null, 2));
    else for (const mdl of suggested) ctx.print(mdl);
    return EXIT.ok;
  }
  const anthropic = config.wire === "anthropic-messages";
  const base = config.baseUrl.replace(/\/+$/, "");
  const url = anthropic ? `${base}${/\/v1$/.test(base) ? "" : "/v1"}/models` : `${base}/models`;
  const headers: Record<string, string> = { accept: "application/json", ...(config.headers ?? {}) };
  if (config.apiKey) {
    if (anthropic) {
      headers["x-api-key"] = config.apiKey;
      headers["anthropic-version"] = "2023-06-01";
    } else headers.authorization = `Bearer ${config.apiKey}`;
  }
  let body: unknown;
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout((flagNumber(args, "timeout") ?? 30) * 1000) });
    const text = await res.text();
    if (!res.ok) {
      ctx.print(p.red(`✗ ${ctx.t("providers.modelsFailed", { status: res.status, url })} ${redactSecrets(truncate(text, 300), secrets)}`));
      if (suggested.length) ctx.print(p.dim(ctx.t("providers.suggested", { list: suggested.join(", ") })));
      return EXIT.error;
    }
    body = JSON.parse(text) as unknown;
  } catch (err) {
    ctx.print(p.red(`✗ ${redactSecrets((err as Error).message, secrets)}`));
    if (suggested.length) ctx.print(p.dim(ctx.t("providers.suggested", { list: suggested.join(", ") })));
    return EXIT.error;
  }
  const list = Array.isArray((body as { data?: unknown })?.data) ? ((body as { data: unknown[] }).data) : Array.isArray((body as { models?: unknown })?.models) ? (body as { models: unknown[] }).models : [];
  const ids = list
    .map((item) => (typeof item === "string" ? item : item && typeof item === "object" ? ((item as { id?: unknown; name?: unknown }).id ?? (item as { name?: unknown }).name) : null))
    .filter((v): v is string => typeof v === "string")
    .sort();
  if (flagBool(args, "json")) {
    ctx.print(JSON.stringify(ids, null, 2));
    return EXIT.ok;
  }
  for (const id of ids) ctx.print(id);
  if (ids.length === 0) ctx.print(p.dim(ctx.t("providers.noModels")));
  return EXIT.ok;
}
