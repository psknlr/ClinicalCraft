/**
 * The MCP client is the learner being assessed: a decision reaches it only by its number in case order ("Decision
 * 2") and its options only by their letters (A, B, C… in presentation order) — in `list_options`, `case_status`,
 * `answer_decision` (input, text and structured content, its errors and rejections), a mid-case `get_debrief` and
 * the state and transcript resources — never by their authored ids, which often name the diagnosis or the answer
 * ("carney", "supported", "alternative-1"). Exact ids are still accepted as input from older clients.
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { mergeSettings, optionLabel } from "@clinicalcraft/agent";
import { loadContent, type LoadedContent } from "@clinicalcraft/agent/node";
import { parseCase, presentedOptions, t, type CaseDefinition, type ClinicalAction } from "@clinicalcraft/core";
import { caseHandle } from "./format.js";
import type { JsonRpcResponse } from "./jsonrpc.js";
import { McpServer } from "./server.js";

const root = mkdtempSync(join(tmpdir(), "cc-mcp-letters-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const content = await loadContent();
const SMZL = "smzl-lung-adeno";
const smzl = content.cases.get(SMZL)?.def;

/** Condition and action keys whose value is a decision id. */
const DECISION_REF_KEYS = new Set(["decided", "attempted", "decidedFirstTry", "decisionId"]);

/** Rename every reference to a decision id in a raw case (conditions, the solution). */
function renameDecisionRefs(value: unknown, renamed: ReadonlyMap<string, string>): void {
  if (Array.isArray(value)) for (const v of value) renameDecisionRefs(v, renamed);
  else if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (DECISION_REF_KEYS.has(key) && typeof v === "string" && renamed.has(v)) (value as Record<string, unknown>)[key] = renamed.get(v);
      else renameDecisionRefs(v, renamed);
    }
  }
}

/**
 * SMZL with every decision and option renamed as some cases author them — a decision "dx-secret-<n>", an option
 * "supported-<n>" when correct and "alternative-<n>-<k>" otherwise (the reference solution follows) — and the renamed
 * ids: each would give the answer away if a client saw it. `mutate` edits the raw case first.
 */
function roleNamedCase(c: CaseDefinition, mutate?: (raw: Record<string, any>) => void): { def: CaseDefinition; secretIds: string[] } {
  const raw = structuredClone(c) as Record<string, any>;
  mutate?.(raw);
  const options = new Map<string, string>();
  const decisions = new Map<string, string>();
  (raw.decisions as { id: string; options: { id: string; correct: boolean }[] }[]).forEach((d, n) => {
    let alternative = 0;
    let supported = 0;
    for (const o of d.options) {
      const id = o.correct ? `supported-${n}${supported++ ? `-${supported}` : ""}` : `alternative-${n}-${++alternative}`;
      options.set(`${d.id}/${o.id}`, id);
      o.id = id;
    }
  });
  for (const step of raw.solution as ClinicalAction[]) if (step.type === "answer") step.optionIds = step.optionIds.map((id) => options.get(`${step.decisionId}/${id}`)!);
  (raw.decisions as { id: string }[]).forEach((d, n) => {
    decisions.set(d.id, `dx-secret-${n + 1}`);
    d.id = `dx-secret-${n + 1}`;
  });
  renameDecisionRefs(raw, decisions);
  const parsed = parseCase(raw);
  if (!parsed.ok) throw new Error(`role-named case does not parse: ${parsed.issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`);
  return { def: parsed.value, secretIds: [...options.values(), ...decisions.values()] };
}

function server(c: CaseDefinition): McpServer {
  const dir = mkdtempSync(join(root, "p-"));
  const home = join(dir, "home");
  const cwd = join(dir, "project");
  mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
  mkdirSync(home, { recursive: true });
  const one: LoadedContent = { ...content, cases: new Map([[SMZL, { ...content.cases.get(SMZL)!, def: c }]]) };
  return new McpServer({ settings: mergeSettings([{ source: "flag", settings: { locale: "en" } }]), env: { CLINICALCRAFT_HOME: home, HOME: home }, cwd, content: one, log: () => undefined });
}

async function call(s: McpServer, method: string, params?: unknown): Promise<any> {
  const r = (await s.handle({ jsonrpc: "2.0", id: 1, method, ...(params !== undefined ? { params } : {}) })) as JsonRpcResponse;
  if ("error" in r) throw new Error(r.error.message);
  return r.result;
}
const tool = (s: McpServer, name: string, args: Record<string, unknown> = {}) => call(s, "tools/call", { name, arguments: args });

/** The reference solution's work-up steps (asks, orders, reads) through MCP tools. */
async function workUp(s: McpServer, id: string, c: CaseDefinition, steps: readonly ClinicalAction[]): Promise<void> {
  for (const step of steps) {
    if (step.type === "ask") await tool(s, "ask_patient", { session_id: id, question: t(c.history.find((h) => h.id === step.itemId)!.question, "en") });
    else if (step.type === "order") await tool(s, "order_test", { session_id: id, investigation_id: step.investigationId });
    else if (step.type === "read") await tool(s, "read_result", { session_id: id, investigation_id: step.investigationId, ...(step.phase ? { phase: step.phase } : {}) });
  }
}

/** A session on the case, worked up to the reference solution's first answer (that decision is open). */
async function atFirstAnswer(c: CaseDefinition) {
  const solution = c.solution as ClinicalAction[];
  const answers = solution.flatMap((step, i) => (step.type === "answer" ? [{ step, i }] : []));
  const first = c.decisions.find((d) => d.id === (answers[0]!.step as Extract<ClinicalAction, { type: "answer" }>).decisionId)!;
  const s = server(c);
  await call(s, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } });
  const started = await tool(s, "start_case", { case_id: caseHandle(SMZL), locale: "en" });
  const id = started.structuredContent.session_id as string;
  await workUp(s, id, c, solution.slice(0, answers[0]!.i));
  const number = c.decisions.indexOf(first) + 1;
  const presented = presentedOptions(c, first);
  const letter = (o: (typeof presented)[number]) => optionLabel(presented.indexOf(o));
  return { s, id, solution, answers, first, number, presented, letter };
}

describe("MCP: decisions by number, options by letter — never by authored id", () => {
  it.skipIf(!smzl)("list_options, case_status, answer_decision, get_debrief and the resources name decisions by number and options by letter only", async () => {
    const { def: c, secretIds } = roleNamedCase(smzl!);
    // Ids that are no letters or numbers, and that would name the answer.
    for (const d of c.decisions) expect(d.id).toMatch(/^dx-secret-\d$/);
    /** Every authored decision or option id the value mentions. */
    const idsIn = (value: unknown) => secretIds.filter((x) => JSON.stringify(value).includes(x));
    const { s, id, solution, answers, first, number, presented, letter } = await atFirstAnswer(c);
    expect(answers.length).toBeGreaterThan(1);
    expect(first.options.length).toBeGreaterThan(1);

    const listed = await tool(s, "list_options", { session_id: id, kind: "decisions" });
    const items = listed.structuredContent.data.items as { number: number; unlocked: boolean; options: { label: string; text: string }[] }[];
    expect(items.map((d) => d.number)).toEqual(c.decisions.map((_, i) => i + 1));
    const item = items.find((d) => d.number === number)!;
    expect(item.unlocked).toBe(true);
    expect(item.options).toEqual(presented.map((o) => ({ label: letter(o), text: t(o.text, "en") })));
    expect(listed.content[0].text).toContain(`- Decision ${number}: ${t(first.prompt, "en")} (open)`);
    for (const o of presented) expect(listed.content[0].text).toContain(`    [${letter(o)}] ${t(o.text, "en")}`);
    const status = await tool(s, "case_status", { session_id: id });
    expect(status.content[0].text).toContain(`Decision ${number}: ${t(first.prompt, "en")} (open)`);
    expect(status.structuredContent.data.decisions).toContainEqual({ number, unlocked: true, decided: false });
    expect(idsIn([listed, status])).toEqual([]);

    // A token naming no option: the error lists every option by letter; no decision: the decisions by number.
    const bad = await tool(s, "answer_decision", { session_id: id, decision_id: String(number), option_ids: ["Z"] });
    expect(bad.isError).toBe(true);
    expect(bad.content[0].text).toContain(presented.map((o) => `${letter(o)} (${t(o.text, "en")})`).join("; "));
    const noSuch = await tool(s, "answer_decision", { session_id: id, decision_id: "99", option_ids: ["A"] });
    expect(noSuch.content[0].text).toBe(`No decision “99”. Name a decision by its number: ${c.decisions.map((_, i) => i + 1).join(", ")}.`);
    expect(idsIn([bad, noSuch])).toEqual([]);

    // A wrong answer by letter, then the right one(s) by lower-case letter: text and structured content by number and letter only.
    const wrongLetter = letter(presented.find((o) => !o.correct)!);
    const rightLetters = presented.filter((o) => o.correct).map(letter);
    const wrong = await tool(s, "answer_decision", { session_id: id, decision_id: `D${number}`, option_ids: [wrongLetter] });
    expect(wrong.structuredContent.data).toMatchObject({ decision: number, correct: false, options: [{ label: wrongLetter }] });
    const answered = await tool(s, "answer_decision", { session_id: id, decision_id: String(number), option_ids: rightLetters.map((l) => l.toLowerCase()) });
    expect(answered.isError, answered.content[0].text).toBeUndefined();
    expect(answered.content[0].text).toMatch(/^Correct\./);
    expect(answered.structuredContent.data).toEqual({ decision: number, correct: true, firstTry: false, options: rightLetters.map((label) => ({ label, text: expect.any(String) })) });
    expect(idsIn([wrong, answered])).toEqual([]);

    // Answering the decided decision again — by number, and by its exact id as an older client would: refused by
    // number, the structured content carrying the rejection code only (the engine's message names the decision's id).
    for (const ref of [String(number), first.id]) {
      const again = await tool(s, "answer_decision", { session_id: id, decision_id: ref, option_ids: rightLetters });
      expect(again.isError).toBe(true);
      expect(again.content[0].text).toBe(`Decision ${number} has already been answered correctly.`);
      expect(again.structuredContent.data).toEqual({ rejected: { code: "already-decided" } });
      expect(idsIn(again)).toEqual([]);
    }

    // The resources say what was chosen by number and letter too; decided decisions are keyed by number.
    const state = JSON.parse((await call(s, "resources/read", { uri: `clinicalcraft://session/${id}/state` })).contents[0].text);
    expect(state.state.attempts.map((a: { decision: number; options: string[]; correct: boolean }) => [a.decision, a.options, a.correct])).toEqual([
      [number, [wrongLetter], false],
      [number, rightLetters, true],
    ]);
    expect(Object.keys(state.state.decisions)).toEqual([String(number)]);
    const transcript = JSON.parse((await call(s, "resources/read", { uri: `clinicalcraft://session/${id}/transcript` })).contents[0].text);
    const events = (transcript.events as { event?: { type: string; decision?: number; options?: string[] } }[]).filter((e) => e.event?.type === "decision.answered");
    expect(events.map((e) => [e.event!.decision, e.event!.options])).toEqual([
      [number, [wrongLetter]],
      [number, rightLetters],
    ]);
    // The two repeats are logged by their action and code; no rejection carries the engine's message.
    const rejected = (transcript.events as { event?: Record<string, unknown> }[]).flatMap((e) => (e.event?.type === "action.rejected" ? [e.event] : []));
    expect(rejected.filter((e) => e.action === "answer")).toEqual([
      { type: "action.rejected", action: "answer", code: "already-decided" },
      { type: "action.rejected", action: "answer", code: "already-decided" },
    ]);
    for (const e of rejected) expect(Object.keys(e).sort()).toEqual(["action", "code", "type"]);
    // A mid-case assessment names every decision — locked ones too — by number.
    const debrief = await tool(s, "get_debrief", { session_id: id });
    expect(debrief.structuredContent.complete).toBe(false);
    expect((debrief.structuredContent.report.decisions as { number: number }[]).map((d) => d.number)).toEqual(c.decisions.map((_, i) => i + 1));
    expect(idsIn([state, transcript, debrief])).toEqual([]);

    // An exact authored decision and option id are still accepted (older clients) — and still never echoed.
    const second = answers[1]!.step as Extract<ClinicalAction, { type: "answer" }>;
    await workUp(s, id, c, solution.slice(answers[0]!.i + 1, answers[1]!.i));
    const byId = await tool(s, "answer_decision", { session_id: id, decision_id: second.decisionId, option_ids: second.optionIds });
    expect(byId.structuredContent.data).toMatchObject({ decision: c.decisions.findIndex((d) => d.id === second.decisionId) + 1, correct: true });
    expect(idsIn(byId)).toEqual([]);
    await s.close();
  });

  it.skipIf(!smzl)("\"A, C\" in one option_ids item is two options (a select-all decision)", async () => {
    // SMZL's first decision made select-all, with two correct options.
    const { def: c, secretIds } = roleNamedCase(smzl!, (raw) => {
      const solution = raw.solution as ClinicalAction[];
      const step = solution.find((x): x is Extract<ClinicalAction, { type: "answer" }> => x.type === "answer")!;
      const d = (raw.decisions as { id: string; kind?: string; options: { id: string; correct: boolean }[] }[]).find((x) => x.id === step.decisionId)!;
      d.kind = "multiple";
      const other = d.options.find((o) => !o.correct)!;
      other.correct = true;
      step.optionIds = d.options.filter((o) => o.correct).map((o) => o.id);
    });
    const { s, id, number, presented, letter } = await atFirstAnswer(c);
    const right = presented.filter((o) => o.correct).map(letter);
    expect(right).toHaveLength(2);
    const out = await tool(s, "answer_decision", { session_id: id, decision_id: String(number), option_ids: [right.join(", ")] });
    expect(out.isError, out.content[0].text).toBeUndefined();
    expect(out.structuredContent.data).toMatchObject({ decision: number, correct: true, options: right.map((label) => ({ label })) });
    const state = JSON.parse((await call(s, "resources/read", { uri: `clinicalcraft://session/${id}/state` })).contents[0].text);
    expect(state.state.attempts).toEqual([expect.objectContaining({ decision: number, options: right, correct: true })]);
    expect(secretIds.filter((x) => JSON.stringify([out, state]).includes(x))).toEqual([]);
    await s.close();
  });
});
