/**
 * MCP tool annotations (docs/PROTOCOL.md §11, EMBODIED.md R13): every tool
 * listed by `tools/list` carries `annotations` per the MCP spec — title,
 * readOnlyHint, destructiveHint, idempotentHint, openWorldHint — and the
 * read-only / idempotent hints hold on a real encounter.
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { mergeSettings } from "@clinicalcraft/agent";
import { loadContent } from "@clinicalcraft/agent/node";
import { caseHandle } from "./format.js";
import type { JsonRpcResponse } from "./jsonrpc.js";
import { McpServer } from "./server.js";
import { TOOL_ANNOTATIONS, toolAnnotations, type McpToolSpec } from "./tools.js";

const root = mkdtempSync(join(tmpdir(), "cc-mcp-annotations-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const content = await loadContent();

function server(): McpServer {
  const dir = mkdtempSync(join(root, "p-"));
  const home = join(dir, "home");
  const cwd = join(dir, "project");
  mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
  mkdirSync(home, { recursive: true });
  return new McpServer({ settings: mergeSettings([{ source: "flag", settings: { locale: "en", transcripts: { enabled: false } } }]), env: { CLINICALCRAFT_HOME: home, HOME: home }, cwd, content, log: () => undefined });
}

async function call(s: McpServer, method: string, params?: unknown): Promise<any> {
  const r = (await s.handle({ jsonrpc: "2.0", id: 1, method, ...(params !== undefined ? { params } : {}) })) as JsonRpcResponse;
  if ("error" in r) throw new Error(r.error.message);
  return r.result;
}

// Embodied mode (PROTOCOL §12): perception only reads; walking and operating change the world.
const WORLD_READ_ONLY = ["find_entities", "find_objects", "get_action_feedback", "get_agent_state", "get_nearby_objects", "get_room_info", "get_visible_objects", "inspect_object", "observe_world"];
const READ_ONLY = ["case_status", "check_vitals", "get_debrief", "list_cases", "list_options", ...WORLD_READ_ONLY].sort();
const DESTRUCTIVE = ["delegate_task", "execute_skill", "interact_object", "intervene", "order_test"];
// taking the patient to the same destination again changes nothing ("already there")
const IDEMPOTENT = [...READ_ONLY, "cancel_action", "finish_case", "set_phase", "transport_patient", "update_workup"].sort();

describe("tools/list annotations", () => {
  it("every tool has a title and all four hints; openWorldHint is false (a closed simulation)", async () => {
    const s = server();
    await call(s, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } });
    const { tools } = (await call(s, "tools/list")) as { tools: McpToolSpec[] };
    // 17 clinical-mode tools + 17 world tools (get_camera_frame needs a browser: never listed headless).
    expect(tools.length).toBe(34);
    expect(tools.map((t) => t.name)).not.toContain("get_camera_frame");
    for (const name of ["navigate_to", "interact_object"]) expect(tools.find((t) => t.name === name)!.annotations.readOnlyHint, name).toBe(false);
    for (const tool of tools) {
      expect(Object.keys(tool.annotations).sort(), tool.name).toEqual(["destructiveHint", "idempotentHint", "openWorldHint", "readOnlyHint", "title"]);
      expect(tool.annotations.title, tool.name).toBe(tool.title);
      expect(tool.annotations.title.length).toBeGreaterThan(0);
      for (const hint of ["readOnlyHint", "destructiveHint", "idempotentHint", "openWorldHint"] as const) expect(typeof tool.annotations[hint]).toBe("boolean");
      expect(tool.annotations.openWorldHint).toBe(false);
      // Spelled out per tool: none falls back to the cautious defaults.
      expect(TOOL_ANNOTATIONS[tool.name], tool.name).toBeDefined();
      // A read-only tool is never destructive.
      if (tool.annotations.readOnlyHint) expect(tool.annotations.destructiveHint, tool.name).toBe(false);
    }
    const names = (pick: (t: McpToolSpec) => boolean) => tools.filter(pick).map((t) => t.name).sort();
    expect(names((t) => t.annotations.readOnlyHint)).toEqual(READ_ONLY);
    expect(names((t) => t.annotations.destructiveHint)).toEqual(DESTRUCTIVE);
    expect(names((t) => t.annotations.idempotentHint)).toEqual(IDEMPOTENT);
    expect(Object.keys(TOOL_ANNOTATIONS).sort()).toEqual(tools.map((t) => t.name).sort());
    // A tool missing from the table would get the spec's cautious defaults.
    expect(toolAnnotations("future_tool")).toEqual({ title: "future_tool", readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false });
  });

  it.skipIf(!content.cases.has("stemi-inferior-rv") || !content.cases.has("smzl-lung-adeno"))(
    "read-only tools leave the encounter untouched (simulated clock); set_phase and update_workup repeat without effect",
    async () => {
      const s = server();
      await call(s, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } });
      const tool = (name: string, args: Record<string, unknown>) => call(s, "tools/call", { name, arguments: args });
      const started = await tool("start_case", { case_id: caseHandle("stemi-inferior-rv") });
      const id = started.structuredContent.session_id as string;
      const state = () => JSON.stringify(s.sessions.get(id)!.session.state);
      await tool("ask_patient", { session_id: id, question: "Where is the pain?" }); // the encounter is under way
      const before = state();
      await tool("list_options", { session_id: id, kind: "investigations" });
      await tool("check_vitals", { session_id: id });
      await tool("case_status", { session_id: id });
      await tool("get_debrief", { session_id: id });
      expect(state()).toBe(before);

      const smzl = (await tool("start_case", { case_id: caseHandle("smzl-lung-adeno") })).structuredContent.session_id as string;
      const withoutSeq = () => {
        const { seq: _seq, ...rest } = s.sessions.get(smzl)!.session.state;
        return JSON.stringify(rest);
      };
      expect((await tool("set_phase", { session_id: smzl, phase: "post" })).isError).toBeUndefined();
      const once = withoutSeq();
      await tool("set_phase", { session_id: smzl, phase: "post" });
      expect(withoutSeq()).toBe(once);
      const plan = { session_id: smzl, plan: [{ text: "Review the marrow", status: "pending" }] };
      const first = await tool("update_workup", plan);
      const second = await tool("update_workup", plan);
      expect(second.structuredContent.data).toEqual(first.structuredContent.data);
      expect(withoutSeq()).toBe(once);
    },
  );
});
