/**
 * Terminal safety of the CLI renderers: model, case and provider text never
 * reaches the TTY with control characters or escape sequences (OSC 52
 * clipboard writes, cursor movement that could rewrite an approval prompt,
 * hyperlinks…); only the palette's own SGR colour codes are emitted.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import type { AgentEvent, EventMsg } from "@clinicalcraft/agent";
import { loadContent } from "@clinicalcraft/agent/node";
import { writeZip } from "./__fixtures__/v4.js";
import { createPalette } from "./ansi.js";
import type { CliIO } from "./context.js";
import { main } from "./main.js";
import { EventRenderer, sanitizeTerminal } from "./render.js";

const root = mkdtempSync(join(tmpdir(), "cc-cli-render-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const content = await loadContent();
const smzl = content.cases.get("smzl-lung-adeno")?.def;

const OSC52 = "\u001b]52;c;ZXZpbA==\u0007";
const UP = "\u001b[2A\u001b[2K";
const HYPERLINK = "\u001b]8;;https://evil.example\u001b\\click\u001b]8;;\u001b\\";
const C1_CSI = "\u009b31m";
const NASTY = `ok${OSC52}${UP}${HYPERLINK}${C1_CSI}\rApproved\u0007\u0008\u007f\u0000 end`;

/** Escape sequences other than SGR colour codes (`ESC [ … m`). */
function foreignEscapes(text: string): string[] {
  return [...text.matchAll(/\u001b(?!\[[0-9;]*m)[\s\S]{0,6}|[\u0000-\u0008\u000b-\u001a\u001c-\u001f\u007f-\u009f\r]/g)].map((m) => JSON.stringify(m[0]));
}

describe("sanitizeTerminal", () => {
  it("removes C0/C1 controls and whole escape sequences, keeping newlines, tabs and text", () => {
    expect(sanitizeTerminal(NASTY)).toBe("okclickApproved end");
    expect(sanitizeTerminal("line 1\n\tline 2\r\nline 3")).toBe("line 1\n\tline 2\nline 3");
    expect(sanitizeTerminal("王先生：医生您好。SpO₂ 92% — “ok” 🙂")).toBe("王先生：医生您好。SpO₂ 92% — “ok” 🙂");
    expect(sanitizeTerminal("\u001bc\u001b(B\u001b7reset\u001b8")).toBe("reset");
    expect(sanitizeTerminal("\u001bP1$r\u001b\\dcs")).toBe("dcs");
    // Split across stream chunks: each chunk is still harmless on its own.
    for (const chunk of ["\u001b]52;c;ZXZp", "bA==\u0007tail", "\u001b", "[2A"]) expect(foreignEscapes(sanitizeTerminal(chunk))).toEqual([]);
  });
});

describe("EventRenderer never forwards terminal control sequences", () => {
  it.skipIf(!smzl)("lines callers build from case text keep only the palette's colours", () => {
    let out = "";
    const renderer = new EventRenderer({ out: { write: (s: string) => ((out += s), true) }, palette: createPalette(true), caseDef: smzl!, locale: () => "en", interactive: false });
    const p = createPalette(true);
    renderer.line(`${p.bold("Case")} ${NASTY}`);
    expect(foreignEscapes(out)).toEqual([]);
    expect(out).toContain("\u001b[1mCase\u001b[22m");
  });

  it.skipIf(!smzl)("deltas, messages, tool output, approvals, errors, plans and case text", () => {
    for (const colour of [false, true]) {
      let out = "";
      const evilCase = structuredClone(smzl!);
      evilCase.patient.displayName = { "zh-CN": `王${OSC52}先生`, en: `Mr.${UP} Wang` };
      evilCase.objectives[0]!.title = { "zh-CN": `目标${HYPERLINK}`, en: `Objective${HYPERLINK}` };
      const renderer = new EventRenderer({ out: { write: (s: string) => ((out += s), true) }, palette: createPalette(colour), caseDef: evilCase, locale: () => "en", interactive: false, verbose: true });
      let seq = 0;
      const emit = (msg: EventMsg) => renderer.handle({ id: "s", seq: ++seq, msg } as AgentEvent);
      emit({ type: "agent_message_delta", turnId: "t1", agent: "patient", delta: `Hello ${OSC52}` });
      emit({ type: "agent_message_delta", turnId: "t1", agent: "patient", delta: `${UP}world` });
      emit({ type: "turn_complete", turnId: "t1", agent: "patient", lastMessage: "x", durationMs: 1 });
      emit({ type: "agent_message", turnId: "t2", agent: "nurse", speaker: `Nurse${C1_CSI}`, text: NASTY, grounded: [] });
      emit({ type: "agent_reasoning", turnId: "t2", agent: "nurse", text: NASTY });
      emit({ type: "tool_call_begin", turnId: "t3", agent: "clinician", callId: "c1", tool: "order_test", args: { query: NASTY } });
      emit({ type: "tool_call_end", turnId: "t3", agent: "clinician", callId: "c1", tool: "order_test", ok: true, output: NASTY });
      emit({ type: "tool_call_end", turnId: "t3", agent: "clinician", callId: "c2", tool: "intervene", ok: false, output: NASTY });
      emit({ type: "approval_request", requestId: "r1", agent: "clinician", tool: "intervene", args: {}, summary: NASTY, risk: "high", ruleId: "tool.always-ask", reason: NASTY, allowSession: false });
      emit({ type: "approval_resolved", requestId: "r1", decision: "denied", reason: NASTY });
      emit({ type: "plan_updated", agent: "clinician", plan: [{ text: NASTY, status: "pending" }], explanation: NASTY });
      emit({ type: "command_output", name: "case", text: NASTY });
      emit({ type: "api_retry", agent: "nurse", attempt: 1, delayMs: 1000, error: NASTY });
      emit({ type: "warning", message: NASTY });
      emit({ type: "error", message: NASTY, code: `x${OSC52}` });
      emit({ type: "agent_message", turnId: "t4", agent: "patient", text: "Fine.", grounded: [] });
      emit({ type: "clinical_event", event: { type: "objective.completed", objectiveId: evilCase.objectives[0]!.id } } as EventMsg);
      expect(foreignEscapes(out), `colour=${colour}`).toEqual([]);
      if (!colour) expect(out).not.toContain("\u001b");
      const plain = out.replace(/\u001b\[[0-9;]*m/g, "");
      expect(plain).toContain("Hello world");
      expect(plain).toContain("okclickApproved end");
      expect(plain).toContain("Mr. Wang: Fine.");
      expect(plain).toContain("Objectiveclick");
    }
  });
});

describe("EventRenderer names decisions by number", () => {
  it.skipIf(!smzl)("an answer_decision call shows the decision's number, never its authored id (the demonstration passes ids)", () => {
    let out = "";
    const renderer = new EventRenderer({ out: { write: (s: string) => ((out += s), true) }, palette: createPalette(false), caseDef: smzl!, locale: () => "en", interactive: false });
    let seq = 0;
    const emit = (msg: EventMsg) => renderer.handle({ id: "s", seq: ++seq, msg } as AgentEvent);
    const [first, second] = smzl!.decisions;
    emit({ type: "tool_call_begin", turnId: "t1", agent: "clinician", callId: "c1", tool: "answer_decision", args: { decision_id: second!.id, option_ids: ["B"] } });
    emit({ type: "tool_call_end", turnId: "t1", agent: "clinician", callId: "c1", tool: "answer_decision", ok: true, output: "Correct." });
    emit({ type: "tool_call_begin", turnId: "t1", agent: "clinician", callId: "c2", tool: "answer_decision", args: { decision_id: "1", option_ids: ["A", "C"] } });
    expect(out).toContain("answer_decision(2: B)");
    expect(out).toContain("answer_decision(1: A+C)");
    expect(out).not.toContain(first!.id);
    expect(out).not.toContain(second!.id);
  });
});

describe("import-v4 output", () => {
  it("prints warnings and errors built from file contents without control sequences", { timeout: 60_000 }, async () => {
    const home = join(root, "home");
    mkdirSync(home, { recursive: true });
    const env = { CLINICALCRAFT_HOME: home, HOME: home, NO_COLOR: "1" };
    const html = join(root, "evil.html");
    // A figure key carrying an OSC 52 clipboard write and cursor movement; its data is not a PNG (→ a warning naming the key).
    writeFileSync(html, '<script>window.CASE_DATA = {"images": {"1\\u001b]52;c;ZXZpbA==\\u0007\\u001b[2A": "aGVsbG8="}};</script>');
    const run = async (argv: string[]) => {
      const stdout = new PassThrough();
      const stderr = new PassThrough();
      const stdin = new PassThrough();
      let out = "";
      stdout.on("data", (d: Buffer) => (out += d.toString("utf8")));
      stderr.on("data", (d: Buffer) => (out += d.toString("utf8")));
      stdin.end("");
      const code = await main(argv, { io: { stdout, stderr, stdin } as unknown as CliIO, env, cwd: root });
      return { code, out };
    };
    const r = await run(["import-v4", html, "--dest", join(root, "dest"), "--lang", "en"]);
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain("is not a PNG image");
    expect(r.out).not.toMatch(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/);
    // A zip whose entry name carries escapes and claims 300 MiB → an error message naming it.
    const archive = writeZip([{ name: "x\u001b]0;pwned\u0007.html", data: Buffer.from("hi") }]);
    const cdOffset = archive.readUInt32LE(archive.length - 22 + 16);
    archive.writeUInt32LE(300 * 1024 * 1024, cdOffset + 24);
    const zip = join(root, "evil.zip");
    writeFileSync(zip, archive);
    const bad = await run(["import-v4", zip, "--lang", "en", "--dest", join(root, "dest2")]);
    expect(bad.code).toBe(1);
    expect(bad.out).toContain("too large to unpack safely"); // localised; the entry name is technical detail
    // --verbose adds the technical detail, which names the entry: the whole OSC title sequence is gone.
    const verbose = await run(["import-v4", zip, "--lang", "en", "--dest", join(root, "dest2"), "--verbose"]);
    expect(verbose.out).toContain("(at x.html)");
    expect(verbose.out).not.toMatch(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/);
  });
});
