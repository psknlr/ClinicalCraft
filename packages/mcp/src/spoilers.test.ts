/**
 * What the MCP client — the learner being assessed — sees of a published case's source (docs/GLOSSARY.md §4):
 * never its citation, DOI or source references in the listings, the resources or a mid-case `get_debrief`;
 * the debrief lists the references once the case is complete. Specialties read by their labels; a patient who
 * cannot speak opens as narration, not as the patient's words.
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { mergeSettings, rt } from "@clinicalcraft/agent";
import { loadContent, type LoadedContent } from "@clinicalcraft/agent/node";
import { parseCase, t, type CaseDefinition, type ClinicalAction } from "@clinicalcraft/core";
import { caseHandle, casesText } from "./format.js";
import type { JsonRpcResponse } from "./jsonrpc.js";
import { McpServer } from "./server.js";

const root = mkdtempSync(join(tmpdir(), "cc-mcp-spoilers-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const content = await loadContent();
const SMZL = "smzl-lung-adeno";
const smzl = content.cases.get(SMZL)?.def;

function project() {
  const dir = mkdtempSync(join(root, "p-"));
  const home = join(dir, "home");
  const cwd = join(dir, "project");
  mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
  mkdirSync(home, { recursive: true });
  return { cwd, env: { CLINICALCRAFT_HOME: home, HOME: home } };
}

function server(c: LoadedContent = content): McpServer {
  const p = project();
  return new McpServer({ settings: mergeSettings([{ source: "flag", settings: { locale: "en" } }]), env: p.env, cwd: p.cwd, content: c, log: () => undefined });
}

async function call(s: McpServer, method: string, params?: unknown): Promise<any> {
  const r = (await s.handle({ jsonrpc: "2.0", id: 1, method, ...(params !== undefined ? { params } : {}) })) as JsonRpcResponse;
  if ("error" in r) throw new Error(r.error.message);
  return r.result;
}
const tool = (s: McpServer, name: string, args: Record<string, unknown> = {}) => call(s, "tools/call", { name, arguments: args });

/** The bits of a published case's source that would spoil it. */
function sourceBits(c: CaseDefinition): string[] {
  return [c.provenance.citation, c.provenance.doi, ...(c.debrief.references ?? []).map((r) => r.slice(0, 40))].filter((x): x is string => !!x);
}

describe("MCP: a published case's source stays back until the case is complete", () => {
  it.skipIf(!smzl)("listings, resources and a mid-case get_debrief carry no citation, DOI or reference; the final debrief lists the references", async () => {
    const s = server();
    await call(s, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } });
    const bits = sourceBits(smzl!);
    expect(bits.length).toBeGreaterThan(1);
    const leaks = (value: unknown) => bits.filter((b) => JSON.stringify(value).includes(b));
    expect(leaks(await tool(s, "list_cases"))).toEqual([]);
    expect(leaks(await call(s, "resources/read", { uri: "clinicalcraft://cases" }))).toEqual([]);
    const started = await tool(s, "start_case", { case_id: caseHandle(SMZL), locale: "en" });
    expect(leaks(started)).toEqual([]);
    const id = started.structuredContent.session_id as string;
    expect(leaks(await tool(s, "get_debrief", { session_id: id }))).toEqual([]);
    expect(leaks(await call(s, "resources/read", { uri: `clinicalcraft://session/${id}/state` }))).toEqual([]);
    expect(leaks(await call(s, "resources/read", { uri: `clinicalcraft://session/${id}/transcript` }))).toEqual([]);
    // the reference path, then the debrief lists the references
    for (const step of smzl!.solution as ClinicalAction[]) {
      if (step.type === "ask") await tool(s, "ask_patient", { session_id: id, question: t(smzl!.history.find((h) => h.id === step.itemId)!.question, "en") });
      else if (step.type === "order") await tool(s, "order_test", { session_id: id, investigation_id: step.investigationId });
      else if (step.type === "read") await tool(s, "read_result", { session_id: id, investigation_id: step.investigationId, ...(step.phase ? { phase: step.phase } : {}) });
      else if (step.type === "answer") await tool(s, "answer_decision", { session_id: id, decision_id: step.decisionId, option_ids: step.optionIds });
      else if (step.type === "set-phase") await tool(s, "set_phase", { session_id: id, phase: step.phase });
      else if (step.type === "examine") await tool(s, "examine", { session_id: id, finding_id: step.findingId });
    }
    const debrief = await tool(s, "get_debrief", { session_id: id });
    expect(debrief.structuredContent.complete).toBe(true);
    expect(debrief.content[0].text).toContain(smzl!.debrief.references[0]!);
    await s.close();
  });

  it("list_cases names specialties by their labels", () => {
    const entry = { id: "x", title: "T", summary: "S", specialty: ["hematology", "colorectal-surgery"], difficulty: 2, setting: "outpatient", locales: ["en"], provenance: "published-case" };
    expect(casesText([entry], "en")).toContain("Haematology, Colorectal surgery");
    expect(casesText([entry], "zh-CN")).toContain("血液科、结直肠外科");
  });
});

describe("MCP: a patient who cannot speak", () => {
  it.skipIf(!smzl)("start_case gives the opening as narration, never as the patient's words", async () => {
    const raw = structuredClone(smzl!) as Record<string, any>;
    raw.patient.nonVerbalWhen = { always: true };
    raw.patient.nonVerbalReason = { "zh-CN": "气管插管镇静中", en: "intubated and sedated" };
    raw.patient.persona.openingLine = { "zh-CN": "（他接着呼吸机，无法说话。）", en: "(He is on a ventilator and cannot speak.)" };
    const parsed = parseCase(raw);
    if (!parsed.ok) throw new Error("case");
    const one: LoadedContent = { ...content, cases: new Map([[SMZL, { ...content.cases.get(SMZL)!, def: parsed.value }]]) };
    const s = server(one);
    await call(s, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } });
    const started = await tool(s, "start_case", { case_id: caseHandle(SMZL), locale: "en" });
    expect(started.structuredContent.opening).toBe("He is on a ventilator and cannot speak.");
    expect(started.structuredContent.speaker).toBe(rt("en", "speaker.narrator"));
    expect(started.content[0].text).toContain("He is on a ventilator and cannot speak.");
    expect(started.content[0].text).not.toContain(`${t(parsed.value.patient.displayName, "en")} says`);
    const asked = await tool(s, "ask_patient", { session_id: started.structuredContent.session_id, question: "Where does it hurt?" });
    expect(asked.content[0].text).toBe("Mr. Wang cannot answer: intubated and sedated.");
    await s.close();
  });
});
