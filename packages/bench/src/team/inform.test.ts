/**
 * An information handoff in a built-in case (audit 2026-11-12, P1-9; docs/TEAM.md §4.5): in acute-ischemic-stroke the
 * triage nurse holds his anticoagulant history (his wife's recorded answer); thrombolysis waits for it. The team
 * benchmark finds the case, runs both scenarios and records who asked, who supplied it, who received it and when,
 * and what the clinician in charge did next — the act it held up given only after it arrived; with the holder away
 * the circulating nurse escalates at once, with the reason, and the clinician asks the family directly. The case
 * played alone (no scenario) is as it was: the team takes no round.
 */
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "@clinicalcraft/core";
import type { TeamCheckpoint, TeamTask } from "@clinicalcraft/agent";
import { createSession, mergeSettings } from "@clinicalcraft/agent";
import { catalogsFor, chooseFacility, loadContent } from "@clinicalcraft/agent/node";
import { benchClock, benchIds } from "../session.js";
import { teamMarkdown } from "./report.js";
import { runTeamBench, score, teamCases } from "./run.js";

const content = await loadContent({ dirs: [] });
const T = 120_000;

describe("the stroke case's information handoff (bench team)", () => {
  it("is a built-in team case: bench team finds and reports it", { timeout: T }, async () => {
    expect(teamCases(content).map((c) => c.id)).toContain("acute-ischemic-stroke");
    const report = await runTeamBench(content, { caseIds: ["acute-ischemic-stroke"], locale: "en" });
    expect(report.runs.map((r) => [r.scenario, r.pass, r.failures])).toEqual([
      ["anticoagulants-from-triage", true, []],
      ["anticoagulants-triage-away", true, []],
    ]);
    expect(report.counts).toMatchObject({ assigned: 2, activated: 2, completed: 2, escalated: 1, invalid: 0, obligations: 2, unfinished: 0 });

    const supplied = report.runs[0]!.obligations[0]!;
    expect(supplied).toMatchObject({ kind: "inform", item: "anticoagulants", recipient: "actor:clinician", status: "met", physical: true, verified: true });
    const h = supplied.handoff!;
    // who asked the member holding it, who supplied it, who received it (read back, confirmed, recorded) — in order
    expect(h.ordered).toMatchObject({ by: "staff:ed-nurse" });
    expect(h.performed).toMatchObject({ by: "staff:triage-nurse" });
    expect(h.received).toMatchObject({ by: "actor:clinician" });
    expect(h.ordered!.round).toBeLessThan(h.performed!.round);
    expect(h.performed!.round).toBeLessThan(h.received!.round);
    // what the clinician did next; thrombolysis only after the information arrived
    expect(h.next).toMatchObject({ by: "actor:clinician" });
    expect(h.next!.at).toBeGreaterThanOrEqual(h.received!.at);
    expect(h.blocked).toMatchObject({ intervention: "tenecteplase", afterReceipt: true });

    const away = report.runs[1]!.obligations[0]!;
    expect(away).toMatchObject({ status: "escalated", physical: false, escalation: { appropriate: true } });
    expect(away.escalation!.reason).toMatch(/isn't available/);
    // in both languages (the zh report says it in Chinese); the escalated run counts its escalation
    expect(away.escalation!.reasonText?.["zh-CN"]).toMatch(/[\u4e00-\u9fff]/u);
    expect(report.runs[1]!.escalated).toBe(1);
    // the change in management: the clinician takes the history directly, then thrombolysis
    expect(away.handoff).toMatchObject({ ordered: null, performed: null, received: null, next: { action: "ask anticoagulants" }, blocked: { intervention: "tenecteplase" } });

    const md = teamMarkdown(report, "en");
    expect(md).toContain("## Information handoffs");
    expect(md).toMatch(/\| acute-ischemic-stroke \| anticoagulants-from-triage \| anticoagulants \| ed-nurse \(min [\d.]+\) \| triage-nurse \(min [\d.]+\) \| clinician \(min [\d.]+\) \|/);
    const zh = teamMarkdown(report, "zh-CN");
    expect(zh).toContain("## 信息交接");
    expect(zh).toContain(`上报 — ${away.escalation!.reasonText!["zh-CN"]}`);
    expect(zh).not.toMatch(/isn't available/);
    expect(zh).toMatch(/\| 完成 \|/);
  });

  it("an act given before the information it waited for fails the run (inappropriate progression)", () => {
    const c = content.cases.get("acute-ischemic-stroke")!.def as CaseDefinition;
    const task: TeamTask = { id: "task-1", kind: "inform", need: "anticoagulant-history", item: "anticoagulants", for: "actor:clinician", owner: "staff:ed-nurse", initiator: "staff:ed-nurse", holder: "staff:triage-nurse", thread: "th-1", status: "done", since: 5, tried: [], acts: 0, verified: true, relayed: { at: 30, round: 5 } };
    const cp: TeamCheckpoint = {
      format: "clinicalcraft-team@1",
      autonomy: "step",
      surgeon: "simulated",
      state: { version: 2, scenario: "anticoagulants-from-triage", lifecycle: "completed", round: 6, seq: 0, members: [], messages: [], receipts: [], tasks: [task], claims: {}, completed: [], posted: [], extra: [], informed: ["anticoagulant-history"] },
    };
    const r = score(c, "anticoagulants-from-triage", { informed: true }, cp, { known: () => true, after: [{ action: "intervene tenecteplase", by: "actor:clinician", at: 20, accepted: true, interventionId: "tenecteplase" }] });
    expect(r.pass).toBe(false);
    expect(r.failures.join("; ")).toMatch(/tenecteplase was given before the information arrived/);
    expect(r.failures.join("; ")).toMatch(/lacks who asked, who supplied it or who received it/);
  });

  it("played alone (no scenario), the team takes no round: the case is as it was without a team", { timeout: T }, async () => {
    const c = content.cases.get("acute-ischemic-stroke")!.def;
    const facility = chooseFacility(content, c, undefined, null)!;
    const settings = mergeSettings([{ source: "flag", settings: { provider: "offline", locale: "en", embodiment: "embodied", approvalMode: "bypass", transcripts: { enabled: false }, autoCompact: { enabled: false, thresholdTokens: 120_000 } } }]);
    const s = await createSession({ caseDef: c, facility, catalogs: catalogsFor(content, facility), settings, newId: benchIds("t"), now: benchClock(), retry: false });
    try {
      const events: string[] = [];
      const off = s.subscribe((e) => void (e.msg.type === "team_event" && events.push(e.msg.event.kind)));
      await s.run({ type: "clinical_action", action: { type: "start" } });
      await s.run({ type: "clinical_action", action: { type: "ask", itemId: "lkw" } });
      off();
      expect(events).toEqual([]);
      expect(s.snapshot().team?.state.round ?? 0).toBe(0);
    } finally {
      await s.close();
    }
  });
});
