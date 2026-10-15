/**
 * @clinicalcraft/mcp — MCP stdio server exposing ClinicalCraft encounters as
 * tools so external agents can play the clinician (docs/PROTOCOL.md §11).
 */
export { LATEST_PROTOCOL_VERSION, McpServer, runMcpServer, safeLog, SUPPORTED_PROTOCOL_VERSIONS, type McpServerOptions, type RunMcpServerOptions } from "./server.js";
export { callTool, checkArguments, mcpTools, textResult, type McpToolResult, type McpToolSpec, type ToolHost } from "./tools.js";
export { bridgedTools, SessionToolRunner, type SessionToolRunnerOptions, type ToolRunOutcome } from "./bridge.js";
export { mcpApprovalMode, SessionManager, sessionFlags, type LoggedEvent, type McpSession, type SessionManagerOptions } from "./sessions.js";
export { CASES_URI, listResources, listResourceTemplates, readResource, type ResourceHost } from "./resources.js";
export { classifyMessage, LineSplitter, RPC_ERRORS, RpcError, rpcError, rpcResult, type JsonRpcId, type JsonRpcResponse } from "./jsonrpc.js";
