/**
 * One-call Node bootstrap used by the CLI, the HTTP server and the MCP server
 * (docs/PROTOCOL.md §7): settings layers, content, facility + catalogs,
 * CLINICALCRAFT.md memory, project agents/commands, command hooks, JSONL
 * transcript, env-based provider resolution and resume.
 */
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import type { CaseDefinition, EquipmentCatalog, FacilityDefinition } from "@clinicalcraft/core";
import type { AgentProfile } from "../agents/types.js";
import type { RetryPolicy } from "../providers/factory.js";
import type { LLMProvider, ProviderConfig } from "../providers/types.js";
import { createSession, type ClinicalSession } from "../session/session.js";
import type { TranscriptSink } from "../session/types.js";
import type { SettingsLayerData } from "../settings/merge.js";
import type { ToolDefinition } from "../tools/types.js";
import { replayTranscript, resumedRuntimeConfig, type ResumedRuntimeConfig } from "../transcript.js";
import type { ResolvedSettings } from "../settings/schema.js";
import { loadContent, type LoadedContent } from "./content.js";
import { loadProjectAgents, loadProjectCommands } from "./definitions.js";
import { createCommandHookExecutor } from "./hooks.js";
import type { Env } from "./home.js";
import { loadMemory } from "./memory.js";
import { resolveNodeProviderConfig } from "./providers.js";
import { loadSettings } from "./settings.js";
import { isWebTranscriptPath, JsonlTranscript, listSessions, readTranscript, sessionsDir } from "./transcript.js";

export interface CreateNodeSessionOptions {
  /** Case id (default: the resumed session's case, then `settings.defaultCase`). */
  caseId?: string;
  cwd?: string;
  env?: Env;
  /** CLI flags / panel values as a settings layer. */
  flags?: SettingsLayerData | Record<string, unknown>;
  /** Settings profile name. */
  profile?: string | null;
  /** Facility override (`--facility`). */
  facilityId?: string;
  /** Write a JSONL transcript (default: `settings.transcripts.enabled`). */
  transcript?: boolean;
  /** Resume a session: its id (or unique prefix), a transcript path, or "latest". */
  resume?: string;
  sessionId?: string;
  /** Dynamic tools the front-end executes (e.g. ["walk_to"]). */
  dynamicTools?: string[];
  /** Plugin tools. */
  tools?: ToolDefinition<any>[];
  retry?: RetryPolicy | false;
  providerFactory?: (agent: AgentProfile, config: ProviderConfig) => LLMProvider;
  /** Pre-loaded content (skips scanning). */
  content?: LoadedContent;
  now?: () => number;
  newId?: () => string;
}

/** Thrown for bootstrap problems a user can fix (unknown case, missing transcript…). */
export class BootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BootstrapError";
  }
}

/**
 * Locate a transcript: an existing path, "latest", or a session id / unique id
 * prefix among this machine's own recordings. A web upload
 * (`<sessions>/web/<id>.jsonl`, untrusted) is only found by its exact id or
 * path — never by "latest" or a prefix.
 */
export async function findSessionTranscript(ref: string, env: Env, dir?: string | null): Promise<string> {
  if (ref.endsWith(".jsonl") && existsSync(ref)) return resolve(ref);
  const sessions = await listSessions(env, { dir: dir ?? null });
  if (sessions.length > 0) {
    if (ref === "latest" || ref === "") return sessions[0]!.path;
    const exact = sessions.find((s) => s.id === ref);
    if (exact) return exact.path;
    const prefixed = sessions.filter((s) => s.id.startsWith(ref));
    if (prefixed.length === 1) return prefixed[0]!.path;
    if (prefixed.length > 1) throw new BootstrapError(`Session id "${ref}" is ambiguous.`);
  }
  const web = ref && ref !== "latest" ? (await listSessions(env, { dir: dir ?? null, web: "only" })).find((s) => s.id === ref) : undefined;
  if (web) return web.path;
  throw new BootstrapError(sessions.length === 0 ? "No recorded sessions to resume." : `No session "${ref}".`);
}

/**
 * Runtime configuration recorded in an uploaded web transcript is client
 * input: a resume keeps the locale, scope, interlocutor, plan and affect but
 * never takes its provider/model or approval mode.
 */
export function untrustedResumeConfig(config: ResumedRuntimeConfig): ResumedRuntimeConfig {
  const { provider: _provider, model: _model, approvalMode: _approval, ...rest } = config;
  return rest;
}

/**
 * Facility choice: explicit id ?? case.facility ?? settings.defaultFacility ??
 * "general-hospital" (if present) ?? the first facility; ids that do not exist
 * are skipped (an explicit `facilityId` that does not exist is an error).
 */
export function chooseFacility(
  content: Pick<LoadedContent, "facilities">,
  caseDef: Pick<CaseDefinition, "facility">,
  explicit: string | undefined,
  defaultFacility: string | null,
): FacilityDefinition | null {
  if (explicit) {
    const found = content.facilities.get(explicit);
    if (!found) throw new BootstrapError(`Unknown facility "${explicit}". Available: ${[...content.facilities.keys()].join(", ") || "(none)"}`);
    return found.def;
  }
  for (const id of [caseDef.facility, defaultFacility ?? undefined, "general-hospital"]) {
    if (id && content.facilities.has(id)) return content.facilities.get(id)!.def;
  }
  const first = content.facilities.values().next();
  return first.done ? null : first.value.def;
}

/** Equipment catalogs a facility lists (missing ones are skipped). */
export function catalogsFor(content: Pick<LoadedContent, "catalogs">, facility: FacilityDefinition | null): EquipmentCatalog[] {
  if (!facility) return [];
  return facility.catalogs.flatMap((id) => {
    const entry = content.catalogs.get(id);
    return entry ? [entry.def] : [];
  });
}

/**
 * Settings for a resumed session: the transcript's runtime configuration
 * (locale, provider/model, approval mode, practice scope — PROTOCOL §10)
 * replaces the loaded value unless that key was given explicitly as a flag.
 */
export function applyResumedConfig<S extends ResolvedSettings>(settings: S, config: ResumedRuntimeConfig): S {
  const next = { ...settings };
  const explicit = (key: string) => settings.sources[key] === "flag";
  if (config.locale && !explicit("locale")) next.locale = config.locale;
  if (config.provider && !explicit("provider") && !explicit("model")) {
    next.provider = config.provider;
    next.model = config.model ?? null;
  }
  if (config.approvalMode && !explicit("approvalMode")) next.approvalMode = config.approvalMode;
  if (config.practiceScope && !explicit("practiceScope")) next.practiceScope = config.practiceScope;
  return next;
}

/** Bootstrap a fully configured `ClinicalSession` for node front-ends. */
export async function createNodeSession(opts: CreateNodeSessionOptions = {}): Promise<ClinicalSession> {
  const env = opts.env ?? process.env;
  const cwd = resolve(opts.cwd ?? process.cwd());
  let settings = await loadSettings({ cwd, env, ...(opts.flags ? { flags: opts.flags } : {}), ...(opts.profile !== undefined ? { profile: opts.profile } : {}) });
  const content = opts.content ?? (await loadContent({ dirs: settings.contentDirs }));

  let resumePath: string | null = null;
  let resumed: ReturnType<typeof replayTranscript> | null = null;
  let resumedConfig: ResumedRuntimeConfig | null = null;
  let webOrigin = false;
  if (opts.resume !== undefined) {
    resumePath = await findSessionTranscript(opts.resume, env, settings.transcripts.dir);
    webOrigin = isWebTranscriptPath(resumePath, settings.transcripts.dir || sessionsDir(env));
    const items = await readTranscript(resumePath);
    resumed = replayTranscript(items);
    resumedConfig = resumedRuntimeConfig(items);
    if (webOrigin) resumedConfig = untrustedResumeConfig(resumedConfig);
    settings = applyResumedConfig(settings, resumedConfig);
  }

  if (resumed?.sessionMeta && opts.caseId && opts.caseId !== resumed.sessionMeta.caseId) {
    throw new BootstrapError(`Session ${resumed.sessionMeta.sessionId} is for case "${resumed.sessionMeta.caseId}", not "${opts.caseId}".`);
  }
  const caseId = opts.caseId ?? resumed?.sessionMeta?.caseId ?? settings.defaultCase ?? undefined;
  if (!caseId) throw new BootstrapError(`No case selected. Available cases: ${[...content.cases.keys()].join(", ") || "(none)"}`);
  const entry = content.cases.get(caseId);
  if (!entry) throw new BootstrapError(`Unknown case "${caseId}". Available cases: ${[...content.cases.keys()].join(", ") || "(none)"}`);
  const caseDef = entry.def;
  const facility = chooseFacility(content, caseDef, opts.facilityId ?? resumed?.sessionMeta?.facilityId ?? undefined, settings.defaultFacility);
  const catalogs = catalogsFor(content, facility);

  const [memory, agents, commands] = await Promise.all([loadMemory(cwd, env), loadProjectAgents(cwd, env), loadProjectCommands(cwd, env)]);
  // A web upload's id is its file name (its session_meta could name another session).
  const resumedId = resumePath && webOrigin ? basename(resumePath, ".jsonl") : resumed?.sessionMeta?.sessionId;
  const sessionId = opts.sessionId ?? resumedId ?? (opts.newId ? opts.newId() : randomUUID());

  let transcript: TranscriptSink | undefined;
  if (opts.transcript ?? settings.transcripts.enabled) {
    transcript = resumePath
      ? JsonlTranscript.at(resumePath)
      : JsonlTranscript.create({ dir: settings.transcripts.dir, sessionId, env, ...(opts.now ? { now: opts.now } : {}) });
  }

  return createSession({
    caseDef,
    facility,
    catalogs,
    settings,
    agents,
    commands,
    memory: memory.text,
    resolveProvider: (providerId, model) => resolveNodeProviderConfig(settings, providerId, model, env),
    commandHooks: createCommandHookExecutor(settings.projectRoot),
    ...(transcript ? { transcript } : {}),
    ...(resumed
      ? { resume: { sessionId, actions: resumed.actions, messages: resumed.messages, ...(resumed.dialogue.length ? { dialogue: resumed.dialogue } : {}) }, transcriptOrdinal: resumed.lastOrdinal + 1 }
      : {}),
    ...(resumedConfig && (resumedConfig.interlocutor || resumedConfig.plan || resumedConfig.affect)
      ? {
          restore: {
            ...(resumedConfig.interlocutor ? { interlocutor: resumedConfig.interlocutor } : {}),
            ...(resumedConfig.plan ? { plan: resumedConfig.plan } : {}),
            ...(resumedConfig.affect ? { affect: resumedConfig.affect } : {}),
          },
        }
      : {}),
    sessionId,
    cwd: settings.projectRoot,
    ...(opts.dynamicTools ? { dynamicTools: opts.dynamicTools } : {}),
    ...(opts.tools ? { tools: opts.tools } : {}),
    ...(opts.retry !== undefined ? { retry: opts.retry } : {}),
    ...(opts.providerFactory ? { providerFactory: opts.providerFactory } : {}),
    ...(opts.now ? { now: opts.now } : {}),
    ...(opts.newId ? { newId: opts.newId } : {}),
  });
}
