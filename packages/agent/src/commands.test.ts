import { describe, expect, it } from "vitest";
import { makeSession, msgsOf } from "./__fixtures__/harness.js";
import { BUILTIN_COMMANDS, commandDescription } from "./commands.js";
import type { ApprovalDecision } from "./protocol.js";
import { displayWidth, table } from "./tools/format.js";

async function command(t: Awaited<ReturnType<typeof makeSession>>, line: string) {
  const events = await t.session.run({ type: "user_message", text: line });
  const out = msgsOf(events, "command_output");
  return { events, out: out.at(-1)!, all: out };
}

function approveAll(t: Awaited<ReturnType<typeof makeSession>>, decision: ApprovalDecision = "approved"): void {
  t.session.subscribe((e) => {
    if (e.msg.type === "approval_request") t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision });
  });
}

describe("built-in commands", () => {
  it("covers every PROTOCOL §9 command with localised descriptions", () => {
    const names = BUILTIN_COMMANDS.map((c) => c.name);
    for (const n of ["help", "case", "ask", "exam", "order", "results", "read", "give", "vitals", "board", "answer", "phase", "wait", "hint", "status", "plan", "note", "talk", "consult", "autopilot", "assess", "debrief", "model", "provider", "approval", "scope", "permissions", "compact", "export", "lang", "clear", "quit"]) {
      expect(names).toContain(n);
    }
    expect(commandDescription(BUILTIN_COMMANDS[0]!, "zh-CN")).toBe("列出命令");
  });

  it("/help lists commands as a table with structured data", async () => {
    const t = await makeSession();
    const { out } = await command(t, "/help");
    expect(out.name).toBe("help");
    expect(out.text).toMatch(/\/order <query>\s+Order an investigation/);
    expect((out.data as { commands: unknown[] }).commands.length).toBeGreaterThan(30);
  });

  it("/status shows settings and case status", async () => {
    const t = await makeSession();
    const { out } = await command(t, "/status");
    expect(out.text).toMatch(/Approval mode\s+default/);
    expect(out.text).toMatch(/Objectives \(0\/3\)/);
    expect(out.data).toMatchObject({ settings: { provider: "offline", approvalMode: "default" }, status: { phase: "ed", clock: 0 } });
  });

  it("/order resolves queries, lists ambiguous candidates and orders through the gate", async () => {
    const t = await makeSession();
    const ambiguous = await command(t, "/order ct");
    expect(ambiguous.out.text).toMatch(/Ambiguous/);
    expect(ambiguous.out.text).toContain("ct-head (CT head)");
    expect(t.session.state.orders).toEqual([]);
    const ok = await command(t, "/order ECG");
    expect(ok.out.text).toMatch(/Ordered ECG \(Emergency\)\. Result expected at minute 5/);
    expect(t.session.state.orders.map((o) => o.key)).toEqual(["ecg@ed"]);
    expect(t.session.state.started).toBe(true);
    const results = await command(t, "/results");
    expect(results.out.text).toMatch(/ECG\s+ecg\s+Emergency\s+pending/);
  });

  it("/order of a moderate-risk test asks for approval (learner gate)", async () => {
    const t = await makeSession();
    approveAll(t, "denied");
    const { events, out } = await command(t, "/order ct-chest");
    expect(msgsOf(events, "approval_request")[0]).toMatchObject({ agent: "learner", tool: "order_test", risk: "moderate" });
    expect(out.text).toMatch(/not permitted/);
    expect(t.session.state.orders).toEqual([]);
  });

  it("/vitals renders the monitor", async () => {
    const t = await makeSession();
    const { out } = await command(t, "/vitals");
    expect(out.text).toMatch(/HR 96\/min · BP 138\/84 mmHg/);
    expect((out.data as { data: { vitals: { hr: number } } }).data.vitals.hr).toBe(96);
  });

  it("/board and /answer by index and letter", async () => {
    const t = await makeSession();
    const board = await command(t, "/board");
    // A locked decision is listed by number with what it needs — never its prompt or options.
    expect(board.out.text).toMatch(/\[dx\] Decision 1 \(not yet available\) \(locked\)/);
    expect(board.out.text).not.toContain("Most likely diagnosis?");
    expect(board.out.text).not.toContain("Inferior STEMI");
    expect(board.out.text).toContain("Review the ECG first.");
    const early = await command(t, "/answer 1 A");
    expect(early.out.text).toMatch(/Not yet answerable/);
    await command(t, "/order ecg");
    await command(t, "/wait 5");
    const read = await command(t, "/read ecg");
    expect(read.out.text).toContain("ST elevation in II, III and aVF");
    const unlocked = await command(t, "/board");
    expect(unlocked.out.text).toContain("Most likely diagnosis?");
    // Letters follow the presented (shuffled) order shown by /board.
    const shown = [...unlocked.out.text.matchAll(/^\s+\[([\w-]+)\] /gm)].map((m) => m[1]!);
    const letter = String.fromCharCode(65 + shown.indexOf("stemi"));
    const answer = await command(t, `/answer dx ${letter}`);
    expect(answer.out.text).toMatch(/^Correct\./);
    expect(t.session.state.decisions).toHaveProperty("dx");
  });

  it("/ask lists questions and asks by number (the patient answers)", async () => {
    const t = await makeSession();
    const list = await command(t, "/ask");
    expect(list.out.text).toMatch(/1\.\s+When did the chest pain start\?/);
    const { events } = await command(t, "/ask 4");
    expect(msgsOf(events, "agent_message")[0]!.text).toBe("I've smoked a pack a day for 30 years.");
    expect(t.session.state.asked).toEqual(["smoking"]);
    const free = await command(t, "/ask what does the pain feel like");
    expect(msgsOf(free.events, "agent_message")[0]!.text).toContain("heavy weight");
  });

  it("/exam lists manoeuvres and examines by query", async () => {
    const t = await makeSession();
    expect((await command(t, "/exam")).out.text).toContain("[heart] Auscultate the heart");
    const exam = await command(t, "/exam listen to the heart");
    expect(exam.out.text).toBe("Auscultate the heart: Normal heart sounds, no murmur.");
    const none = await command(t, "/exam check the reflexes");
    expect(none.out.text).toBe("Not recorded in this case.");
  });

  it("/hint, /note, /plan, /phase, /talk, /approval, /lang", async () => {
    const t = await makeSession();
    expect((await command(t, "/hint")).out.text).toBe("Hint: Ask when the pain started and what it feels like.");
    expect(t.session.state.hints).toBe(1);
    expect((await command(t, "/note likely ACS")).out.text).toBe("Note added.");
    expect((await command(t, "/plan")).out.text).toBe("No workup plan yet.");
    expect((await command(t, "/phase")).out.text).toContain("[ed] Emergency (current)");
    expect((await command(t, "/talk nurse")).out.text).toBe("Now talking to: nurse");
    expect((await command(t, "/talk wizard")).out.text).toMatch(/Unknown agent/);
    expect((await command(t, "/approval yolo")).out.text).toMatch(/Invalid value/);
    await command(t, "/approval auto");
    expect(t.session.settings.approvalMode).toBe("auto");
    const lang = await command(t, "/lang zh-CN");
    expect(lang.out.text).toBe("语言：zh-CN");
    expect((await command(t, "/status")).out.text).toContain("审批模式");
  });

  it("/debrief is locked until the objectives are complete", async () => {
    const t = await makeSession();
    expect((await command(t, "/debrief")).out.text).toMatch(/available once every objective/);
    await t.session.run({ type: "autopilot" });
    const { out } = await command(t, "/debrief");
    expect(out.text).toContain("Inferior STEMI.");
    expect(out.text).toContain("not a validated competency score");
  });

  it("/export returns a snapshot; /permissions shows rules; unknown commands are reported", async () => {
    const t = await makeSession();
    await command(t, "/order ecg");
    const exp = await command(t, "/export run.json");
    expect(exp.out.text).toMatch(/2 actions\) → run\.json/);
    expect((exp.out.data as { snapshot: { format: string } }).snapshot.format).toBe("clinicalcraft-session@1");
    expect((await command(t, "/permissions")).out.text).toMatch(/allow\s+-/);
    expect((await command(t, "/frobnicate")).out.text).toMatch(/Unknown command \/frobnicate/);
  });

  it("custom Markdown commands expand templates and go to their agent", async () => {
    const t = await makeSession({ commands: [{ name: "sbar", description: "SBAR", source: "project", template: "Please give me an SBAR handover about $ARGUMENTS ($1).", agent: "nurse" }] });
    const events = await t.session.run({ type: "slash_command", name: "sbar", args: "vitals now" });
    const reply = msgsOf(events, "agent_message")[0]!;
    expect(reply.agent).toBe("nurse");
    expect(t.session.conversationOf("nurse")[0]!.content[0]).toEqual({ type: "text", text: "Please give me an SBAR handover about vitals now (vitals)." });
  });

  it("/consult sends to the role", async () => {
    const t = await makeSession();
    const events = await t.session.run({ type: "user_message", text: "/consult attending what next?" });
    expect(msgsOf(events, "agent_message")[0]!.agent).toBe("attending");
  });
});

describe("table()", () => {
  it("aligns CJK text by display width", () => {
    const out = table([
      ["血常规", "ready"],
      ["CBC", "pending"],
    ]);
    const [a, b] = out.split("\n");
    expect(displayWidth(a!.slice(0, a!.indexOf("ready")))).toBe(displayWidth(b!.slice(0, b!.indexOf("pending"))));
  });
});
