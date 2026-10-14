/**
 * @clinicalcraft/agent — isomorphic exports (browser-safe; no `node:*`
 * imports). Node-only helpers live in `@clinicalcraft/agent/node`.
 * See docs/PROTOCOL.md for the contract of every module.
 */

// contracts
export * from "./protocol.js";
export * from "./providers/types.js";
export * from "./tools/types.js";
export * from "./settings/schema.js";
export * from "./hooks/types.js";
export * from "./agents/types.js";
export * from "./session/types.js";

// providers
export * from "./providers/catalog.js";
export * from "./providers/sse.js";
export * from "./providers/errors.js";
export * from "./providers/structured.js";
export * from "./providers/anthropic.js";
export * from "./providers/openai.js";
export * from "./providers/proxy.js";
export * from "./providers/offline.js";
export * from "./providers/scripted.js";
export * from "./providers/factory.js";

// names exported by two modules: pick one explicitly
export { MISSING_TOOL_RESULT } from "./providers/anthropic.js";
export type { SettingsLayer } from "./settings/schema.js";
export type { SettingsLayer as SettingsLayerInput } from "./settings/merge.js";

// settings, permissions, hooks
export * from "./settings/merge.js";
export * from "./permissions.js";
export * from "./hooks/runner.js";

// tools
export * from "./tools/index.js";

// agents
export * from "./agents/markdown.js";
export * from "./agents/builtin.js";
export * from "./agents/prompts.js";
export * from "./agents/offline.js";

// runtime
export * from "./loop.js";
export * from "./commands.js";
export * from "./compaction.js";
export * from "./memory.js";
export * from "./transcript.js";

// session
export * from "./session/router.js";
export * from "./session/i18n.js";
export * from "./session/grounding.js";
export * from "./session/patient-pipeline.js";
export * from "./session/events.js";
export * from "./session/approvals.js";
export * from "./session/notifications.js";
export * from "./session/models.js";
export * from "./session/examiner.js";
export * from "./session/session.js";
