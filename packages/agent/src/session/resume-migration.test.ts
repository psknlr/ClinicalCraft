/**
 * An old save restored under newer rules (the engineering recommendations, P1-10): never silently edited. The
 * snapshot says what the record was made with (case content and engine) and what it was saved with; a restore replays
 * the original record, reports each action the current engine refuses (its index and the reason) with a notice naming
 * both versions, keeps the original unedited beside the migrated record — through further saves — and a fresh
 * session reports nothing.
 */
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, type ClinicalAction } from "@clinicalcraft/core";
import { makeSession, type TestSession } from "../__fixtures__/harness.js";

/** The warnings of the start-up (replayed by `events()` up to the first state snapshot). */
async function startupWarnings(t: TestSession): Promise<string[]> {
  const out: string[] = [];
  for await (const e of t.session.events()) {
    if (e.msg.type === "warning") out.push(e.msg.message);
    if (e.msg.type === "state_snapshot") break;
  }
  return out;
}

describe("restoring an old save", () => {
  it("a fresh session's snapshot carries its provenance and no migration; its restore reports nothing", async () => {
    const t = await makeSession();
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const snap = t.session.snapshot();
    expect(snap.format).toBe("clinicalcraft-session@2");
    expect(snap.createdWith).toMatchObject({ caseId: t.session.caseDef.id, caseVersion: t.session.caseDef.version, engineVersion: ENGINE_VERSION, contentRevision: expect.stringMatching(/^[0-9a-f]{8}$/) });
    expect(snap.originalActions).toBeUndefined();
    expect(t.session.replayReport()).toBeNull();
    await t.session.close();
    const r = await makeSession({ resume: { sessionId: snap.sessionId, actions: snap.actions, createdWith: snap.createdWith } });
    expect(r.session.replayReport()).toMatchObject({ issues: [] });
    expect((await startupWarnings(r)).filter((w) => /historical action/.test(w))).toEqual([]);
    await r.session.close();
  });

  it("an action the current rules refuse is reported with its index and reason, never dropped from the original record", async () => {
    const t = await makeSession();
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const good = t.session.snapshot().actions;
    // the old record: an answer to a decision this content no longer has, between two valid actions
    const old: ClinicalAction[] = [...good, { type: "answer", decisionId: "a-decision-removed-since", optionIds: ["x"] }, { type: "note", text: "after the old answer" }];
    await t.session.close();
    const createdWith = { caseId: t.session.caseDef.id, caseVersion: "2.3.0", contentRevision: "00000000", engineVersion: "4.0.0", clinicalcraftVersion: "4.9.0" };
    const r = await makeSession({ resume: { sessionId: "old", actions: old, createdWith } });
    const warning = (await startupWarnings(r)).find((w) => /historical action/.test(w))!;
    expect(warning).toMatch(/created with .+ v2\.3\.0 \(engine 4\.0\.0\); the current content is v.+ \(engine .+\)\. 1 historical action\(s\) cannot be replayed exactly/);
    const report = r.session.replayReport()!;
    expect(report.issues).toEqual([{ originalIndex: good.length, type: "answer", status: "rejected-under-current-engine", reason: expect.stringMatching(/unknown decision/) }]);
    expect(report).toMatchObject({ originalActions: old.length, migratedActions: old.length - 1 });
    expect(r.session.state.notes.map((n) => n.text)).toContain("after the old answer");
    // saved again (after a new action): the original record unedited, then what came since; the migrated record apart
    await r.session.run({ type: "clinical_action", action: { type: "note", text: "after the restore" } });
    const snap = r.session.snapshot();
    expect(snap.createdWith).toEqual(createdWith);
    expect(snap.originalActions!.slice(0, old.length)).toEqual(old);
    expect(snap.originalActions!.at(-1)).toMatchObject({ type: "note", text: "after the restore" });
    expect(snap.actions.some((a) => a.type === "answer" && a.decisionId === "a-decision-removed-since")).toBe(false);
    expect(snap.replayIssues).toEqual(report.issues);
    await r.session.close();
    // and restored once more: the same report, the same original
    const again = await makeSession({ resume: { sessionId: "old", actions: snap.actions, originalActions: snap.originalActions, createdWith: snap.createdWith } });
    expect(again.session.replayReport()!.issues).toEqual(report.issues);
    expect(again.session.snapshot().originalActions).toEqual(snap.originalActions);
    await again.session.close();
  });
});
