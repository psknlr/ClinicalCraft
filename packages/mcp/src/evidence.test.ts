/**
 * Evidence over MCP (docs/PROTOCOL.md §11, docs/CASE_AUTHORING.md §5.2): a result's picture, drawn by the engine from
 * data, is returned as MCP image content after the text that says where it comes from and that it is drawn.
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { mergeSettings } from "@clinicalcraft/agent";
import { loadContent } from "@clinicalcraft/agent/node";
import { parseCase } from "@clinicalcraft/core";
import { LAP_CHOLE_SIT } from "../../core/src/engine/procedure/__fixtures__/lap-chole-sit.js";
import { caseHandle } from "./format.js";
import type { JsonRpcResponse } from "./jsonrpc.js";
import { McpServer } from "./server.js";

const root = mkdtempSync(join(tmpdir(), "cc-mcp-evidence-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const L = (en: string) => ({ en, "zh-CN": en });

function evidenceCase() {
  const raw = structuredClone(LAP_CHOLE_SIT) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  raw.id = "mcp-evidence";
  const result = {
    text: L("A tongue photo taken at the kiosk."),
    picture: { kind: "tongue", appearance: { body: "pale", coating: { color: "brown", thickness: "thick", texture: "greasy", distribution: "root" } }, capture: { light: "warm", colorCard: false } },
    provenance: { source: "patient-captured", quality: { status: "failed", reasons: [L("No colour card in the frame.")] } },
  };
  raw.investigations = [...(raw.investigations ?? []), { id: "tongue-photo", name: L("Kiosk tongue photo"), category: "record", performedAt: "records", requires: ["records"], results: Object.fromEntries(raw.phases.map((p: { id: string }) => [p.id, result])) }];
  const parsed = parseCase(raw);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3)));
  return parsed.value;
}

const builtin = await loadContent();
const c = evidenceCase();
const content = { ...builtin, cases: new Map([...builtin.cases, [c.id, { def: c, dir: root, file: join(root, "case.json") }]]) };

function server(): McpServer {
  const dir = mkdtempSync(join(root, "p-"));
  const home = join(dir, "home");
  const cwd = join(dir, "project");
  mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
  mkdirSync(home, { recursive: true });
  return new McpServer({ settings: mergeSettings([{ source: "flag", settings: { locale: "en", approvalMode: "bypass", transcripts: { enabled: false } } }]), env: { CLINICALCRAFT_HOME: home, HOME: home }, cwd, content, log: () => undefined });
}

async function call(s: McpServer, method: string, params?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const r = (await s.handle({ jsonrpc: "2.0", id: 1, method, ...(params !== undefined ? { params } : {}) })) as JsonRpcResponse;
  if ("error" in r) throw new Error(r.error.message);
  return r.result;
}

describe("MCP: evidence with its picture", () => {
  it("read_result returns the text, then the drawn picture as image content", async () => {
    const s = server();
    await call(s, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } });
    const tool = (name: string, args: Record<string, unknown>) => call(s, "tools/call", { name, arguments: args });
    const id = (await tool("start_case", { case_id: caseHandle(c.id) })).structuredContent.session_id as string;
    await tool("order_test", { session_id: id, investigation_id: "tongue-photo" });
    const r = await tool("read_result", { session_id: id, investigation_id: "tongue-photo" });
    expect(r.isError).toBeUndefined();
    expect(r.content.map((x: { type: string }) => x.type)).toEqual(["text", "image"]);
    expect(r.content[0].text).toContain("Quality check: failed — No colour card in the frame");
    expect(r.content[0].text).toContain("Picture: drawn by the simulation");
    expect(r.content[1]).toMatchObject({ type: "image", mimeType: "image/png" });
    expect(Buffer.from(r.content[1].data, "base64").subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  });
});
