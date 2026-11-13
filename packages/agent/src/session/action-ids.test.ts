/**
 * Persistent action ids (P2-14): a committed clinical action is `act-<seq>` — its clinical events carry it, a tool
 * call's result names it, and the record resolves it (and an operative step's `op-<n>`) again after a save and a
 * resume; a refusal and an unchanged act get none.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCase, replay, type CaseDefinition, type ClinicalAction } from "@clinicalcraft/core";
import { LAP_CHOLE_SIT } from "../../../core/src/engine/procedure/__fixtures__/lap-chole-sit.js";
import { placesCase } from "../../../core/src/engine/__fixtures__/team-places.js";
import { makeSession, msgsOf } from "../__fixtures__/harness.js";
import { actionIdsBetween, clinicalActionFeedback } from "./action-ids.js";

const MINI = JSON.parse(readFileSync(new URL("../../../core/src/engine/__fixtures__/mini-anaphylaxis.case.json", import.meta.url), "utf8")) as Record<string, unknown>;

function theatreCase(): CaseDefinition {
  const parsed = parseCase(structuredClone(LAP_CHOLE_SIT));
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3)));
  return parsed.value;
}

describe("persistent action ids", () => {
  it("a committed action is act-<seq> on its events and its tool result; the record resolves it, also after a resume", async () => {
    const caseDef = theatreCase();
    const t = await makeSession({ caseDef, settingsPatch: { approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await t.session.run({ type: "clinical_action", action: { type: "set-phase", phase: "theatre" } });
    const events = await t.session.run({ type: "external_tool_call", callId: "c-1", tool: "operate", args: { op: "plan-ports", plan: "three-port-left" }, allowBypass: true });
    const end = msgsOf(events, "tool_call_end").at(-1)!;
    expect(end.ok).toBe(true);
    const id = `act-${t.session.state.seq}`;
    expect(end.actionIds).toEqual([id]);
    // its clinical events carry the same id
    const step = msgsOf(events, "clinical_event").find((m) => m.event.type === "procedure.step")!;
    expect(step.actionId).toBe(id);
    const stepId = (step.event as { id?: string }).id!;
    expect(stepId).toMatch(/^op-\d+$/u);
    // a refusal commits nothing and names no action
    const refused = await t.session.run({ type: "external_tool_call", callId: "c-2", tool: "operate", args: { op: "clip", port: "C", structure: "nowhere" }, allowBypass: true });
    expect(msgsOf(refused, "tool_call_end").at(-1)!.actionIds).toBeUndefined();
    for (const m of msgsOf(refused, "clinical_event")) expect(m.actionId).toBeUndefined();

    // the record resolves the action and the operative step, the same after a save and a resume
    const accepted = t.session.snapshot().actions;
    const now = clinicalActionFeedback(caseDef, accepted, id)!;
    expect(now).toMatchObject({ actionId: id, type: "operate", step: stepId, events: expect.arrayContaining(["procedure.step"]) });
    expect(clinicalActionFeedback(caseDef, accepted, stepId)?.actionId).toBe(id);
    const saved = JSON.parse(JSON.stringify(t.session.snapshot()));
    await t.session.close();
    const r = await makeSession({ caseDef, settingsPatch: { approvalMode: "bypass" }, resume: { sessionId: saved.sessionId, actions: saved.actions, messages: saved.messages, dialogue: saved.dialogue } });
    expect(r.session.state.seq).toBe(now.seq);
    expect(clinicalActionFeedback(caseDef, r.session.snapshot().actions, id)).toEqual(now);
    // unknown or malformed ids resolve to nothing
    expect(clinicalActionFeedback(caseDef, accepted, "act-999")).toBeNull();
    expect(clinicalActionFeedback(caseDef, accepted, "nav-3")).toBeNull();
    await r.session.close();
  });

  it("the ids between two sequence numbers", () => {
    expect(actionIdsBetween(3, 3)).toEqual([]);
    expect(actionIdsBetween(3, 5)).toEqual(["act-4", "act-5"]);
  });

  it("a start in a place in the team is one action: the last of its numbers; those of what it joined after are no action's", () => {
    const k = placesCase(MINI);
    const accepted: ClinicalAction[] = [
      { type: "start", seat: "scrub-nurse" },
      { type: "answer", decisionId: "dx", optionIds: ["anaphylaxis"] },
    ];
    const joined = replay(k, accepted.slice(0, 1)).state.joined!;
    expect(joined).toMatchObject({ actions: 5, seq: 6 });
    // a tool call that committed the start names one action, and the next one after it
    expect(actionIdsBetween(0, 6, joined)).toEqual(["act-6"]);
    expect(actionIdsBetween(0, 7, joined)).toEqual(["act-6", "act-7"]);
    expect(actionIdsBetween(6, 7, joined)).toEqual(["act-7"]);
    // the record resolves the start by its id; the numbers its join used resolve to nothing
    expect(clinicalActionFeedback(k, accepted, "act-6")).toMatchObject({ actionId: "act-6", seq: 6, type: "start", by: "learner" });
    for (let n = 1; n <= 5; n++) expect(clinicalActionFeedback(k, accepted, `act-${n}`), `act-${n}`).toBeNull();
    expect(clinicalActionFeedback(k, accepted, "act-7")).toMatchObject({ actionId: "act-7", type: "answer" });
  });
});
