import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseCase, type CaseDefinition, type CaseInput } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { makeSession, msgsOf } from "./__fixtures__/harness.js";
import { loadMiniCase as loadMiniCaseWith } from "./__fixtures__/mini-case.js";
import { BUILTIN_COMMANDS, commandDescription } from "./commands.js";
import type { ApprovalDecision } from "./protocol.js";
import { reviewStatusLine } from "./session/i18n.js";
import { displayWidth, table } from "./tools/format.js";
import { labelledOptions } from "./tools/option-labels.js";

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
    // Learner wording: numbered choices with the command for each (never "call again with an exact id").
    expect(ambiguous.out.text).toBe("Which one did you mean?\n  1. CT head — /order ct-head\n  2. CT chest — /order ct-chest");
    expect(ambiguous.out.text).not.toMatch(/list_options|exact id/);
    expect(t.session.state.orders).toEqual([]);
    const ok = await command(t, "/order ECG");
    expect(ok.out.text).toMatch(/Ordered ECG \(Emergency\)\. Result expected at 09:05 \(now 09:00\)/);
    expect(t.session.state.orders.map((o) => o.key)).toEqual(["ecg@ed"]);
    expect(t.session.state.started).toBe(true);
    const results = await command(t, "/results");
    expect(results.out.text).toMatch(/ECG\s+ecg\s+Emergency.*\(ed\)\s+pending \(expected 09:05\)/);
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

  it("/board and /answer: decisions by number, options by letter (or number) — never by authored id", async () => {
    const t = await makeSession();
    const board = await command(t, "/board");
    // A locked decision is listed by number with what it needs — never its prompt, options or id.
    expect(board.out.text).toMatch(/^- Decision 1 \(not yet available\)$/m);
    expect(board.out.text).not.toContain("Most likely diagnosis?");
    expect(board.out.text).not.toContain("Inferior STEMI");
    expect(board.out.text).not.toMatch(/\bdx\b/);
    expect(board.out.text).toContain("Review the ECG first.");
    const early = await command(t, "/answer 1 A");
    expect(early.out.text).toBe("Decision 1 is not yet answerable: Review the ECG first.");
    await command(t, "/order ecg");
    await command(t, "/wait 5");
    const read = await command(t, "/read ecg");
    expect(read.out.text).toContain("ST elevation in II, III and aVF");
    const unlocked = await command(t, "/board");
    expect(unlocked.out.text).toContain("- Decision 1: Most likely diagnosis? (open)");
    // The options by letter, in the presented (shuffled) order — never by their authored ids.
    const shown = [...unlocked.out.text.matchAll(/^\s+\[(\w+)\] (.+)$/gm)].map((m) => ({ label: m[1]!, text: m[2]! }));
    expect(shown.map((o) => o.label)).toEqual(["A", "B"]);
    expect(shown.map((o) => o.text).sort()).toEqual(["Inferior STEMI", "Pulmonary embolism"]);
    expect(unlocked.out.text).not.toMatch(/\[(stemi|pe)\]|\bdx\b/);
    expect(JSON.stringify(unlocked.out.data)).not.toMatch(/"(stemi|pe|dx)"/);
    const letter = shown.find((o) => o.text === "Inferior STEMI")!.label;
    const wrong = shown.find((o) => o.text !== "Inferior STEMI")!.label;
    // Refusals before anything is recorded: no such decision (named by number), two options on a single-best-answer
    // decision ("A,B" is two), separators only, an unknown letter.
    expect((await command(t, "/answer 2 A")).out.text).toBe("No decision “2”. Name a decision by its number: 1.");
    expect((await command(t, "/answer 1 A,B")).out.text).toBe("Decision 1 takes a single best answer: answer with one letter.");
    expect((await command(t, "/answer 1 、")).out.text).toMatch(/^No option given\. Answer by letter — options: A \(.+\); B \(.+\)\.$/);
    expect((await command(t, "/answer D1 C")).out.text).toMatch(/^Unknown option\(s\): C\. Answer by letter — options: A \(/);
    expect(t.session.state.attempts).toEqual([]);
    // A number counts in the same order; a lower-case letter is the same letter; the decision as "Decision 1" or by id.
    const first = await command(t, `/answer Decision 1 ${"AB".indexOf(wrong) + 1}`);
    expect(first.out.text).toMatch(/^Not correct\./);
    expect((first.out.data as { data: unknown }).data).toMatchObject({ decision: 1, options: [{ label: wrong }] });
    const answer = await command(t, `/answer dx ${letter.toLowerCase()}`);
    expect(answer.out.text).toMatch(/^Correct\./);
    expect(t.session.state.decisions).toHaveProperty("dx");
    expect(t.session.state.attempts.map((a) => a.optionIds)).toEqual([["pe"], ["stemi"]]);
    // The usage line agrees with PROTOCOL §9; a decision named in two words with no option after it gets it too.
    for (const line of ["/answer 1", "/answer Decision 1"]) expect((await command(t, line)).out.text, line).toBe("Usage: /answer <decision> <letter|number…>");
    expect((await command(t, "/help")).out.text).toContain("/answer <decision> <letter|number…>");
  });

  it("/answer reads the CLI's own \"A+C\" and a list marker's \"A.\" or \"B)\"", async () => {
    // The mini case's decision made select-all, with a second correct option.
    const caseDef = loadMiniCaseWith((x) => {
      const d = x.decisions![0]!;
      d.kind = "multiple";
      d.options.push({ id: "ischaemia", text: { "zh-CN": "心肌缺血", en: "Myocardial ischaemia" }, correct: true, feedback: { "zh-CN": "对。", en: "Yes." } });
      for (const step of x.solution ?? []) if (step.type === "answer") step.optionIds = ["stemi", "ischaemia"];
    });
    const letterOf = (id: string) => labelledOptions(caseDef, caseDef.decisions[0]!).find((o) => o.option.id === id)!.label;
    const t = await makeSession({ caseDef });
    await command(t, "/order ecg");
    await command(t, "/wait 5");
    await command(t, "/read ecg");
    expect((await command(t, `/answer 1 ${letterOf("pe")}.`)).out.text).toMatch(/^Not correct\./);
    expect((await command(t, `/answer Decision 1 ${letterOf("stemi")})`)).out.text).toMatch(/^Not correct\./);
    expect((await command(t, `/answer 1 ${letterOf("stemi")}+${letterOf("ischaemia")}`)).out.text).toMatch(/^Correct\./);
    expect(t.session.state.attempts.map((a) => a.optionIds)).toEqual([["pe"], ["stemi"], ["stemi", "ischaemia"]]);
  });

  it("/answer in Chinese: 决策 2 / 决策2 name a decision, Ａ、Ｂ are two letters", async () => {
    const t = await makeSession({ settingsPatch: { locale: "zh-CN" } });
    await command(t, "/order ecg");
    await command(t, "/wait 5");
    await command(t, "/read ecg");
    expect((await command(t, "/board")).out.text).toContain("- 决策 1：最可能的诊断？（可以作答）");
    expect((await command(t, "/answer 决策 1 Ａ、Ｂ")).out.text).toBe("决策 1 为单选题：请只用一个字母作答。");
    expect((await command(t, "/answer 决策9 A")).out.text).toBe("没有决策“决策9”。请用决策编号指明：1。");
    expect((await command(t, "/answer 决策 1")).out.text).toBe("用法：/answer <decision> <letter|number…>");
    const presented = (await command(t, "/board")).out.text;
    const letter = /^\s+\[(\w)\] 下壁STEMI$/m.exec(presented)![1]!;
    expect((await command(t, `/answer 决策1 ${String.fromCharCode(letter.charCodeAt(0) + 0xfee0)}`)).out.text).toMatch(/^正确。/);
  });

  it("/case gives the patient's age as clinicians write it (months, fractions of a year)", async () => {
    const cases: [Partial<{ age: number; ageUnit: "years" | "months" | "days" }>, string, string][] = [
      [{ age: 100, ageUnit: "months" }, "8 years 4 months", "8岁4个月"],
      [{ age: 4 + 1 / 12, ageUnit: "years" }, "4 years 1 month", "4岁1个月"],
      [{ age: 11 + 5 / 12 }, "11 years 5 months", "11岁5个月"],
      [{ age: 10, ageUnit: "months" }, "10 months", "10个月"],
      [{ age: 0.75, ageUnit: "days" }, "18 hours", "18小时"],
      [{ age: 58 }, "58 years", "58岁"],
    ];
    for (const [patient, en, zh] of cases) {
      const c = loadMiniCaseWith((x) => Object.assign(x.patient, patient));
      const enOut = (await command(await makeSession({ caseDef: c }), "/case")).out.text;
      expect(enOut, en).toContain(`Patient: Li Ming, ${en}, male.`);
      expect(enOut).not.toMatch(/\d\.\d{3}|100 mo/);
      const zhOut = (await command(await makeSession({ caseDef: c, settingsPatch: { locale: "zh-CN" } }), "/case")).out.text;
      expect(zhOut, zh).toContain(`患者：李明，${zh}，男。`);
    }
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
    expect((await command(t, "/plan")).out.text).toBe("No work-up plan yet.");
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

  it("/debrief lists the learning outcomes and the clinical review once unlocked, in both languages (docs/GLOSSARY.md §4)", async () => {
    const caseDef = loadMiniCaseWith((c) => {
      c.learningOutcomes = [{ "zh-CN": "识别下壁STEMI并避免硝酸酯", en: "Recognise an inferior STEMI and withhold nitrates" }];
      c.provenance = { ...c.provenance, review: { status: "editorial", reviewedAt: "2026-10-28", reviewers: ["ClinicalCraft editorial review (AI-assisted)"], guidelines: ["ESC 2023 ACS"] } };
    });
    for (const [locale, outcome, review, guidance] of [
      ["en", "  1. Recognise an inferior STEMI and withhold nitrates", "Clinical review: Editorial review 2026-10-28 · not yet reviewed by a licensed clinician", "Guidance checked: ESC 2023 ACS"],
      ["zh-CN", "  1. 识别下壁STEMI并避免硝酸酯", "审核状态：编辑审核 2026-10-28 · 尚未经执业医师审核", "核对的指南：ESC 2023 ACS"],
    ] as const) {
      const t = await makeSession({ caseDef, settingsPatch: { locale } });
      // Locked: the outcomes name the diagnosis.
      expect((await command(t, "/debrief")).out.text).not.toContain(outcome.trim().slice(3));
      await t.session.run({ type: "autopilot" });
      const { out } = await command(t, "/debrief");
      expect(out.text).toContain(outcome);
      expect(out.text).toContain(review);
      expect(out.text).toContain(guidance);
      expect(out.data).toMatchObject({ learningOutcomes: [outcome.trim().slice(3)], review: { status: "editorial", reviewedAt: "2026-10-28", guidelines: ["ESC 2023 ACS"] } });
    }
    // A case without the metadata keeps the debrief as it was.
    const plain = await makeSession();
    await plain.session.run({ type: "autopilot" });
    const { out } = await command(plain, "/debrief");
    expect(out.text).not.toMatch(/Learning outcomes|Clinical review/);
    expect(out.data).toMatchObject({ learningOutcomes: [], review: null });
  });

  it("reviewStatusLine words each review status as the glossary fixes it, never more than the case records", () => {
    expect(reviewStatusLine("en", { status: "editorial", reviewedAt: "2026-10-28" })).toBe("Editorial review 2026-10-28 · not yet reviewed by a licensed clinician");
    expect(reviewStatusLine("zh-CN", { status: "editorial", reviewedAt: "2026-10-28" })).toBe("编辑审核 2026-10-28 · 尚未经执业医师审核");
    expect(reviewStatusLine("en", { status: "editorial" })).toBe("Editorial review · not yet reviewed by a licensed clinician");
    expect(reviewStatusLine("zh-CN", { status: "clinician-reviewed", reviewedAt: null })).toBe("已经执业医师审核");
    expect(reviewStatusLine("en", { status: "unreviewed" })).toBe("Not yet reviewed (neither editorial nor clinician review)");
    expect(reviewStatusLine("en", { status: "approved-by-someone" })).toBe("");
    expect(reviewStatusLine("en", null)).toBe("");
  });

  it("/export returns a snapshot; /permissions shows rules; unknown commands are reported", async () => {
    const t = await makeSession();
    await command(t, "/order ecg");
    const exp = await command(t, "/export run.json");
    expect(exp.out.text).toMatch(/2 actions\) → run\.json/);
    expect((exp.out.data as { snapshot: { format: string } }).snapshot.format).toBe("clinicalcraft-session@1");
    expect((await command(t, "/permissions")).out.text).toMatch(/Allow\s+-/);
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

function loadCase(id: string): CaseDefinition | null {
  const path = fileURLToPath(new URL(`../../content/cases/${id}/case.json`, import.meta.url));
  if (!existsSync(path)) return null;
  const parsed = parseCase(JSON.parse(readFileSync(path, "utf8")) as unknown);
  return parsed.ok ? parsed.value : null;
}

describe("commands never repeat or spoil what the learner sees (offline)", () => {
  const ana = loadCase("anaphylaxis-garden");

  it.skipIf(!ana)("/wait reports the wait and the vitals, not again the lines just spoken live", async () => {
    const t = await makeSession({ caseDef: ana! });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const { events, out } = await command(t, "/wait 10");
    const spoken = msgsOf(events, "agent_message").map((m) => m.text);
    const scenario = spoken.find((line) => /syringe/.test(line));
    expect(scenario, "the scenario announcement was spoken live").toBeDefined();
    expect(out.text).toMatch(/Waited 10 min/);
    expect(out.text).not.toContain("syringe");
    expect(out.text).not.toMatch(/Meanwhile/);
    // The model-facing `wait` tool still summarises what happened (a clinician agent sees no live events).
    expect((out.data as { data?: { meanwhile?: string | null } }).data?.meanwhile).toMatch(/syringe/);
  });

  it("a custom command to an offline examiner or attending says it needs a model instead of ignoring the prompt", async () => {
    const t = await makeSession({
      commands: [
        { name: "osce-checklist", description: "Domains not yet covered", source: "project", template: "List the history domains I have not covered. $ARGUMENTS", agent: "examiner" },
        { name: "differential", description: "Challenge my differential", source: "project", template: "My differential is: $ARGUMENTS", agent: "attending" },
      ],
    });
    for (const [line, name] of [
      ["/osce-checklist", "osce-checklist"],
      ["/differential ACS, PE", "differential"],
    ] as const) {
      const { events, out } = await command(t, line);
      expect(msgsOf(events, "assessment")).toEqual([]);
      expect(msgsOf(events, "agent_message")).toEqual([]);
      expect(out.name).toBe(name);
      expect(out.text).toMatch(/needs a language model/);
      expect(out.text).not.toMatch(/Missed required history|Teaching-script assessment/);
    }
    expect(t.session.state.hints).toBe(0);
    const zh = await makeSession({ settingsPatch: { locale: "zh-CN" }, commands: [{ name: "osce-checklist", description: "x", source: "project", template: "$ARGUMENTS", agent: "examiner" }] });
    expect((await command(zh, "/osce-checklist")).out.text).toMatch(/需要语言模型/);
  });

  it("consulting the offline attending counts as a hint only when it gives the objective's hint", async () => {
    const t = await makeSession();
    const socratic = await command(t, "/consult attending what next?");
    const reply = msgsOf(socratic.events, "agent_message").find((m) => m.agent === "attending")!.text;
    expect(reply).toContain("Take a history"); // the current objective, by its title
    expect(reply).not.toContain("Ask when the pain started");
    expect(reply).toContain("/hint");
    expect(t.session.state.hints).toBe(0);
    const asked = await command(t, "/consult attending I'm stuck, can I have a hint?");
    expect(msgsOf(asked.events, "agent_message").find((m) => m.agent === "attending")!.text).toContain("Ask when the pain started");
    expect(t.session.state.hints).toBe(1);
    await command(t, "@上级 给我一点提示");
    expect(t.session.state.hints).toBe(2);
  });
});

describe("learner-facing command output (zh-CN + en)", () => {
  it("refusals state the reason without internal rejection codes; the code stays in the data (L22)", async () => {
    const en = await makeSession();
    const read = await command(en, "/read ecg");
    expect(read.out.text).toBe("Not possible: This test has not been ordered in that phase.");
    expect(read.out.data).toMatchObject({ ok: false, data: { rejected: { code: "not-ordered" } } });
    const zh = await makeSession({ settingsPatch: { locale: "zh-CN" } });
    const zhRead = await command(zh, "/read ecg");
    expect(zhRead.out.text).toBe("无法执行：该阶段尚未开具这项检查。");
    expect(zhRead.out.text).not.toMatch(/not-ordered|[A-Za-z]{3,}/);
    // A direct learner action (web buttons) warns the same way.
    const events = await zh.session.run({ type: "clinical_action", action: { type: "read", investigationId: "ecg" } });
    const warning = msgsOf(events, "warning").map((w) => w.message).join("\n");
    expect(warning).toContain("无法执行：该阶段尚未开具这项检查。");
    expect(warning).not.toContain("not-ordered");
  });

  it("/phase on an automatic phase says it follows the case clock (L14)", async () => {
    const caseDef = loadMiniCaseWith((x) => {
      x.phases = [
        { id: "ed", label: { "zh-CN": "急诊", en: "Emergency" }, learnerSwitchable: false },
        { id: "ward", label: { "zh-CN": "病房", en: "Ward" }, learnerSwitchable: false, enterWhen: { elapsed: { gte: 10 } } },
      ] as CaseInput["phases"];
    });
    const t = await makeSession({ caseDef, settingsPatch: { locale: "zh-CN" } });
    const list = await command(t, "/phase");
    expect(list.out.text).toContain("[ed] 急诊 (当前)");
    expect(list.out.text).not.toContain("未解锁");
    const set = await command(t, "/phase ward");
    expect(set.out.text).toBe("无法执行：该阶段随病例时钟推进，不能手动切换。");
  });

  it("/results shows when a pending result is due in whole clock minutes (L17)", async () => {
    const caseDef = loadMiniCaseWith((x) => {
      x.clock = { ...x.clock, actionCosts: { ask: 0.5, examine: 0.5, order: 0.5, read: 0.5, intervene: 1, answer: 0 } };
    });
    const t = await makeSession({ caseDef, settingsPatch: { locale: "zh-CN" } });
    await command(t, "/exam heart");
    const ordered = await command(t, "/order troponin");
    expect(ordered.out.text).toContain("预计09:46出结果（现在09:01）");
    const results = await command(t, "/results");
    expect(results.out.text).toMatch(/待出（预计09:46）/);
    expect(results.out.text).not.toMatch(/\d\.5/);
    expect((await command(t, "/wait 30")).out.text).toMatch(/^已等待 30 分钟（09:01 → 09:31）。/);
  });

  it("/provider refuses unknown ids with a did-you-mean and accepts catalogue and configured providers (L18)", async () => {
    const t = await makeSession({ settingsPatch: { providers: { "my-local": { wire: "openai-chat-completions", baseUrl: "http://127.0.0.1:9999/v1" } } } });
    const bad = await command(t, "/provider foo");
    expect(bad.out.text).toMatch(/^Invalid value "foo"\. Allowed: .*anthropic/);
    expect(bad.out.data).toMatchObject({ error: "invalid-value" });
    expect(t.session.settings.provider).toBe("offline");
    const typo = await command(t, "/provider anthropc");
    expect(typo.out.text).toContain("Did you mean anthropic?");
    expect(t.session.settings.provider).toBe("offline");
    expect((await command(t, "/provider my-local")).out.text).toBe("Provider: my-local");
    expect(t.session.settings.provider).toBe("my-local");
    expect((await command(t, "/provider proxy:zhipu")).out.text).toBe("Provider: proxy:zhipu");
    expect((await command(t, "/provider offline")).out.text).toBe("Provider: offline");
    const zh = await makeSession({ settingsPatch: { locale: "zh-CN" } });
    expect((await command(zh, "/provider opneai")).out.text).toMatch(/^无效的值“opneai”。可选：.*你是不是想输入 openai？$/s);
  });

  it("/permissions lists every rule on its own line under localised labels (L23)", async () => {
    const rules = { allow: ["read_result(*)"], ask: ["intervene(*thromb*)", "intervene(*lysis*)", "intervene(alteplase*)", "intervene(tenecteplase*)"], deny: [] };
    const t = await makeSession({ settingsPatch: { locale: "zh-CN", permissions: rules } });
    const { out } = await command(t, "/permissions");
    for (const rule of [...rules.allow, ...rules.ask]) expect(out.text).toContain(rule);
    expect(out.text).not.toContain("…");
    for (const label of ["允许", "询问", "拒绝"]) expect(out.text).toContain(label);
    expect(out.text).not.toMatch(/^(allow|ask|deny)\b/m);
    expect(out.text.split("\n").filter((line) => /intervene\(/.test(line))).toHaveLength(4);
    const en = await makeSession({ settingsPatch: { permissions: rules } });
    expect((await command(en, "/permissions")).out.text).toMatch(/^Ask\s+intervene\(\*thromb\*\)$/m);
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

describe("locked decisions stay hidden on every /answer path (F0/F1)", () => {
  const secrets = ["Inferior STEMI", "Pulmonary embolism", "Most likely diagnosis", "下壁STEMI", "肺栓塞", "最可能的诊断"];

  it("default mode: /answer <locked> <unknown option> says what is needed, never the options", async () => {
    for (const locale of ["en", "zh-CN"]) {
      const t = await makeSession({ settingsPatch: { locale } });
      const { events, out } = await command(t, "/answer dx zzz");
      expect(msgsOf(events, "approval_request")).toHaveLength(0);
      for (const s of secrets) expect(out.text).not.toContain(s);
      expect(out.text).toContain(locale === "en" ? "Review the ECG first." : "先查看心电图。");
    }
  });

  it("strict mode / ask rules: no approval request (with the prompt or option texts) for a locked decision", async () => {
    for (const settingsPatch of [{ approvalMode: "strict" }, { permissions: { ask: ["answer_decision"] } }]) {
      const t = await makeSession({ settingsPatch });
      const summaries: string[] = [];
      t.session.subscribe((e) => {
        if (e.msg.type === "approval_request") {
          summaries.push(e.msg.summary);
          t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "denied" });
        }
      });
      for (const letter of ["a", "b"]) {
        const { out } = await command(t, `/answer dx ${letter}`);
        for (const s of secrets) expect(out.text).not.toContain(s);
      }
      // A direct clinical_action is refused before the gate too.
      const events = await t.session.run({ type: "clinical_action", action: { type: "answer", decisionId: "dx", optionIds: ["pe"] } as never });
      expect(msgsOf(events, "approval_request")).toHaveLength(0);
      expect(summaries).toEqual([]);
      expect(t.session.state.attempts ?? []).toEqual([]);
    }
  });

  it("an unlocked decision still asks in strict mode, with its prompt", async () => {
    const t = await makeSession({ settingsPatch: { approvalMode: "bypass" } });
    await command(t, "/order ecg");
    await command(t, "/wait 10");
    await command(t, "/read ecg");
    await command(t, "/approval strict");
    const summaries: string[] = [];
    t.session.subscribe((e) => {
      if (e.msg.type === "approval_request") {
        summaries.push(e.msg.summary);
        t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "denied" });
      }
    });
    await command(t, "/answer dx a");
    expect(summaries.join("\n")).toContain("Most likely diagnosis?");
  });
});

describe("/status and /case never name the case id (J2)", () => {
  const stemi = loadCase("stemi-inferior-rv");
  it.skipIf(!stemi)("shows the title only", async () => {
    for (const locale of ["en", "zh-CN"]) {
      const t = await makeSession({ caseDef: stemi!, settingsPatch: { locale } });
      const status = await command(t, "/status");
      expect(status.out.text).not.toContain("stemi");
      expect(JSON.stringify(status.out.data)).not.toContain("stemi");
      const card = await command(t, "/case");
      expect(JSON.stringify(card.out.data)).not.toContain("stemi-inferior-rv");
    }
  });
});

describe("/finish (J4)", () => {
  it("finishes a completed case (case.finished, state.finished) and refuses an open one", async () => {
    const t = await makeSession({ settingsPatch: { approvalMode: "bypass" } });
    const early = await command(t, "/finish");
    expect(early.out.text).toMatch(/Cannot finish yet/);
    expect(t.session.state.finished).toBe(false);
    for (const action of t.session.caseDef.solution) {
      if (action.type === "finish") continue;
      await t.session.run({ type: "clinical_action", action });
    }
    const { events, out } = await command(t, "/finish");
    expect(t.session.state.finished).toBe(true);
    expect(msgsOf(events, "clinical_event").some((e) => e.event.type === "case.finished")).toBe(true);
    expect(out.text).not.toMatch(/Cannot finish/);
    expect(BUILTIN_COMMANDS.map((c) => c.name)).toContain("finish");
    expect(commandDescription(BUILTIN_COMMANDS.find((c) => c.name === "finish")!, "zh-CN")).toMatch(/结束病例/);
  });
});

describe("/exam follows the current phase (J0)", () => {
  const ana = loadCase("anaphylaxis-garden");
  const asthma = loadCase("pediatric-asthma");
  const t2dm = loadCase("new-onset-t2dm");

  it.skipIf(!ana)("anaphylaxis: at the scene, 'listen to her chest' examines the scene item (no ED twins offered)", async () => {
    const t = await makeSession({ caseDef: ana! });
    const { out } = await command(t, "/exam listen to her chest");
    expect(t.session.state.examined).toEqual(["ex-chest-scene"]);
    expect(out.text).not.toMatch(/Ambiguous|Which one/);
  });

  it.skipIf(!t2dm)("T2DM: 'check his blood pressure' at the first visit is the first-visit BP", async () => {
    const t = await makeSession({ caseDef: t2dm! });
    await command(t, "/exam check his blood pressure");
    expect(t.session.state.examined).toEqual(["ex-bp"]);
  });

  it.skipIf(!asthma)("asthma: in the reassess phase, 再听听肺 is the reassessment auscultation", async () => {
    const t = await makeSession({ caseDef: asthma!, settingsPatch: { locale: "zh-CN" } });
    const tool = (await import("./tools/clinical.js")).resolveFinding;
    expect(tool(asthma!, { query: "再听听肺" }, "zh-CN", "reassess")).toEqual({ kind: "id", id: "ex-reassess-auscultation" });
    // Unfiltered it would tie with every phase's auscultation (and hint at the critical phase).
    expect(tool(asthma!, { query: "再听听肺" }, "zh-CN").kind).toBe("ambiguous");
    void t;
  });
});

describe("learner wording and tie-breaks for free-text actions (J5)", () => {
  const stemi = loadCase("stemi-inferior-rv");
  const asthma = loadCase("pediatric-asthma");

  const appy = loadCase("acute-appendicitis");
  it.skipIf(!appy)("a single weak candidate is offered as 'did you mean', with the command to type", async () => {
    const t = await makeSession({ caseDef: appy! });
    const { out } = await command(t, "/exam feel his tummy gently");
    expect(out.text).toMatch(/^Did you mean “.+”\? Type \/exam ex-abd-palp to do it\.$/);
    expect(t.session.state.examined).toEqual([]);
  });

  it.skipIf(!stemi || !asthma)("an exact, longer alias wins a tie (activate the cath lab; defib pads; 异丙托溴铵)", async () => {
    const { resolveIntervention } = await import("./tools/clinical.js");
    expect(resolveIntervention(stemi!, { query: "activate the cath lab" }, "en")).toEqual({ kind: "id", id: "activate-cath-lab" });
    expect(resolveIntervention(stemi!, { query: "put defib pads on" }, "en")).toEqual({ kind: "id", id: "defib-pads" });
    expect(resolveIntervention(asthma!, { query: "加异丙托溴铵一起雾化" }, "zh-CN")).toEqual({ kind: "id", id: "ipratropium-neb" });
  });

  it("several candidates are numbered with their commands; none says to try other words (zh + en)", async () => {
    const zh = await makeSession({ settingsPatch: { locale: "zh-CN" } });
    const amb = await command(zh, "/order ct");
    expect(amb.out.text).toBe("您指的是哪一项？\n  1. 头颅CT —— /order ct-head\n  2. 胸部CT —— /order ct-chest");
    const none = await command(zh, "/give 量子疗法");
    expect(none.out.text).toBe("本病例中没有与“量子疗法”匹配的项目。请换个说法，或输入确切的编号。");
  });

  it("a negated instruction does nothing and says so (zh + en)", async () => {
    const en = await makeSession();
    const refused = await command(en, "/give don't give the aspirin");
    expect(refused.out.text).toBe("Nothing done: “don't give the aspirin” says not to do something (not given: Aspirin 300 mg chewed). To act, say what to do.");
    const double = await command(en, "/give never withhold aspirin");
    expect(double.out.text).toBe("Nothing done: “never withhold aspirin” has a double negative. Say plainly what to do.");
    expect(en.session.state.interventions).toEqual([]);
    const zh = await makeSession({ settingsPatch: { locale: "zh-CN" } });
    const zhRefused = await command(zh, "/give 不要给阿司匹林");
    expect(zhRefused.out.text).toBe("未执行：“不要给阿司匹林”表示不做某事（未给予：阿司匹林 300 mg 嚼服）。如需执行，请直接说明要做什么。");
    expect(zh.session.state.interventions).toEqual([]);
  });
});

describe("guessed ids and stated routes (grounding benchmark, dev split)", () => {
  const sepsis = loadCase("septic-shock-cap");
  const ana = loadCase("anaphylaxis-garden");

  it.skipIf(!sepsis)("an id the case lacks is read leniently: spelling, contained words, then as a query", async () => {
    const { resolveFinding, resolveIntervention, resolveInvestigation } = await import("./tools/clinical.js");
    expect(resolveInvestigation(sepsis!, { investigation_id: "blood_cultures" }, "en")).toEqual({ kind: "id", id: "blood-cultures" });
    expect(resolveIntervention(sepsis!, { intervention_id: "ceftriaxone" }, "en")).toEqual({ kind: "id", id: "abx-ceftriaxone" });
    expect(resolveFinding(sepsis!, { finding_id: "resp-ausc" }, "en")).toEqual({ kind: "id", id: "ex-resp-ausc" });
    expect(resolveFinding(sepsis!, { finding_id: "lung_auscultation" }, "en")).toEqual({ kind: "id", id: "ex-resp-ausc" });
    const fluids = resolveIntervention(sepsis!, { intervention_id: "fluids" }, "en");
    expect(fluids.kind).toBe("ambiguous");
    expect(fluids.kind === "ambiguous" && fluids.ids).toContain("fluid-bolus");
    expect(resolveIntervention(sepsis!, { intervention_id: "quantum-therapy" }, "en")).toEqual({ kind: "unknown-id", id: "quantum-therapy" });
  });

  it.skipIf(!ana)("a stated route never resolves to an item given by another route", async () => {
    const { resolveIntervention } = await import("./tools/clinical.js");
    expect(resolveIntervention(ana!, { query: "IV adrenaline" }, "en")).toEqual({ kind: "id", id: "adrenaline-iv-bolus" });
    expect(resolveIntervention(ana!, { query: "adrenaline 0.5 mg IM" }, "en")).toEqual({ kind: "id", id: "adrenaline-im" });
    expect(resolveIntervention(ana!, { query: "hydrocortisone" }, "en")).toEqual({ kind: "id", id: "hydrocortisone-iv" });
    const oral = resolveIntervention(ana!, { query: "oral prednisolone 40 mg" }, "en");
    expect(oral.kind).toBe("ambiguous");
    expect(oral.kind === "ambiguous" && oral.ids).toContain("hydrocortisone-iv");
  });
});

describe("the shipped project settings (J14)", () => {
  it("ask rules cover thrombolytics, not the consent talk or post-lysis monitoring", async () => {
    const { matchRule } = await import("./permissions.js");
    const file = fileURLToPath(new URL("../../../.clinicalcraft/settings.json", import.meta.url));
    const ask = (JSON.parse(readFileSync(file, "utf8")) as { permissions: { ask: string[] } }).permissions.ask;
    const asks = (id: string) => ask.some((rule) => matchRule(rule, "intervene", id));
    for (const id of ["alteplase", "tenecteplase", "thrombolysis-full-dose"]) expect(asks(id), id).toBe(true);
    for (const id of ["consent-lysis", "post-lysis-monitoring", "labetalol"]) expect(asks(id), id).toBe(false);
  });
});
