/**
 * Settings — layered like Claude Code / Codex / Grok CLI:
 *
 *   built-in defaults
 *   < user     ~/.clinicalcraft/settings.json            (CLINICALCRAFT_HOME overrides ~/.clinicalcraft)
 *   < project  <project>/.clinicalcraft/settings.json    (commit to share with a course)
 *   < local    <project>/.clinicalcraft/settings.local.json (git-ignored, personal)
 *   < env      CLINICALCRAFT_PROVIDER / _MODEL / _LOCALE / _APPROVAL / _SCOPE
 *   < CLI flags / web settings panel
 *   then an optional named profile (`profiles.<name>`, Codex) is merged on top.
 *
 * Merge rules: objects deep-merge; `permissions.allow|ask|deny` arrays and
 * hook matcher lists concatenate (deduplicated); scalars: last wins.
 * API keys are NEVER stored in project settings; use env vars (or the user
 * file, written with mode 0600 by `clinicalcraft config set`).
 */
import { z } from "zod";

export const ApprovalModeSchema = z.enum(["default", "strict", "auto", "plan", "bypass"]);
export const PracticeScopeSchema = z.enum(["history-only", "workup", "full"]);
export const EffortSchema = z.enum(["low", "medium", "high", "xhigh", "max"]);

export const AgentModelSettingsSchema = z
  .object({
    provider: z.string().optional(),
    model: z.string().optional(),
    effort: EffortSchema.optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
    maxToolRounds: z.number().int().min(0).max(100).optional(),
  })
  .strict();

export const ProviderOverrideSchema = z
  .object({
    /** Extends/overrides a built-in template, or defines a new provider when `wire` is given. */
    wire: z.enum(["anthropic-messages", "openai-chat-completions", "offline", "proxy"]).optional(),
    name: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
    baseUrl: z.string().url().optional(),
    apiKeyEnv: z.array(z.string()).optional(),
    /** Discouraged; prefer apiKeyEnv. Only honoured from user/local settings. */
    apiKey: z.string().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    defaultModel: z.string().optional(),
    models: z.array(z.string()).optional(),
    timeoutMs: z.number().int().positive().optional(),
    maxRetries: z.number().int().min(0).max(10).optional(),
  })
  .strict();

export const HookCommandSchema = z
  .object({
    type: z.literal("command"),
    command: z.string().min(1),
    timeout: z.number().positive().max(600).default(60),
  })
  .strict();

export const HookMatcherSchema = z
  .object({
    /** Regex matched against the tool name (PreToolUse/PostToolUse) or event subtype (ClinicalEvent: domain event type). Omit = all. */
    matcher: z.string().optional(),
    hooks: z.array(HookCommandSchema).min(1),
  })
  .strict();

export const HOOK_EVENTS = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "ClinicalEvent",
  "Notification",
  "PreCompact",
  "Stop",
  "SessionEnd",
] as const;
export type HookEventName = (typeof HOOK_EVENTS)[number];

export const HooksSchema = z.object(Object.fromEntries(HOOK_EVENTS.map((e) => [e, z.array(HookMatcherSchema).optional()])) as Record<
  HookEventName,
  z.ZodOptional<z.ZodArray<typeof HookMatcherSchema>>
>).strict();

const SettingsShape = {
    $schema: z.string().optional(),
    /** Active provider id (see `clinicalcraft providers`). "offline" works with no key. */
    provider: z.string().optional(),
    model: z.string().optional(),
    effort: EffortSchema.optional(),
    /** Per-agent model settings, keyed by agent name (patient, nurse, clinician, examiner…). */
    agents: z.record(z.string(), AgentModelSettingsSchema).optional(),
    providers: z.record(z.string(), ProviderOverrideSchema).optional(),
    locale: z.string().optional(),
    approvalMode: ApprovalModeSchema.optional(),
    practiceScope: PracticeScopeSchema.optional(),
    permissions: z
      .object({
        allow: z.array(z.string()).optional(),
        ask: z.array(z.string()).optional(),
        deny: z.array(z.string()).optional(),
      })
      .strict()
      .optional(),
    hooks: HooksSchema.optional(),
    maxToolRounds: z.number().int().min(1).max(100).optional(),
    autoCompact: z
      .object({ enabled: z.boolean().default(true), thresholdTokens: z.number().int().positive().default(120000) })
      .strict()
      .optional(),
    /** Extra content directories (cases/, facilities/, catalogs/) — relative to the settings file. */
    contentDirs: z.array(z.string()).optional(),
    defaultCase: z.string().optional(),
    defaultFacility: z.string().optional(),
    transcripts: z.object({ enabled: z.boolean().default(true), dir: z.string().optional() }).strict().optional(),
    patient: z
      .object({
        /**
         * select-voice (default): deterministic matcher (+ optional LLM re-rank over the fact
         * index) selects fact ids, then the voice model phrases ONLY those facts (works on
         * models without tool calling). tool: the patient model calls reveal_facts itself.
         */
        pipeline: z.enum(["select-voice", "tool"]).default("select-voice"),
        /** Verify voiced replies (numbers/drugs/sites must come from used facts); fall back to the authored answer. */
        strictGrounding: z.boolean().default(true),
        /** Fall back to the deterministic responder when the model errors. */
        offlineFallback: z.boolean().default(true),
      })
      .strict()
      .optional(),
    /** Server options for `clinicalcraft serve`. */
    server: z
      .object({
        host: z.string().default("127.0.0.1"),
        port: z.number().int().min(0).max(65535).default(5178),
        /** Required bearer token when binding to a non-loopback host (ZCode). */
        token: z.string().optional(),
      })
      .strict()
      .optional(),
};

/** A settings layer without profiles (profiles cannot nest). */
export const SettingsLayerSchema = z.object(SettingsShape).strict();

export const SettingsSchema = z
  .object({
    ...SettingsShape,
    /** Named presets selectable with --profile (Codex profiles), e.g. "osce", "self-study". */
    profiles: z.record(z.string(), SettingsLayerSchema).optional(),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
export type SettingsLayer = z.infer<typeof SettingsLayerSchema>;
export type HooksConfig = z.infer<typeof HooksSchema>;
export type ProviderOverride = z.infer<typeof ProviderOverrideSchema>;

/** Fully resolved runtime settings (after layering + defaults). */
export interface ResolvedSettings {
  provider: string;
  model: string | null;
  effort: z.infer<typeof EffortSchema> | null;
  agents: Record<string, z.infer<typeof AgentModelSettingsSchema>>;
  providers: Record<string, ProviderOverride>;
  locale: string;
  approvalMode: z.infer<typeof ApprovalModeSchema>;
  practiceScope: z.infer<typeof PracticeScopeSchema>;
  permissions: { allow: string[]; ask: string[]; deny: string[] };
  hooks: HooksConfig;
  maxToolRounds: number;
  autoCompact: { enabled: boolean; thresholdTokens: number };
  contentDirs: string[];
  defaultCase: string | null;
  defaultFacility: string | null;
  transcripts: { enabled: boolean; dir: string | null };
  patient: { pipeline: "select-voice" | "tool"; strictGrounding: boolean; offlineFallback: boolean };
  server: { host: string; port: number; token: string | null };
  /** Where each top-level key came from (for `clinicalcraft config` / debugging). */
  sources: Record<string, "default" | "user" | "project" | "local" | "env" | "flag" | "profile">;
}
