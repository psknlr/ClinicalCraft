/**
 * `@clinicalcraft/agent/node` — Node-only layer (fs, child_process): settings
 * files, CLINICALCRAFT.md memory, custom agents/commands, command hooks, JSONL
 * transcripts, content loading and env-based provider resolution.
 * (`createNodeSession` lives in `./bootstrap.ts`.)
 */
export { clinicalcraftHome, expandHome, findProjectRoot, localAssetDirs, userHome, type Env } from "./home.js";
export { loadSettings, projectSettingsPaths, saveUserSettings, userSettingsPath, type LoadedSettings, type LoadSettingsOptions } from "./settings.js";
export { loadMemory, memoryCandidates, MEMORY_FALLBACK_NAME, MEMORY_FILE_NAME } from "./memory.js";
export {
  isProjectTrusted,
  listTrustedProjects,
  projectTrustDigest,
  readProjectSettingsTexts,
  revokeProjectTrust,
  trustProject,
  trustRootFor,
  trustStorePath,
  type ProjectSettingsTexts,
  type TrustedProject,
} from "./trust.js";
export { commandNameFor, loadProjectAgents, loadProjectCommands, type DefinitionIssue, type LoadDefinitionsOptions } from "./definitions.js";
export { createCommandHookExecutor, HOOK_ABORT_EXIT_CODE, HOOK_TIMEOUT_EXIT_CODE, type CommandHookExecutorOptions } from "./hooks.js";
export {
  isWebTranscriptPath,
  isLocalTranscriptPath,
  JsonlTranscript,
  listSessions,
  readTranscript,
  sessionsDir,
  transcriptPath,
  WEB_TRANSCRIPTS_DIR,
  type JsonlTranscriptOptions,
  type ListSessionsOptions,
  type SessionSummary,
} from "./transcript.js";
export { builtinContentDir, loadContent, type ContentIssue, type LoadContentOptions, type LoadedContent } from "./content.js";
export { buildCaseIndex, CaseIndexer, contentHash, type CaseIndexerOptions, type CaseIndexIssue, type CaseIndexSnapshot, type IndexedCaseFile } from "./case-index.js";
export { resolveNodeProviderConfig } from "./providers.js";
export { BootstrapError, catalogsFor, chooseFacility, createNodeSession, findSessionTranscript, untrustedResumeConfig, type CreateNodeSessionOptions } from "./bootstrap.js";
