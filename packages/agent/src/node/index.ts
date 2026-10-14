/**
 * `@clinicalcraft/agent/node` — Node-only layer (fs, child_process): settings
 * files, CLINICALCRAFT.md memory, custom agents/commands, command hooks, JSONL
 * transcripts, content loading and env-based provider resolution.
 * (`createNodeSession` lives in `./bootstrap.ts`.)
 */
export { clinicalcraftHome, expandHome, findProjectRoot, localAssetDirs, userHome, type Env } from "./home.js";
export { loadSettings, projectSettingsPaths, saveUserSettings, userSettingsPath, type LoadedSettings, type LoadSettingsOptions } from "./settings.js";
export { loadMemory, memoryCandidates, MEMORY_FALLBACK_NAME, MEMORY_FILE_NAME } from "./memory.js";
export { commandNameFor, loadProjectAgents, loadProjectCommands, type DefinitionIssue, type LoadDefinitionsOptions } from "./definitions.js";
export { createCommandHookExecutor, HOOK_ABORT_EXIT_CODE, HOOK_TIMEOUT_EXIT_CODE, type CommandHookExecutorOptions } from "./hooks.js";
export { JsonlTranscript, listSessions, readTranscript, sessionsDir, transcriptPath, type JsonlTranscriptOptions, type SessionSummary } from "./transcript.js";
export { builtinContentDir, loadContent, type ContentIssue, type LoadContentOptions, type LoadedContent } from "./content.js";
export { resolveNodeProviderConfig } from "./providers.js";
