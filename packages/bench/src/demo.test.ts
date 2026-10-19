/**
 * The reference demonstration (`bench demo`): the embodied STEMI encounter,
 * worked headless by the embodied reference clinician, passes only when the
 * authoritative state confirms every step; its narrative links each step's
 * observation → plan → navigation → interaction → clinical action → state
 * change → verification (→ assessment) with ids and versions, in both
 * languages, and its trace ends with the assessment span.
 */
import { describe, expect, it } from "vitest";
import { loadContent } from "@clinicalcraft/agent/node";
import { confirmAction, demoVerdict, runDemo } from "./demo.js";
import type { BenchEnvironment } from "./environment.js";
import { AnswerStore, createBenchSession } from "./session.js";

const content = await loadContent({ dirs: [] });
const environment: BenchEnvironment = { commit: "abcdef1234567890", dirty: true, node: process.version, platform: "test", arch: "x64", cpus: 1, cpuModel: null, memoryGiB: 1, clinicalcraft: "test" };
const date = new Date(Date.UTC(2026, 9, 19, 12, 0, 0));
const T = 120_000;

describe("bench demo — STEMI", () => {
  it.each(["en", "zh-CN"])("%s: passes; every step confirmed by the engine and world state; auditable narrative", { timeout: T }, async (locale) => {
    const r = await runDemo({ caseId: "stemi-inferior-rv", locale, content, environment, date });
    expect(r.ok).toBe(true);
    expect(r.finished).toBe(true);
    expect(r.unconfirmed).toBe(0);
    expect(r.audit.spatial.violations).toEqual([]);
    expect(r.audit.authorisation.unauthorised).toEqual([]);
    expect(r.report?.score.percent).toBe(100);

    // The ECG order and read and the latched monitor are among the confirmed steps.
    const step = (type: string, item: string) => r.steps.find((s) => s.action?.type === type && JSON.stringify(s.action).includes(`"${item}"`));
    const ecg = step("order", "ecg-12lead")!;
    expect(ecg.confirmed).toBe(true);
    expect(ecg.navigations.length + ecg.interactions.length).toBeGreaterThan(0);
    expect(ecg.interactions.map((s) => s.name)).toEqual(expect.arrayContaining(["prepare", "connect", "record"]));
    expect(ecg.events.map((e) => e.type)).toContain("order.placed");
    expect(step("read", "ecg-12lead")!.confirmed).toBe(true);
    const monitor = step("intervene", "cardiac-monitoring")!;
    expect(monitor.confirmation).toMatch(/latched.*= true/);
    expect(monitor.interactions.map((s) => s.name)).toContain("attach");
    expect(r.steps.every((s) => s.verification?.ok && s.confirmed)).toBe(true);

    // Trace: header, spans, the assessment span last.
    const lines = r.jsonl.trim().split("\n").map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(lines[0]).toMatchObject({ format: "clinicalcraft-trace@1", caseId: "stemi-inferior-rv", embodiment: "embodied" });
    expect(lines.at(-1)).toMatchObject({ id: "bench-assessment", kind: "assessment", ok: true, data: { confirmed: r.steps.length, finished: true } });
    for (const kind of ["plan", "observation", "navigation", "interaction", "clinical_action", "state_change", "verification", "assessment"]) expect(lines.some((l) => l.kind === kind), kind).toBe(true);

    // Narrative: every step carries the chain; ids and versions come from the trace.
    const md = r.markdown;
    expect(md).toContain("abcdef123456");
    expect(md).toContain("2026-10-19T12:00:00.000Z");
    expect(md).toContain(ecg.plan.id);
    for (const s of ecg.interactions) expect(md).toContain(`\`${s.refs.actionId}\``);
    for (const e of ecg.events) expect(md).toContain(`\`${e.ev}\``);
    const labels = locale === "en" ? ["Observation", "Plan", "Navigation", "Object interaction", "Clinical action", "State change", "Verification"] : ["观察", "计划", "导航", "设备交互", "临床操作", "状态变化", "核验"];
    const sections = md.split(/^### /m).slice(1);
    expect(sections).toHaveLength(r.steps.length);
    for (const section of sections) for (const label of labels) expect(section).toContain(`**${label}**`);
    expect(md).toMatch(locale === "en" ? /world v\d+/ : /世界 v\d+/);
    expect(md).toContain(locale === "en" ? "## Final assessment" : "## 最终评估");
    expect(md).toContain(`bench demo --case stemi-inferior-rv --lang ${locale}`);
  });
});

describe("confirmation reads the authoritative state", () => {
  it("nothing done → nothing confirmed; the verdict says why", { timeout: T }, async () => {
    const session = await createBenchSession({ scenario: { caseId: "stemi-inferior-rv", locale: "en", setup: {} }, content, answers: new AnswerStore() });
    try {
      expect(confirmAction(session, { type: "order", investigationId: "ecg-12lead" }, true).ok).toBe(false);
      expect(confirmAction(session, { type: "read", investigationId: "ecg-12lead" }, true).ok).toBe(false);
      expect(confirmAction(session, { type: "intervene", interventionId: "cardiac-monitoring" }, true)).toMatchObject({ ok: false, what: expect.stringMatching(/latched.*= false/) });
      expect(confirmAction(session, { type: "finish" }, true).ok).toBe(false);
      expect(confirmAction(session, null, true).ok).toBe(false);
      expect(confirmAction(session, { type: "advance-time", minutes: 5 }, false).ok).toBe(false);
    } finally {
      await session.close();
    }
    const failed = { ok: false, unconfirmed: 2, finished: false, audit: { spatial: { audited: 1, violations: [] }, authorisation: { audited: 0, unauthorised: [] }, safety: { contraindicated: [] } } };
    expect(demoVerdict(failed, "en")).toBe("FAILED — 2 step(s) not confirmed by the authoritative state; case finished: no; accepted: 0 spatial violation(s), 0 unauthorised act(s).");
    expect(demoVerdict({ ...failed, ok: true }, "zh-CN")).toMatch(/^通过/);
  });

  it("an encounter cut short does not pass", { timeout: T }, async () => {
    const r = await runDemo({ caseId: "stemi-inferior-rv", locale: "en", content, environment, date, maxTurns: 1 });
    expect(r.finished).toBe(false);
    expect(r.ok).toBe(false);
    expect(r.markdown).toContain("FAILED");
  });
});
